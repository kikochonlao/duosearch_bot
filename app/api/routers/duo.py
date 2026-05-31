from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func
import json
import logging

from app.api.deps.auth import get_telegram_user, resolve_telegram_id
from app.api.deps.db import get_session
from app.api.schemas.duo import DuoStatusOut, XpEventOut, AchievementDef, MemoryOut, AddXpBody
from db.models.user import User
from db.models.match import Match
from db.models.chat_session import ChatSession
from db.models.message import Message
from db.models.duo_relationship import DuoRelationship, XPEvent, UnlockedAchievement

router = APIRouter()
logger = logging.getLogger("duosearch")

LEVEL_THRESHOLDS = [
    (1, "New Connection", 0),
    (2, "Friends", 200),
    (3, "Close Friends", 500),
    (4, "Partners", 1000),
    (5, "Ride or Die", 1800),
    (6, "Cosmic Duo", 2800),
    (7, "Soulmates", 4000),
]

ACHIEVEMENTS = {
    "first_match": {"title": "First Match", "description": "You matched for the first time together", "category": "milestones", "rarity": "common", "xp_reward": 50},
    "first_message": {"title": "First Words", "description": "Sent your first message", "category": "communication", "rarity": "common", "xp_reward": 50},
    "ten_messages": {"title": "Chatterbox", "description": "Exchange 10 messages", "category": "communication", "rarity": "common", "xp_reward": 100},
    "fifty_messages": {"title": "Conversation", "description": "Exchange 50 messages", "category": "communication", "rarity": "rare", "xp_reward": 200},
    "hundred_messages": {"title": "Non-Stop Talk", "description": "Exchange 100 messages", "category": "communication", "rarity": "rare", "xp_reward": 300},
    "first_game": {"title": "Game On", "description": "Play your first game together", "category": "gaming", "rarity": "common", "xp_reward": 100},
    "ten_games": {"title": "Duo Queue", "description": "Play 10 games together", "category": "gaming", "rarity": "rare", "xp_reward": 200},
    "win_streak_3": {"title": "Hot Streak", "description": "Win 3 sessions in a row", "category": "competitive", "rarity": "rare", "xp_reward": 150},
    "week_streak": {"title": "Weekly Warriors", "description": "Interact for 7 days in a row", "category": "loyalty", "rarity": "epic", "xp_reward": 300},
    "month_anniversary": {"title": "One Month", "description": "One month since you matched", "category": "milestones", "rarity": "epic", "xp_reward": 500},
    "soulmates": {"title": "Soulmates", "description": "Reach level 7 together", "category": "milestones", "rarity": "legendary", "xp_reward": 1000},
}

XP_REWARDS = {
    "first_match": 50,
    "message": 5,
    "game_together": 50,
    "daily_interaction": 10,
    "streak_day": 20,
}


def _calc_level(xp: int) -> tuple[int, str, int]:
    level = 1
    name = LEVEL_THRESHOLDS[0][1]
    for lvl, lname, threshold in LEVEL_THRESHOLDS:
        if xp >= threshold:
            level = lvl
            name = lname
    return level, name, level


async def _get_or_create_relationship(session: AsyncSession, match_id: int, user1_id: int, user2_id: int) -> DuoRelationship:
    result = await session.execute(select(DuoRelationship).where(DuoRelationship.match_id == match_id))
    rel = result.scalar_one_or_none()
    if not rel:
        rel = DuoRelationship(match_id=match_id, user1_id=user1_id, user2_id=user2_id, level=1, xp=0)
        session.add(rel)
        await session.flush()
    return rel


async def _add_xp(session: AsyncSession, rel: DuoRelationship, amount: int, activity_type: str, payload: str | None = None):
    rel.xp += amount
    new_level, _, _ = _calc_level(rel.xp)
    leveled_up = new_level > rel.level
    rel.level = new_level
    ev = XPEvent(relationship_id=rel.id, activity_type=activity_type, xp_awarded=amount, payload=payload)
    session.add(ev)
    await session.flush()
    return leveled_up


async def _check_achievements(session: AsyncSession, rel: DuoRelationship):
    unlocked_result = await session.execute(select(UnlockedAchievement.achievement_key).where(UnlockedAchievement.relationship_id == rel.id))
    existing = {r[0] for r in unlocked_result.fetchall()}
    newly_unlocked = []

    for key, ach in ACHIEVEMENTS.items():
        if key in existing:
            continue
        unlocked = False
        if key == "first_match":
            unlocked = True
        elif key == "first_message":
            count = await session.scalar(select(func.count(Message.id)).where(
                Message.match_id == rel.match_id
            ))
            unlocked = count is not None and count >= 1
        elif key == "ten_messages":
            count = await session.scalar(select(func.count(Message.id)).where(Message.match_id == rel.match_id))
            unlocked = count is not None and count >= 10
        elif key == "fifty_messages":
            count = await session.scalar(select(func.count(Message.id)).where(Message.match_id == rel.match_id))
            unlocked = count is not None and count >= 50
        elif key == "hundred_messages":
            count = await session.scalar(select(func.count(Message.id)).where(Message.match_id == rel.match_id))
            unlocked = count is not None and count >= 100
        elif key == "soulmates":
            unlocked = rel.level >= 7

        if unlocked:
            ua = UnlockedAchievement(relationship_id=rel.id, achievement_key=key)
            session.add(ua)
            await _add_xp(session, rel, ach["xp_reward"], f"achievement:{key}", json.dumps({"achievement": key}))
            newly_unlocked.append(key)

    await session.flush()
    return newly_unlocked


@router.get("/status/{match_id}", response_model=DuoStatusOut)
async def get_duo_status(
    match_id: int,
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    me = await session.execute(select(User).where(User.telegram_id == telegram_id))
    me_user = me.scalar_one_or_none()
    if not me_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    match = await session.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    if match.user1_id != me_user.id and match.user2_id != me_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your match")

    other_id = match.user2_id if match.user1_id == me_user.id else match.user1_id
    other = await session.get(User, other_id)
    if not other:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Partner not found")

    rel = await _get_or_create_relationship(session, match_id, match.user1_id, match.user2_id)
    level, level_name, _ = _calc_level(rel.xp)

    next_threshold = None
    for lvl, lname, threshold in LEVEL_THRESHOLDS:
        if lvl > level:
            next_threshold = threshold
            break
    if next_threshold is None:
        next_threshold = rel.xp

    progress = (rel.xp - LEVEL_THRESHOLDS[level - 1][2]) / (next_threshold - LEVEL_THRESHOLDS[level - 1][2]) if level > 0 else 0

    return DuoStatusOut(
        match_id=match_id,
        partner_name=other.name or "Partner",
        partner_photo=other.photo_url,
        level=level,
        level_name=level_name,
        xp=rel.xp,
        xp_next=next_threshold,
        progress=min(progress, 1.0),
        duo_name=rel.duo_name,
        created_at=match.created_at.isoformat() if match.created_at else "",
    )


@router.post("/xp")
async def add_xp(
    body: AddXpBody,
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    me = await session.execute(select(User).where(User.telegram_id == telegram_id))
    me_user = me.scalar_one_or_none()
    if not me_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    match = await session.get(Match, body.match_id)
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    if match.user1_id != me_user.id and match.user2_id != me_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your match")

    rel = await _get_or_create_relationship(session, body.match_id, match.user1_id, match.user2_id)
    amount = XP_REWARDS.get(body.activity_type, 10)
    leveled_up = await _add_xp(session, rel, amount, body.activity_type, body.payload)

    newly_unlocked = await _check_achievements(session, rel)
    await session.commit()
    await session.refresh(rel)

    level, level_name, _ = _calc_level(rel.xp)

    return {
        "ok": True,
        "xp_awarded": amount,
        "total_xp": rel.xp,
        "level": level,
        "level_name": level_name,
        "leveled_up": leveled_up,
        "new_achievements": newly_unlocked,
    }


@router.get("/achievements/{match_id}", response_model=list[AchievementDef])
async def get_achievements(
    match_id: int,
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    me = await session.execute(select(User).where(User.telegram_id == telegram_id))
    me_user = me.scalar_one_or_none()
    if not me_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    match = await session.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    if match.user1_id != me_user.id and match.user2_id != me_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your match")

    rel = await _get_or_create_relationship(session, match_id, match.user1_id, match.user2_id)
    unlocked_result = await session.execute(select(UnlockedAchievement).where(UnlockedAchievement.relationship_id == rel.id))
    unlocked_map = {ua.achievement_key: ua.unlocked_at.isoformat() if ua.unlocked_at else "" for ua in unlocked_result.scalars().all()}

    result = []
    for key, ach in ACHIEVEMENTS.items():
        result.append(AchievementDef(
            key=key,
            title=ach["title"],
            description=ach["description"],
            category=ach["category"],
            rarity=ach["rarity"],
            xp_reward=ach["xp_reward"],
            unlocked=key in unlocked_map,
            unlocked_at=unlocked_map.get(key),
        ))

    return result


@router.get("/memories/{match_id}", response_model=list[MemoryOut])
async def get_memories(
    match_id: int,
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    me = await session.execute(select(User).where(User.telegram_id == telegram_id))
    me_user = me.scalar_one_or_none()
    if not me_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    match = await session.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    if match.user1_id != me_user.id and match.user2_id != me_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your match")

    rel = await _get_or_create_relationship(session, match_id, match.user1_id, match.user2_id)

    events_result = await session.execute(
        select(XPEvent).where(XPEvent.relationship_id == rel.id).order_by(desc(XPEvent.created_at))
    )
    events = events_result.scalars().all()

    memories = []
    for ev in events:
        title = ev.activity_type.replace("_", " ").title()
        rarity = "common"
        icon = "⭐"
        if ev.xp_awarded >= 200:
            rarity = "epic"
            icon = "🌟"
        if ev.xp_awarded >= 500:
            rarity = "legendary"
            icon = "💫"
        memories.append(MemoryOut(
            id=ev.id,
            memory_type=ev.activity_type,
            title=title,
            description=ev.payload,
            icon=icon,
            xp_earned=ev.xp_awarded,
            rarity=rarity,
            created_at=ev.created_at.isoformat() if ev.created_at else "",
        ))

    return memories

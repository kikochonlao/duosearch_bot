from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.api.deps.auth import get_telegram_user, resolve_telegram_id
from app.api.deps.db import get_session
from app.api.schemas.matches import MatchOut
from app.api.schemas.profile import ProfileOut, GameProfileSchema
from db.models.user import User
from db.models.match import Match
from db.models.chat_session import ChatSession

router = APIRouter()


def _user_to_profile_out(user: User) -> ProfileOut:
    games_data = user.get_games()
    games_out = {}
    for gk, gp in games_data.items():
        games_out[gk] = GameProfileSchema(rank=gp.get("rank"), roles=gp.get("roles", {}))
    return ProfileOut(
        id=user.id,
        telegram_id=user.telegram_id,
        username=user.username,
        name=user.name,
        age=user.age,
        gender=user.gender,
        language=user.language,
        region=user.region,
        looking_for=user.looking_for,
        games=games_out,
        is_banned=user.is_banned,
    )


@router.get("/", response_model=list[MatchOut])
async def get_matches(
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

    matches_result = await session.execute(
        select(Match).where(
            or_(Match.user1_id == me_user.id, Match.user2_id == me_user.id)
        ).order_by(Match.created_at.desc())
    )
    matches = matches_result.scalars().all()

    result = []
    for m in matches:
        other_id = m.user2_id if m.user1_id == me_user.id else m.user1_id
        other = await session.get(User, other_id)
        if not other:
            continue

        chat_result = await session.execute(
            select(ChatSession).where(
                ChatSession.match_id == m.id,
                ChatSession.is_active.is_(True),
            )
        )
        has_chat = chat_result.scalar_one_or_none() is not None

        result.append(MatchOut(
            id=m.id,
            matched_user=_user_to_profile_out(other),
            created_at=m.created_at,
            has_active_chat=has_chat,
        ))

    return result

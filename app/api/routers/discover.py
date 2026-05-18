from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_telegram_user, resolve_telegram_id
from app.api.deps.db import get_session
from app.api.schemas.discover import DiscoverResponse, DiscoverCandidate, LikeRequest, LikeResponse, SkipRequest
from app.api.schemas.profile import ProfileOut, GameProfileSchema
from app.api.routers.profile import _profile_to_out
from db.repositories.like_repo import LikeRepository
from services.feed_service import FeedService

router = APIRouter()


@router.get("/feed", response_model=DiscoverResponse)
async def get_feed(
    game: str = '',
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    feed_service = FeedService(session)
    candidates = await feed_service.get_feed(telegram_id, game)

    items = []
    for u in candidates:
        games_data = {}
        for gk, gp in u.games.items():
            games_data[gk] = GameProfileSchema(rank=gp.rank, roles=gp.roles)
        profile = ProfileOut(
            id=u.id,
            telegram_id=u.telegram_id,
            username=u.username,
            name=u.name,
            age=u.age,
            gender=u.gender,
            language=u.language,
            region=u.region,
            bio=u.bio,
            photo_url=u.photo_url,
            looking_for=u.looking_for,
            games=games_data,
            is_banned=u.is_banned,
        )
        items.append(DiscoverCandidate(user=profile, score=0.0))

    return DiscoverResponse(candidates=items, total=len(items))


@router.post("/like", response_model=LikeResponse)
async def like_user(
    body: LikeRequest,
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    repo = LikeRepository(session)
    try:
        is_match, match_id, to_user = await repo.like(telegram_id, body.to_telegram_id, body.game or "")
        await session.commit()
    except Exception:
        await session.rollback()
        raise

    matched_profile = None
    if to_user:
        matched_profile = _profile_to_out(to_user)

    return LikeResponse(is_match=is_match, match_id=match_id, matched_user=matched_profile)


@router.post("/skip")
async def skip_user(
    body: SkipRequest,
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    repo = LikeRepository(session)
    await repo.skip(telegram_id, body.to_telegram_id)
    await session.commit()
    return {"ok": True}

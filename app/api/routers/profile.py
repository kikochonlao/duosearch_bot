from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps.auth import get_telegram_user, resolve_telegram_id
from app.api.deps.db import get_session
from app.api.schemas.profile import ProfileOut, ProfileUpdate, GameProfileSchema, BlockReportBody, SteamConnectBody
from db.models.user import User
from db.mappers import db_to_domain
from services.user_service import upsert_user
from db.repositories.report_repo import ReportRepository
from services.steam_service import verify_steam_id, get_steam_games

router = APIRouter()


def _profile_to_out(user) -> ProfileOut:
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
        bio=user.bio,
        photo_url=user.photo_url,
        looking_for=user.looking_for,
        games=games_out,
        is_banned=user.is_banned,
        steam_id=user.steam_id,
        blog=user.blog,
    )


@router.get("/", response_model=ProfileOut)
async def get_profile(
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await resolve_telegram_id(auth)

    result = await session.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found. Please register first.")

    return _profile_to_out(user)


@router.get("/by-telegram/{target_telegram_id}", response_model=ProfileOut)
async def get_user_profile(
    target_telegram_id: int,
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    await resolve_telegram_id(auth)

    result = await session.execute(select(User).where(User.telegram_id == target_telegram_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return _profile_to_out(user)


@router.post("/", response_model=ProfileOut)
async def create_or_update_profile(
    profile: ProfileUpdate,
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    import logging
    logger = logging.getLogger("duosearch")
    try:
        telegram_id = await resolve_telegram_id(auth)
        username = None
        user_raw = auth.get("user")
        if isinstance(user_raw, str):
            import json
            try:
                user_raw = json.loads(user_raw)
            except (json.JSONDecodeError, TypeError):
                pass
        if isinstance(user_raw, dict):
            username = user_raw.get("username") or user_raw.get("first_name")

        if not telegram_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

        # Validate required fields
        if not profile.name or not profile.age or not profile.gender:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="name, age, gender are required")

        games_dict = {}
        if profile.games:
            for gk, gp in profile.games.items():
                games_dict[gk] = {"rank": gp.rank, "roles": gp.roles}

        domain_user = await upsert_user(
            session=session,
            telegram_id=telegram_id,
            name=profile.name,
            age=profile.age,
            gender=profile.gender,
            language=profile.language or "ru",
            region=profile.region or "cis",
            username=username,
            bio=profile.bio,
            photo_url=profile.photo_url,
            looking_for=profile.looking_for or "any",
            games=games_dict,
        )

        await session.commit()

        result = await session.execute(select(User).where(User.telegram_id == telegram_id))
        user = result.scalar_one()

        return _profile_to_out(user)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Profile creation failed", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.patch("/", response_model=ProfileOut)
async def update_profile(
    update: ProfileUpdate,
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    result = await session.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    update_data = update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "games" and value is not None:
            games_dict = {}
            for gk, gp in value.items():
                games_dict[gk] = {"rank": gp.get("rank"), "roles": gp.get("roles", {})}
            user.set_games(games_dict)
        else:
            setattr(user, field, value)

    await session.commit()
    await session.refresh(user)

    return _profile_to_out(user)


@router.post("/block")
async def block_user(
    body: BlockReportBody,
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    if telegram_id == body.target_telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot block yourself")

    repo = ReportRepository(session)
    ok = await repo.block_user(telegram_id, body.target_telegram_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already blocked or user not found")
    return {"ok": True}


@router.post("/unblock")
async def unblock_user(
    body: BlockReportBody,
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    repo = ReportRepository(session)
    ok = await repo.unblock_user(telegram_id, body.target_telegram_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Block not found or user not found")
    return {"ok": True}


@router.get("/blocked", response_model=list[ProfileOut])
async def get_blocked_users(
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    repo = ReportRepository(session)
    users = await repo.get_blocked_users(telegram_id)
    return [_profile_to_out(u) for u in users]


@router.post("/report")
async def report_user(
    body: BlockReportBody,
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    if telegram_id == body.target_telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot report yourself")

    reason = body.reason or "No reason provided"
    repo = ReportRepository(session)
    auto_banned, total = await repo.add_report(telegram_id, body.target_telegram_id, reason)
    return {"ok": True, "auto_banned": auto_banned, "total_reports": total}


@router.post("/steam/connect")
async def connect_steam(
    body: SteamConnectBody,
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    steam_id = body.steam_id
    valid = await verify_steam_id(steam_id)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Steam ID or Steam API not configured")

    result = await session.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.steam_id = steam_id
    await session.commit()
    return {"ok": True, "steam_id": steam_id}


@router.post("/steam/disconnect")
async def disconnect_steam(
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    result = await session.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.steam_id = None
    await session.commit()
    return {"ok": True}


@router.get("/steam/games")
async def steam_games(
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = await resolve_telegram_id(auth)
    if not telegram_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No telegram_id")

    result = await session.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()
    if not user or not user.steam_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Steam not connected")

    games = await get_steam_games(user.steam_id)
    return {"games": games}

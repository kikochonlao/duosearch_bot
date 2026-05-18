from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps.auth import get_telegram_user
from app.api.deps.db import get_session
from app.api.schemas.profile import ProfileOut, ProfileUpdate, GameProfileSchema
from db.models.user import User
from db.mappers import db_to_domain
from services.user_service import upsert_user

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
    )


@router.get("/", response_model=ProfileOut)
async def get_profile(
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = auth.get("user", {}).get("id")
    if isinstance(telegram_id, str):
        import json
        try:
            telegram_id = json.loads(telegram_id).get("id")
        except (json.JSONDecodeError, TypeError):
            pass

    telegram_id = int(telegram_id) if telegram_id else auth.get("telegram_id")

    result = await session.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found. Please register first.")

    return _profile_to_out(user)


@router.post("/", response_model=ProfileOut)
async def create_or_update_profile(
    profile: ProfileUpdate,
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = auth.get("user", {}).get("id")
    if isinstance(telegram_id, str):
        import json
        try:
            telegram_id = json.loads(telegram_id).get("id")
        except (json.JSONDecodeError, TypeError):
            pass

    telegram_id = int(telegram_id) if telegram_id else None

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
        bio=profile.bio,
        photo_url=profile.photo_url,
        looking_for=profile.looking_for or "any",
        games=games_dict,
    )

    await session.commit()

    result = await session.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one()

    return _profile_to_out(user)


@router.patch("/", response_model=ProfileOut)
async def update_profile(
    update: ProfileUpdate,
    auth: dict = Depends(get_telegram_user),
    session: AsyncSession = Depends(get_session),
):
    telegram_id = auth.get("user", {}).get("id")
    if isinstance(telegram_id, str):
        import json
        try:
            telegram_id = json.loads(telegram_id).get("id")
        except (json.JSONDecodeError, TypeError):
            pass

    telegram_id = int(telegram_id) if telegram_id else None

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
                games_dict[gk] = {"rank": gp.rank, "roles": gp.roles}
            user.set_games(games_dict)
        else:
            setattr(user, field, value)

    await session.commit()
    await session.refresh(user)

    return _profile_to_out(user)

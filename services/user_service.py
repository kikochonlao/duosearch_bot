from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models.user import User as DBUser
from db.mappers import db_to_domain
from core.models.user import User, GameProfile


async def get_user(session: AsyncSession, telegram_id: int) -> User | None:
    result = await session.execute(
        select(DBUser).where(DBUser.telegram_id == telegram_id)
    )
    db_user = result.scalar_one_or_none()
    if db_user:
        return db_to_domain(db_user)
    return None


async def upsert_user(
    session: AsyncSession,
    telegram_id: int,
    name: str,
    age: int,
    gender: str,
    language: str,
    region: str,
    bio: str | None = None,
    photo_url: str | None = None,
    looking_for: str = "any",
    games: dict = None,
) -> User:
    # Convert GameProfile objects to dicts if needed
    games_dict = {}
    for key, val in games.items():
        if isinstance(val, GameProfile):
            games_dict[key] = val.to_dict()
        else:
            games_dict[key] = val

    result = await session.execute(
        select(DBUser).where(DBUser.telegram_id == telegram_id)
    )
    db_user = result.scalar_one_or_none()

    if db_user:
        if db_user.is_banned:
            raise PermissionError("User is banned")
        db_user.name = name
        db_user.age = age
        db_user.gender = gender
        db_user.language = language
        db_user.region = region
        db_user.bio = bio
        db_user.photo_url = photo_url
        db_user.looking_for = looking_for
        db_user.set_games(games_dict or {})
    else:
        db_user = DBUser(
            telegram_id=telegram_id,
            name=name,
            age=age,
            gender=gender,
            language=language,
            region=region,
            bio=bio,
            photo_url=photo_url,
            looking_for=looking_for,
        )
        db_user.set_games(games_dict or {})
        session.add(db_user)
        await session.flush()

    return db_to_domain(db_user)

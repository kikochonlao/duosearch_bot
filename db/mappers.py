import json

from db.models.user import User as DBUser
from core.models.user import User, GameProfile


def db_to_domain(user: DBUser) -> User:
    games_data = user.get_games()
    games = {}

    for game_key, profile in games_data.items():
        roles = profile.get("roles", {})
        rank = profile.get("rank", "")
        games[game_key] = GameProfile(
            game=game_key,
            roles=roles,
            rank=rank,
        )

    return User(
        id=user.id,
        telegram_id=user.telegram_id,
        name=user.name,
        age=user.age,
        gender=user.gender,
        language=user.language,
        region=user.region,
        username=user.username,
        bio=user.bio,
        photo_url=user.photo_url,
        games=games,
        looking_for=user.looking_for,
        rating=1000,
        is_banned=user.is_banned,
    )


def db_list_to_domain(users: list[DBUser]) -> list[User]:
    return [db_to_domain(u) for u in users]

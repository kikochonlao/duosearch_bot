from fastapi import APIRouter

from keyboards.ranks import RANKS
from keyboards.games import get_game_roles, get_game_display, get_all_game_keys

router = APIRouter()


@router.get("/")
async def get_all_games():
    result = []
    for key, data in RANKS.items():
        result.append({
            "key": key,
            "display": data["display"],
            "has_roles": data.get("has_roles", False),
            "rank_per_role": data.get("rank_per_role", False),
            "ranks": data.get("ranks", []),
            "roles": get_game_roles(key),
        })
    return {"games": result}

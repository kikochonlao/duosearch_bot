RANKS = {
    "cs2": {
        "display": "CS2",
        "icon": "🔫",
        "has_roles": False,
        "ranks": [
            "Silver I", "Silver II", "Silver III", "Silver IV", "Silver Elite", "Silver Elite Master",
            "Gold Nova I", "Gold Nova II", "Gold Nova III", "Gold Nova Master",
            "Master Guardian I", "Master Guardian II", "Master Guardian Elite",
            "Distinguished Master Guardian",
            "Legendary Eagle", "Legendary Eagle Master",
            "Supreme Master First Class",
            "Global Elite",
        ],
    },
    "dota2": {
        "display": "Dota 2",
        "icon": "🗡️",
        "has_roles": True,
        "rank_per_role": False,
        "ranks": [
            "Herald 1", "Herald 2", "Herald 3", "Herald 4", "Herald 5",
            "Guardian 1", "Guardian 2", "Guardian 3", "Guardian 4", "Guardian 5",
            "Crusader 1", "Crusader 2", "Crusader 3", "Crusader 4", "Crusader 5",
            "Archon 1", "Archon 2", "Archon 3", "Archon 4", "Archon 5",
            "Legend 1", "Legend 2", "Legend 3", "Legend 4", "Legend 5",
            "Ancient 1", "Ancient 2", "Ancient 3", "Ancient 4", "Ancient 5",
            "Divine 1", "Divine 2", "Divine 3", "Divine 4", "Divine 5",
            "Immortal",
        ],
    },
    "valorant": {
        "display": "Valorant",
        "icon": "🔫",
        "has_roles": False,
        "ranks": [
            "Iron 1", "Iron 2", "Iron 3",
            "Bronze 1", "Bronze 2", "Bronze 3",
            "Silver 1", "Silver 2", "Silver 3",
            "Gold 1", "Gold 2", "Gold 3",
            "Platinum 1", "Platinum 2", "Platinum 3",
            "Diamond 1", "Diamond 2", "Diamond 3",
            "Ascendant 1", "Ascendant 2", "Ascendant 3",
            "Immortal 1", "Immortal 2", "Immortal 3",
            "Radiant",
        ],
    },
    "overwatch": {
        "display": "Overwatch",
        "icon": "🎯",
        "has_roles": True,
        "rank_per_role": True,
        "ranks": [
            "Bronze 5-1",
            "Silver 5-1",
            "Gold 5-1",
            "Platinum 5-1",
            "Diamond 5-1",
            "Master 5-1",
            "Grandmaster 1-500",
            "Top 500",
        ],
    },
    "apex": {
        "display": "Apex Legends",
        "icon": "🏆",
        "has_roles": False,
        "ranks": [
            "Rookie", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Apex Predator",
        ],
    },
    "lol": {
        "display": "League of Legends",
        "icon": "⚔️",
        "has_roles": True,
        "rank_per_role": False,
        "ranks": [
            "Iron 4", "Iron 3", "Iron 2", "Iron 1",
            "Bronze 4", "Bronze 3", "Bronze 2", "Bronze 1",
            "Silver 4", "Silver 3", "Silver 2", "Silver 1",
            "Gold 4", "Gold 3", "Gold 2", "Gold 1",
            "Platinum 4", "Platinum 3", "Platinum 2", "Platinum 1",
            "Emerald 4", "Emerald 3", "Emerald 2", "Emerald 1",
            "Diamond 4", "Diamond 3", "Diamond 2", "Diamond 1",
            "Master", "Grandmaster", "Challenger",
        ],
    },
    "fortnite": {
        "display": "Fortnite",
        "icon": "⛏️",
        "has_roles": False,
        "ranks": [
            "Bronze 1", "Bronze 2", "Bronze 3",
            "Silver 1", "Silver 2", "Silver 3",
            "Gold 1", "Gold 2", "Gold 3",
            "Platinum 1", "Platinum 2", "Platinum 3",
            "Diamond 1", "Diamond 2", "Diamond 3",
            "Elite 1", "Elite 2", "Elite 3",
            "Champion 1", "Champion 2", "Champion 3",
            "Unreal",
        ],
    },
    "rocket_league": {
        "display": "Rocket League",
        "icon": "🚗",
        "has_roles": False,
        "ranks": [
            "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Champion", "Grand Champion", "Supersonic Legend",
        ],
    },
    "pubg": {
        "display": "PUBG",
        "icon": "🪖",
        "has_roles": False,
        "ranks": [
            "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster",
        ],
    },
}

GAMES_WITH_ROLES = {k for k, v in RANKS.items() if v.get("has_roles")}
GAMES_RANK_PER_ROLE = {k for k, v in RANKS.items() if v.get("rank_per_role")}


def get_game_ranks(game_key: str) -> list[str]:
    return RANKS.get(game_key, {}).get("ranks", [])


def get_rank_index(game_key: str, rank_name: str) -> int:
    ranks = get_game_ranks(game_key)
    return ranks.index(rank_name) if rank_name in ranks else -1


def rank_to_score(game_key: str, rank_name: str) -> float:
    idx = get_rank_index(game_key, rank_name)
    if idx < 0:
        return 0.0
    total = len(get_game_ranks(game_key))
    return idx / max(total - 1, 1)


def has_roles(game_key: str) -> bool:
    return game_key in GAMES_WITH_ROLES


def rank_per_role(game_key: str) -> bool:
    return game_key in GAMES_RANK_PER_ROLE


def get_all_games() -> dict:
    return RANKS

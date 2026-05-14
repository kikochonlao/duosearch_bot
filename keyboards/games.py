from keyboards.ranks import RANKS


def get_game_display(key: str) -> str:
    return RANKS.get(key, {}).get("display", key)


def get_game_roles(key: str) -> list[str]:
    roles_map = {
        "dota2": ["Carry", "Mid", "Offlane", "Soft Support", "Hard Support"],
        "overwatch": ["Tank", "DPS", "Support"],
        "lol": ["Top", "Jungle", "Mid", "ADC", "Support"],
    }
    return roles_map.get(key, [])


def get_all_game_keys() -> list[str]:
    return list(RANKS.keys())

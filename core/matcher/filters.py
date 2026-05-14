from core.models.user import User


def filter_same_game(me: User, candidates: list[User], game: str) -> list[User]:
    return [u for u in candidates if game in u.games]


def filter_not_self(me: User, candidates: list[User]) -> list[User]:
    return [u for u in candidates if u.telegram_id != me.telegram_id]


def get_age_range(age: int, gender: str) -> tuple[int, int]:
    if age < 16:
        return 14, 19
    elif age < 18:
        return 14, 21
    else:
        return 18, 99


def filter_by_age_and_gender(me: User, candidates: list[User]) -> list[User]:
    my_min, my_max = get_age_range(me.age, me.gender)

    result = []
    for u in candidates:
        if u.age < my_min or u.age > my_max:
            continue

        u_min, u_max = get_age_range(u.age, u.gender)
        if me.age < u_min or me.age > u_max:
            continue

        if me.age < 18 and u.age >= 25:
            continue 
        if u.age < 18 and me.age >= 25:
            continue

        result.append(u)

    return result


def filter_by_language(me: User, candidates: list[User]) -> list[User]:
    my_langs = set(me.language.split(","))
    return [u for u in candidates if my_langs & set(u.language.split(","))]


def filter_by_region(me: User, candidates: list[User]) -> list[User]:
    return [u for u in candidates if u.region == me.region]

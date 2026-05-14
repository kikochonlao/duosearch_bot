from core.models.user import User


def role_score(me: User, other: User, game: str) -> float:
    my_roles = set(me.games[game].roles.keys()) if me.games[game].roles else set()
    other_roles = set(other.games[game].roles.keys()) if other.games[game].roles else set()

    if not my_roles and not other_roles:
        # No roles for either player - compare by rank instead
        my_r = me.games[game].avg_rank_score
        other_r = other.games[game].avg_rank_score
        if my_r >= 0 and other_r >= 0:
            return max(0.0, 1 - abs(my_r - other_r))
        return 0.5

    overlap = my_roles & other_roles
    return len(overlap) / max(len(my_roles), 1)


def rank_score(me: User, other: User, game: str) -> float:
    my_r = me.games[game].avg_rank_score
    other_r = other.games[game].avg_rank_score

    if my_r < 0 or other_r < 0:
        return 0.5

    diff = abs(my_r - other_r)
    return max(0.0, 1 - diff)


def role_complement_score(me: User, other: User, game: str) -> float:
    my_roles = set(me.games[game].roles.keys()) if me.games[game].roles else set()
    other_roles = set(other.games[game].roles.keys()) if other.games[game].roles else set()

    if not my_roles or not other_roles:
        return 0.0

    my_needs = my_roles - other_roles
    other_needs = other_roles - my_roles

    if not my_needs and not other_needs:
        return 0.0

    complement = len(my_needs & other_needs)
    total_needs = max(len(my_needs | other_needs), 1)
    return complement / total_needs


def total_score(me: User, other: User, game: str) -> float:
    return (
        0.35 * rank_score(me, other, game)
        + 0.35 * role_score(me, other, game)
        + 0.30 * role_complement_score(me, other, game)
    )

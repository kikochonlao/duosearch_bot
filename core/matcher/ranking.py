from core.matcher.scorer import total_score
from core.models.user import User


def rank_users(me: User, candidates: list[User], game: str):
    scored = []

    for u in candidates:
        score = total_score(me, u, game)
        scored.append((u, score))

    scored.sort(key=lambda x: x[1], reverse=True)

    return [u for u, _ in scored]
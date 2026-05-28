from core.matcher import filters, ranking
from core.models.user import User


class ScoringService:

    def build_feed(self, me: User, candidates: list[User], game: str = '') -> list[User]:
        candidates = filters.filter_not_self(me, candidates)
        if game:
            candidates = filters.filter_same_game(me, candidates, game)
        candidates = filters.filter_by_age_and_gender(me, candidates)
        candidates = filters.filter_by_language(me, candidates)
        candidates = filters.filter_by_region(me, candidates)

        if game:
            ranked = ranking.rank_users(me, candidates, game)
            return ranked[:20]
        return candidates[:20]

from sqlalchemy.ext.asyncio import AsyncSession

from db.repositories.feed_repo import FeedRepository
from services.scoring_service import ScoringService


class FeedService:

    def __init__(self, session: AsyncSession):
        self.repo = FeedRepository(session)
        self.scoring = ScoringService()

    async def get_feed(self, telegram_id: int, game: str) -> list:
        me = await self.repo.get_user_by_telegram_id(telegram_id)
        if me is None:
            return []

        candidates = await self.repo.get_candidates(telegram_id, game)
        if not candidates:
            return []

        return self.scoring.build_feed(me, candidates, game)

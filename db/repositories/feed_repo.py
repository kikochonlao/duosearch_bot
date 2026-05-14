from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models.user import User as DBUser
from db.models.match import Match
from db.models.like import Like
from db.models.block import Block
from db.mappers import db_to_domain, db_list_to_domain
from db.repositories.like_repo import LikeRepository
from core.models.user import User


class FeedRepository:

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_user_by_telegram_id(self, telegram_id: int) -> User | None:
        result = await self.session.execute(
            select(DBUser).where(DBUser.telegram_id == telegram_id)
        )
        db_user = result.scalar_one_or_none()
        if db_user is None:
            return None
        return db_to_domain(db_user)

    async def get_candidates(self, telegram_id: int, game: str) -> list[User]:
        result = await self.session.execute(select(DBUser))
        all_users = result.scalars().all()

        like_repo = LikeRepository(self.session)
        interacted_ids = await like_repo.get_interacted_ids(telegram_id)

        me = await self.session.execute(
            select(DBUser).where(DBUser.telegram_id == telegram_id)
        )
        me_user = me.scalar_one_or_none()
        my_db_id = me_user.id if me_user else 0

        blocks_result = await self.session.execute(
            select(Block.blocked_user_id).where(Block.user_id == my_db_id)
        )
        blocked_ids = {r[0] for r in blocks_result.fetchall()}

        candidates = []
        for u in all_users:
            if u.telegram_id == telegram_id:
                continue
            if u.is_banned:
                continue
            if u.id in interacted_ids:
                continue
            if u.id in blocked_ids:
                continue
            if game not in u.get_games():
                continue
            candidates.append(u)

        return db_list_to_domain(candidates)

    async def get_matches(self, telegram_id: int) -> list[User]:
        me = await self.session.execute(
            select(DBUser).where(DBUser.telegram_id == telegram_id)
        )
        me_user = me.scalar_one_or_none()
        if not me_user:
            return []

        matches_result = await self.session.execute(
            select(Match).where(
                (Match.user1_id == me_user.id) | (Match.user2_id == me_user.id)
            )
        )
        matches = matches_result.scalars().all()

        matched_users = []
        for m in matches:
            other_id = m.user2_id if m.user1_id == me_user.id else m.user1_id
            result = await self.session.execute(
                select(DBUser).where(DBUser.id == other_id)
            )
            other = result.scalar_one_or_none()
            if other:
                matched_users.append(other)

        return db_list_to_domain(matched_users)

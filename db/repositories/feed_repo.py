from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models.user import User as DBUser
from db.models.match import Match
from db.models.like import Like
from db.models.block import Block
from db.models.skip import Skip
from db.mappers import db_to_domain, db_list_to_domain
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

    async def get_candidates(self, telegram_id: int, game: str = '',
                              gender: str = '', region: str = '',
                              age_min: int = 0, age_max: int = 99) -> list[User]:
        me = await self.session.execute(
            select(DBUser).where(DBUser.telegram_id == telegram_id)
        )
        me_user = me.scalar_one_or_none()
        if not me_user:
            return []

        interacted_ids = await self.session.execute(
            select(Like.to_user_id).where(Like.from_user_id == me_user.id)
        )
        liked = {r[0] for r in interacted_ids.fetchall()}

        skipped = await self.session.execute(
            select(Skip.to_user_id).where(Skip.from_user_id == me_user.id)
        )
        liked.update(r[0] for r in skipped.fetchall())

        blocked = await self.session.execute(
            select(Block.blocked_user_id).where(Block.user_id == me_user.id)
        )
        liked.update(r[0] for r in blocked.fetchall())

        blocked_by = await self.session.execute(
            select(Block.user_id).where(Block.blocked_user_id == me_user.id)
        )
        liked.update(r[0] for r in blocked_by.fetchall())

        query = select(DBUser).where(
            DBUser.telegram_id != telegram_id,
            DBUser.is_banned == 0,
        )
        if liked:
            query = query.where(~DBUser.id.in_(liked))
        if game:
            query = query.where(DBUser.games.like(f'%"{game}"%'))
        if gender:
            query = query.where(DBUser.gender == gender)
        if region:
            query = query.where(DBUser.region == region)
        if age_min:
            query = query.where(DBUser.age >= age_min)
        if age_max < 99:
            query = query.where(DBUser.age <= age_max)

        result = await self.session.execute(query)
        return db_list_to_domain(result.scalars().all())

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

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models.user import User as DBUser
from db.models.like import Like
from db.models.block import Block
from db.mappers import db_to_domain
from core.models.user import User


class LikeRepository:

    def __init__(self, session: AsyncSession):
        self.session = session

    async def _get_user_by_telegram(self, telegram_id: int) -> DBUser | None:
        result = await self.session.execute(
            select(DBUser).where(DBUser.telegram_id == telegram_id)
        )
        return result.scalar_one_or_none()

    async def get_user_by_telegram(self, telegram_id: int) -> DBUser | None:
        return await self._get_user_by_telegram(telegram_id)

    async def like(self, from_telegram_id: int, to_telegram_id: int, game: str) -> tuple[bool, int, DBUser | None]:
        from_user = await self._get_user_by_telegram(from_telegram_id)
        to_user = await self._get_user_by_telegram(to_telegram_id)

        if not from_user or not to_user:
            return False, 0, None

        existing = await self.session.execute(
            select(Like).where(
                Like.from_user_id == from_user.id,
                Like.to_user_id == to_user.id,
            )
        )
        if existing.scalar_one_or_none():
            return False, 0, None

        like = Like(from_user_id=from_user.id, to_user_id=to_user.id, game=game)
        self.session.add(like)

        existing_mutual = await self.session.execute(
            select(Like).where(
                Like.from_user_id == to_user.id,
                Like.to_user_id == from_user.id,
            )
        )
        is_mutual = existing_mutual.scalar_one_or_none() is not None

        if is_mutual:
            from db.models.match import Match
            match = Match(user1_id=from_user.id, user2_id=to_user.id)
            self.session.add(match)
            await self.session.commit()
            return True, match.id, to_user

        await self.session.commit()
        return False, 0, to_user

    async def skip(self, from_telegram_id: int, to_telegram_id: int):
        pass

    async def get_interacted_ids(self, telegram_id: int) -> set[int]:
        me = await self._get_user_by_telegram(telegram_id)
        if not me:
            return set()

        likes_result = await self.session.execute(
            select(Like.to_user_id).where(Like.from_user_id == me.id)
        )
        liked_ids = {r[0] for r in likes_result.fetchall()}

        blocks_result = await self.session.execute(
            select(Block.blocked_user_id).where(Block.user_id == me.id)
        )
        blocked_ids = {r[0] for r in blocks_result.fetchall()}

        return liked_ids | blocked_ids

    async def get_liked_me(self, telegram_id: int, game: str = None) -> list[DBUser]:
        me = await self._get_user_by_telegram(telegram_id)
        if not me:
            return []

        query = select(Like.from_user_id).where(Like.to_user_id == me.id)
        if game:
            query = query.where(Like.game == game)

        result = await self.session.execute(query)
        liker_ids = [r[0] for r in result.fetchall()]

        if not liker_ids:
            return []

        users_result = await self.session.execute(
            select(DBUser).where(DBUser.id.in_(liker_ids))
        )
        return list(users_result.scalars().all())

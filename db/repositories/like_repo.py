from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models.user import User as DBUser
from db.models.like import Like
from db.models.block import Block
from db.models.skip import Skip
from db.models.chat_session import ChatSession
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

    async def like(self, from_telegram_id: int, to_telegram_id: int, game: str) -> tuple[bool, int | None, DBUser | None]:
        from_user = await self._get_user_by_telegram(from_telegram_id)
        to_user = await self._get_user_by_telegram(to_telegram_id)

        if not from_user or not to_user:
            return False, None, None

        existing = await self.session.execute(
            select(Like).where(
                Like.from_user_id == from_user.id,
                Like.to_user_id == to_user.id,
            ).with_for_update()
        )
        if existing.scalar_one_or_none():
            return False, None, None

        like = Like(from_user_id=from_user.id, to_user_id=to_user.id, game=game)
        self.session.add(like)
        await self.session.flush()

        existing_mutual = await self.session.execute(
            select(Like).where(
                Like.from_user_id == to_user.id,
                Like.to_user_id == from_user.id,
            ).with_for_update()
        )
        is_mutual = existing_mutual.scalar_one_or_none() is not None

        if is_mutual:
            from db.models.match import Match
            from db.models.duo_relationship import DuoRelationship, XPEvent, UnlockedAchievement
            match = Match(user1_id=from_user.id, user2_id=to_user.id)
            self.session.add(match)
            await self.session.flush()
            cs = ChatSession(match_id=match.id, user1_id=from_user.id, user2_id=to_user.id)
            self.session.add(cs)
            rel = DuoRelationship(match_id=match.id, user1_id=from_user.id, user2_id=to_user.id, level=1, xp=50)
            self.session.add(rel)
            await self.session.flush()
            ev = XPEvent(relationship_id=rel.id, activity_type="first_match", xp_awarded=50, payload='{"title":"First Match"}')
            self.session.add(ev)
            ua = UnlockedAchievement(relationship_id=rel.id, achievement_key="first_match")
            self.session.add(ua)
            await self.session.flush()
            return True, match.id, to_user

        return False, None, to_user

    async def skip(self, from_telegram_id: int, to_telegram_id: int):
        from_user = await self._get_user_by_telegram(from_telegram_id)
        to_user = await self._get_user_by_telegram(to_telegram_id)
        if not from_user or not to_user:
            return
        existing = await self.session.execute(
            select(Skip).where(
                Skip.from_user_id == from_user.id,
                Skip.to_user_id == to_user.id,
            )
        )
        if existing.scalar_one_or_none():
            return
        self.session.add(Skip(from_user_id=from_user.id, to_user_id=to_user.id))

    async def get_interacted_ids(self, telegram_id: int) -> set[int]:
        me = await self._get_user_by_telegram(telegram_id)
        if not me:
            return set()

        likes_result = await self.session.execute(
            select(Like.to_user_id).where(Like.from_user_id == me.id)
        )
        liked_ids = {r[0] for r in likes_result.fetchall()}

        skips_result = await self.session.execute(
            select(Skip.to_user_id).where(Skip.from_user_id == me.id)
        )
        skipped_ids = {r[0] for r in skips_result.fetchall()}

        blocks_result = await self.session.execute(
            select(Block.blocked_user_id).where(Block.user_id == me.id)
        )
        blocked_ids = {r[0] for r in blocks_result.fetchall()}

        return liked_ids | skipped_ids | blocked_ids

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

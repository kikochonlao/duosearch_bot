from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from db.models.user import User as DBUser
from db.models.like import Like
from db.models.match import Match
from db.models.block import Block
from db.models.report import Report


class AdminRepository:

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_users_count(self) -> int:
        result = await self.session.execute(select(func.count(DBUser.id)))
        return result.scalar_one()

    async def get_users(self, offset: int = 0, limit: int = 10) -> list[DBUser]:
        result = await self.session.execute(
            select(DBUser).order_by(DBUser.id.desc()).offset(offset).limit(limit)
        )
        return list(result.scalars().all())

    async def get_user_by_telegram(self, telegram_id: int) -> DBUser | None:
        result = await self.session.execute(
            select(DBUser).where(DBUser.telegram_id == telegram_id)
        )
        return result.scalar_one_or_none()

    async def get_user_by_id(self, user_id: int) -> DBUser | None:
        result = await self.session.execute(
            select(DBUser).where(DBUser.id == user_id)
        )
        return result.scalar_one_or_none()

    async def ban_user(self, telegram_id: int) -> bool:
        user = await self.get_user_by_telegram(telegram_id)
        if not user:
            return False
        user.is_banned = 1
        await self.session.commit()
        return True

    async def unban_user(self, telegram_id: int) -> bool:
        user = await self.get_user_by_telegram(telegram_id)
        if not user:
            return False
        user.is_banned = 0
        await self.session.commit()
        return True

    async def get_stats(self) -> dict:
        users_count = await self.get_users_count()

        likes_count_result = await self.session.execute(select(func.count(Like.id)))
        likes_count = likes_count_result.scalar_one()

        matches_count_result = await self.session.execute(select(func.count(Match.id)))
        matches_count = matches_count_result.scalar_one()

        blocks_count_result = await self.session.execute(select(func.count(Block.id)))
        blocks_count = blocks_count_result.scalar_one()

        reports_count_result = await self.session.execute(select(func.count(Report.id)))
        reports_count = reports_count_result.scalar_one()

        banned_count_result = await self.session.execute(
            select(func.count(DBUser.id)).where(DBUser.is_banned == 1)
        )
        banned_count = banned_count_result.scalar_one()

        return {
            "users": users_count,
            "likes": likes_count,
            "matches": matches_count,
            "blocks": blocks_count,
            "reports": reports_count,
            "banned": banned_count,
        }

    async def get_all_active_telegram_ids(self) -> list[int]:
        result = await self.session.execute(
            select(DBUser.telegram_id).where(DBUser.is_banned == 0)
        )
        return [r[0] for r in result.fetchall()]

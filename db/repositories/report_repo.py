from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta

from db.models.report import Report
from db.models.user import User as DBUser
from db.models.block import Block


REPORT_THRESHOLD = 3
ANTI_SPAM_SECONDS = 30


class ReportRepository:

    def __init__(self, session: AsyncSession):
        self.session = session

    async def _get_user_by_telegram(self, telegram_id: int) -> DBUser | None:
        result = await self.session.execute(
            select(DBUser).where(DBUser.telegram_id == telegram_id)
        )
        return result.scalar_one_or_none()

    async def has_recent_report(self, reporter_id: int, reported_id: int, seconds: int = ANTI_SPAM_SECONDS) -> bool:
        cutoff = datetime.utcnow() - timedelta(seconds=seconds)
        result = await self.session.execute(
            select(Report).where(
                Report.reporter_id == reporter_id,
                Report.reported_user_id == reported_id,
                Report.created_at >= cutoff
            )
        )
        return result.scalar_one_or_none() is not None

    async def add_report(self, reporter_id: int, reported_id: int, reason: str) -> tuple[bool, int]:
        reporter_user = await self._get_user_by_telegram(reporter_id)
        reported_user = await self._get_user_by_telegram(reported_id)

        if not reporter_user or not reported_user:
            return False, 0

        if await self.has_recent_report(reporter_user.id, reported_user.id):
            return False, -1

        report = Report(
            reporter_id=reporter_user.id,
            reported_user_id=reported_user.id,
            reason=reason
        )
        self.session.add(report)

        result = await self.session.execute(
            select(func.count(Report.id)).where(
                Report.reported_user_id == reported_user.id
            )
        )
        total_reports = result.scalar_one()

        await self.session.commit()

        auto_ban = total_reports >= REPORT_THRESHOLD
        if auto_ban:
            await self._ban_user(reported_user.id)

        return auto_ban, total_reports

    async def _ban_user(self, user_id: int):
        result = await self.session.execute(select(DBUser).where(DBUser.id == user_id))
        user = result.scalar_one_or_none()
        if user:
            user.is_banned = 1
            await self.session.commit()

    async def block_user(self, blocker_id: int, blocked_id: int) -> bool:
        blocker = await self._get_user_by_telegram(blocker_id)
        blocked = await self._get_user_by_telegram(blocked_id)

        if not blocker or not blocked:
            return False

        existing = await self.session.execute(
            select(Block).where(
                Block.user_id == blocker.id,
                Block.blocked_user_id == blocked.id
            )
        )
        if existing.scalar_one_or_none():
            return False

        self.session.add(Block(user_id=blocker.id, blocked_user_id=blocked.id))
        await self.session.commit()
        return True

    async def unblock_user(self, blocker_id: int, blocked_id: int) -> bool:
        blocker = await self._get_user_by_telegram(blocker_id)
        blocked = await self._get_user_by_telegram(blocked_id)

        if not blocker or not blocked:
            return False

        existing = await self.session.execute(
            select(Block).where(
                Block.user_id == blocker.id,
                Block.blocked_user_id == blocked.id
            )
        )
        block = existing.scalar_one_or_none()
        if not block:
            return False

        await self.session.delete(block)
        await self.session.commit()
        return True

    async def get_blocked_users(self, user_id: int) -> list[DBUser]:
        user = await self._get_user_by_telegram(user_id)
        if not user:
            return []

        result = await self.session.execute(
            select(Block).where(Block.user_id == user.id)
        )
        blocks = result.scalars().all()
        blocked_ids = [b.blocked_user_id for b in blocks]
        if not blocked_ids:
            return []

        users_result = await self.session.execute(
            select(DBUser).where(DBUser.id.in_(blocked_ids))
        )
        return list(users_result.scalars().all())

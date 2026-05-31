from sqlalchemy import select
from db.models.user import User
from db.base import async_session_maker


class UserRepository:

    @staticmethod
    async def get_by_telegram_id(telegram_id: int) -> User | None:
        async with async_session_maker() as session:
            result = await session.execute(
                select(User).where(User.telegram_id == telegram_id)
            )
            return result.scalar_one_or_none()

    @staticmethod
    async def create_user(telegram_id: int, username: str | None) -> User:
        async with async_session_maker() as session:
            user = User(
                telegram_id=telegram_id,
                username=username
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            return user
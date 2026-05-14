from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models.chat_session import ChatSession
from db.models.user import User as DBUser
from db.models.match import Match


class ChatRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_session(self, match_id: int, user1_id: int, user2_id: int) -> ChatSession:
        cs = ChatSession(match_id=match_id, user1_id=user1_id, user2_id=user2_id)
        self.session.add(cs)
        await self.session.flush()
        return cs

    async def get_session(self, user_id: int) -> ChatSession | None:
        stmt = (
            select(ChatSession)
            .where(
                (ChatSession.user1_id == user_id) | (ChatSession.user2_id == user_id),
            )
            .order_by(ChatSession.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_active_session(self, user_id: int) -> ChatSession | None:
        stmt = (
            select(ChatSession)
            .where(
                ChatSession.is_active.is_(True),
                (ChatSession.user1_id == user_id) | (ChatSession.user2_id == user_id),
            )
            .order_by(ChatSession.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_session_by_match(self, match_id: int) -> ChatSession | None:
        stmt = select(ChatSession).where(ChatSession.match_id == match_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_other_user_id(self, session_id: int, my_user_id: int) -> int | None:
        cs = await self.session.get(ChatSession, session_id)
        if not cs:
            return None
        return cs.user2_id if cs.user1_id == my_user_id else cs.user1_id

    async def get_other_user_by_session(self, session_id: int, my_user_id: int) -> DBUser | None:
        cs = await self.session.get(ChatSession, session_id)
        if not cs:
            return None
        other_id = cs.user2_id if cs.user1_id == my_user_id else cs.user1_id
        stmt = select(DBUser).where(DBUser.id == other_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def close_session(self, session_id: int):
        cs = await self.session.get(ChatSession, session_id)
        if cs:
            cs.is_active = False
            await self.session.flush()

    async def exchange_contacts(self, session_id: int):
        cs = await self.session.get(ChatSession, session_id)
        if cs:
            cs.contacts_exchanged = True
            await self.session.flush()

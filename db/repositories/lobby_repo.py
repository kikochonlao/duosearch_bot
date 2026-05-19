from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from db.models.user import User as DBUser
from db.models.lobby import Lobby
from db.models.lobby_member import LobbyMember
from db.models.lobby_message import LobbyMessage


class LobbyRepository:

    def __init__(self, session: AsyncSession):
        self.session = session

    async def _get_user(self, telegram_id: int) -> DBUser | None:
        result = await self.session.execute(
            select(DBUser).where(DBUser.telegram_id == telegram_id)
        )
        return result.scalar_one_or_none()

    async def create_lobby(self, telegram_id: int, game: str, title: str,
                           description: str | None = None, max_players: int = 2,
                           is_public: bool = True) -> Lobby | None:
        user = await self._get_user(telegram_id)
        if not user:
            return None
        lobby = Lobby(
            creator_id=user.id,
            game=game,
            title=title,
            description=description,
            max_players=max_players,
            is_public=is_public,
        )
        self.session.add(lobby)
        await self.session.flush()

        member = LobbyMember(
            lobby_id=lobby.id,
            user_id=user.id,
            role="creator",
            status="approved",
        )
        self.session.add(member)
        await self.session.flush()
        await self.session.refresh(lobby)
        return lobby

    async def list_open_lobbies(self, game: str = "", search: str = "") -> list[tuple[Lobby, int, str]]:
        query = select(Lobby).where(Lobby.status == "open").order_by(Lobby.created_at.desc())
        if game:
            query = query.where(Lobby.game == game)
        if search:
            query = query.where(Lobby.title.ilike(f"%{search}%"))
        result = await self.session.execute(query)
        lobbies = result.scalars().all()

        output = []
        for lb in lobbies:
            cnt = await self._member_count(lb.id)
            creator = await self.session.get(DBUser, lb.creator_id)
            creator_name = creator.name if creator else "?"
            output.append((lb, cnt, creator_name))
        return output

    async def get_my_lobbies(self, telegram_id: int) -> list[tuple[Lobby, int, str]]:
        user = await self._get_user(telegram_id)
        if not user:
            return []

        result = await self.session.execute(
            select(LobbyMember.lobby_id).where(LobbyMember.user_id == user.id)
        )
        lobby_ids = [r[0] for r in result.fetchall()]
        if not lobby_ids:
            return []

        lobbies_result = await self.session.execute(
            select(Lobby).where(Lobby.id.in_(lobby_ids)).order_by(Lobby.created_at.desc())
        )
        lobbies = lobbies_result.scalars().all()

        output = []
        for lb in lobbies:
            cnt = await self._member_count(lb.id)
            creator = await self.session.get(DBUser, lb.creator_id)
            creator_name = creator.name if creator else "?"
            output.append((lb, cnt, creator_name))
        return output

    async def get_lobby(self, lobby_id: int) -> Lobby | None:
        return await self.session.get(Lobby, lobby_id)

    async def get_members(self, lobby_id: int) -> list[tuple[LobbyMember, DBUser]]:
        result = await self.session.execute(
            select(LobbyMember).where(LobbyMember.lobby_id == lobby_id)
        )
        members = result.scalars().all()
        output = []
        for m in members:
            user = await self.session.get(DBUser, m.user_id)
            if user:
                output.append((m, user))
        return output

    async def is_member(self, lobby_id: int, telegram_id: int) -> LobbyMember | None:
        user = await self._get_user(telegram_id)
        if not user:
            return None
        result = await self.session.execute(
            select(LobbyMember).where(
                LobbyMember.lobby_id == lobby_id,
                LobbyMember.user_id == user.id,
            )
        )
        return result.scalar_one_or_none()

    async def join_lobby(self, lobby_id: int, telegram_id: int) -> tuple[bool, str]:
        lobby = await self.session.get(Lobby, lobby_id)
        if not lobby:
            return False, "Lobby not found"
        if lobby.status != "open":
            return False, "Lobby is not open"

        user = await self._get_user(telegram_id)
        if not user:
            return False, "User not found"

        existing = await self.is_member(lobby_id, telegram_id)
        if existing:
            return False, "Already a member"

        cnt = await self._member_count(lobby_id)
        if cnt >= lobby.max_players:
            return False, "Lobby is full"

        if lobby.is_public:
            member = LobbyMember(
                lobby_id=lobby.id,
                user_id=user.id,
                role="member",
                status="approved",
            )
            self.session.add(member)
            await self.session.flush()
            return True, "Joined"
        else:
            member = LobbyMember(
                lobby_id=lobby.id,
                user_id=user.id,
                role="member",
                status="pending",
            )
            self.session.add(member)
            await self.session.flush()
            return True, "Join requested"

    async def leave_lobby(self, lobby_id: int, telegram_id: int) -> bool:
        member = await self.is_member(lobby_id, telegram_id)
        if not member:
            return False

        lobby = await self.session.get(Lobby, lobby_id)
        await self.session.delete(member)
        await self.session.flush()

        if lobby and lobby.creator_id == member.user_id:
            lobby.status = "closed"
            await self.session.flush()
        return True

    async def approve_member(self, lobby_id: int, approver_telegram_id: int,
                             target_user_id: int) -> bool:
        lobby = await self.session.get(Lobby, lobby_id)
        if not lobby:
            return False

        approver = await self._get_user(approver_telegram_id)
        if not approver or lobby.creator_id != approver.id:
            return False

        result = await self.session.execute(
            select(LobbyMember).where(
                LobbyMember.lobby_id == lobby_id,
                LobbyMember.user_id == target_user_id,
                LobbyMember.status == "pending",
            )
        )
        member = result.scalar_one_or_none()
        if not member:
            return False

        cnt = await self._member_count(lobby_id)
        if cnt >= lobby.max_players:
            return False

        member.status = "approved"
        await self.session.flush()
        return True

    async def kick_member(self, lobby_id: int, kicker_telegram_id: int,
                          target_user_id: int) -> bool:
        lobby = await self.session.get(Lobby, lobby_id)
        if not lobby:
            return False

        kicker = await self._get_user(kicker_telegram_id)
        if not kicker or lobby.creator_id != kicker.id:
            return False

        if target_user_id == lobby.creator_id:
            return False

        result = await self.session.execute(
            select(LobbyMember).where(
                LobbyMember.lobby_id == lobby_id,
                LobbyMember.user_id == target_user_id,
            )
        )
        member = result.scalar_one_or_none()
        if not member:
            return False

        await self.session.delete(member)
        await self.session.flush()
        return True

    async def close_lobby(self, lobby_id: int, telegram_id: int) -> bool:
        lobby = await self.session.get(Lobby, lobby_id)
        if not lobby:
            return False

        user = await self._get_user(telegram_id)
        if not user or lobby.creator_id != user.id:
            return False

        lobby.status = "closed"
        await self.session.flush()
        return True

    async def get_messages(self, lobby_id: int) -> list[LobbyMessage]:
        result = await self.session.execute(
            select(LobbyMessage).where(
                LobbyMessage.lobby_id == lobby_id
            ).order_by(LobbyMessage.created_at.asc())
        )
        return list(result.scalars().all())

    async def send_message(self, lobby_id: int, telegram_id: int, text: str) -> LobbyMessage | None:
        user = await self._get_user(telegram_id)
        if not user:
            return None

        member = await self.is_member(lobby_id, telegram_id)
        if not member or member.status != "approved":
            return None

        msg = LobbyMessage(
            lobby_id=lobby_id,
            user_id=user.id,
            text=text,
        )
        self.session.add(msg)
        await self.session.flush()
        await self.session.refresh(msg)
        return msg

    async def _member_count(self, lobby_id: int) -> int:
        result = await self.session.execute(
            select(LobbyMember).where(
                LobbyMember.lobby_id == lobby_id,
                LobbyMember.status == "approved",
            )
        )
        return len(result.scalars().all())

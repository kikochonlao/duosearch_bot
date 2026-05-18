from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column
from db.base import Base
from datetime import datetime
from sqlalchemy import DateTime, func


class LobbyMember(Base):
    __tablename__ = "lobby_members"

    id: Mapped[int] = mapped_column(primary_key=True)
    lobby_id: Mapped[int] = mapped_column(ForeignKey("lobbies.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    role: Mapped[str] = mapped_column(String, default="member")
    status: Mapped[str] = mapped_column(String, default="approved")

    joined_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

from sqlalchemy import ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from db.base import Base
from datetime import datetime
from sqlalchemy import DateTime, func


class LobbyMessage(Base):
    __tablename__ = "lobby_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    lobby_id: Mapped[int] = mapped_column(ForeignKey("lobbies.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    text: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

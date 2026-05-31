from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from db.base import Base
from datetime import datetime
from sqlalchemy import Boolean, DateTime, func


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)

    user1_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    user2_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    contacts_exchanged: Mapped[bool] = mapped_column(Boolean, default=False)

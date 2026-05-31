from typing import Optional
from sqlalchemy import ForeignKey, BigInteger, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from db.base import Base
from datetime import datetime


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True)

    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), nullable=False, index=True)
    from_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    from_telegram_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

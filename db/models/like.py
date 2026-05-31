from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, String, func
from sqlalchemy.orm import Mapped, mapped_column
from db.base import Base


class Like(Base):
    __tablename__ = "likes"

    id: Mapped[int] = mapped_column(primary_key=True)

    from_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    to_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    game: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("from_user_id", "to_user_id"),
    )

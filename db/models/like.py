from sqlalchemy import ForeignKey, UniqueConstraint, String
from sqlalchemy.orm import Mapped, mapped_column
from db.base import Base
from datetime import datetime
from sqlalchemy import DateTime, func


class Like(Base):
    __tablename__ = "likes"

    id: Mapped[int] = mapped_column(primary_key=True)

    from_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    to_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    game: Mapped[str] = mapped_column(String, nullable=True)

    __table_args__ = (
        UniqueConstraint("from_user_id", "to_user_id"),
    )

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from db.base import Base


class Block(Base):
    __tablename__ = "blocks"

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    blocked_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    __table_args__ = (
        UniqueConstraint("user_id", "blocked_user_id"),
    )
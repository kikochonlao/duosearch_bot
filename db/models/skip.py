from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from db.base import Base


class Skip(Base):
    __tablename__ = "skips"

    id: Mapped[int] = mapped_column(primary_key=True)
    from_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    to_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    __table_args__ = (
        UniqueConstraint("from_user_id", "to_user_id"),
    )

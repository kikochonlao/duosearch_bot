from sqlalchemy import ForeignKey, UniqueConstraint, Integer, String, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from db.base import Base
from typing import Optional


class DuoRelationship(Base):
    __tablename__ = "duo_relationships"

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), unique=True)
    user1_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    user2_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    level: Mapped[int] = mapped_column(Integer, default=1)
    xp: Mapped[int] = mapped_column(Integer, default=0)
    duo_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())


class XPEvent(Base):
    __tablename__ = "xp_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    relationship_id: Mapped[int] = mapped_column(ForeignKey("duo_relationships.id"))
    activity_type: Mapped[str] = mapped_column(String, nullable=False)
    xp_awarded: Mapped[int] = mapped_column(Integer, nullable=False)
    metadata: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())


class UnlockedAchievement(Base):
    __tablename__ = "unlocked_achievements"

    id: Mapped[int] = mapped_column(primary_key=True)
    relationship_id: Mapped[int] = mapped_column(ForeignKey("duo_relationships.id"))
    achievement_key: Mapped[str] = mapped_column(String, nullable=False)
    unlocked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (UniqueConstraint("relationship_id", "achievement_key"),)

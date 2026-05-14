"""initial migration

Revision ID: 001_initial
Revises:
Create Date: 2026-05-01

"""
from alembic import op
import sqlalchemy as sa

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("telegram_id", sa.BigInteger, unique=True, nullable=False, index=True),
        sa.Column("username", sa.String, nullable=True),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("age", sa.Integer, nullable=False),
        sa.Column("gender", sa.String, nullable=False, server_default="M"),
        sa.Column("language", sa.String, nullable=False, server_default="ru"),
        sa.Column("region", sa.String, nullable=False, server_default="cis"),
        sa.Column("looking_for", sa.String, nullable=False, server_default="any"),
        sa.Column("games", sa.Text, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("is_banned", sa.Integer, nullable=False, server_default="0"),
    )

    op.create_table(
        "likes",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("from_user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("to_user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("game", sa.String, nullable=True),
        sa.UniqueConstraint("from_user_id", "to_user_id"),
    )

    op.create_table(
        "matches",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user1_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("user2_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "blocks",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("blocked_user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.UniqueConstraint("user_id", "blocked_user_id"),
    )

    op.create_table(
        "reports",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("reporter_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reported_user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reason", sa.String, nullable=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.UniqueConstraint("reporter_id", "reported_user_id", "created_at"),
    )

    op.create_table(
        "chat_sessions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user1_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("user2_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("match_id", sa.Integer, sa.ForeignKey("matches.id"), nullable=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("is_active", sa.Boolean, server_default=sa.true()),
        sa.Column("contacts_exchanged", sa.Boolean, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_table("chat_sessions")
    op.drop_table("reports")
    op.drop_table("blocks")
    op.drop_table("matches")
    op.drop_table("likes")
    op.drop_table("users")

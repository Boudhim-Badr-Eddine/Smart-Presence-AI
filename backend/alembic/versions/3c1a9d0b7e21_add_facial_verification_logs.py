"""Add facial verification logs

Revision ID: 3c1a9d0b7e21
Revises: 9d2c3a4b5e6f
Create Date: 2025-12-17

Adds a small audit/log table to record facial login attempts (success/failure),
including similarity, threshold, and basic quality metrics.

This keeps the existing API stable while improving observability.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "3c1a9d0b7e21"
down_revision = "9d2c3a4b5e6f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "facial_verification_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("attempted_email", sa.String(length=255), nullable=True),
        sa.Column("success", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("similarity", sa.Float(), nullable=True),
        sa.Column("threshold", sa.Float(), nullable=True),
        sa.Column("failure_reason", sa.String(length=100), nullable=True),
        sa.Column("num_faces", sa.Integer(), nullable=True),
        sa.Column("blur_score", sa.Float(), nullable=True),
        sa.Column("brightness", sa.Float(), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.String(length=512), nullable=True),
    )

    op.create_index(
        "ix_facial_verification_logs_created_at",
        "facial_verification_logs",
        ["created_at"],
        unique=False,
    )
    op.create_index(
        "ix_facial_verification_logs_user_id",
        "facial_verification_logs",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_facial_verification_logs_attempted_email",
        "facial_verification_logs",
        ["attempted_email"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_facial_verification_logs_attempted_email", table_name="facial_verification_logs")
    op.drop_index("ix_facial_verification_logs_user_id", table_name="facial_verification_logs")
    op.drop_index("ix_facial_verification_logs_created_at", table_name="facial_verification_logs")
    op.drop_table("facial_verification_logs")

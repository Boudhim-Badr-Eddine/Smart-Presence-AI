"""Add notification preferences

Revision ID: f1e2d3c4b5a6
Revises: e7f8g9h0i1j2
Create Date: 2025-12-18
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "f1e2d3c4b5a6"
down_revision = "e7f8g9h0i1j2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notification_preferences",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("system", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("justification", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("schedule", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("message", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("email", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("push", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
    )

    op.create_index(
        "ux_notification_preferences_user_id",
        "notification_preferences",
        ["user_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ux_notification_preferences_user_id", table_name="notification_preferences")
    op.drop_table("notification_preferences")

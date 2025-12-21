"""add feedback and messages

Revision ID: d1e2f3a4b5c6
Revises: c8d4e5f6g7h8
Create Date: 2025-12-18 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "d1e2f3a4b5c6"
down_revision = "c8d4e5f6g7h8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "student_feedbacks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("subject", sa.String(length=200), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), server_default=sa.text("'pending'"), nullable=False),
        sa.Column("response", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), onupdate=sa.text("now()")),
    )
    op.create_index(
        "ix_student_feedbacks_student_created",
        "student_feedbacks",
        ["student_id", "created_at"],
    )
    op.create_index("ix_student_feedbacks_status", "student_feedbacks", ["status"])

    op.create_table(
        "message_threads",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user1_id", sa.Integer(), nullable=False),
        sa.Column("user2_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("ix_message_threads_users", "message_threads", ["user1_id", "user2_id"])

    op.create_table(
        "messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("thread_id", sa.Integer(), nullable=False),
        sa.Column("sender_id", sa.Integer(), nullable=False),
        sa.Column("recipient_id", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("read", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("ix_messages_thread_created", "messages", ["thread_id", "created_at"])
    op.create_index("ix_messages_recipient_read", "messages", ["recipient_id", "read"])


def downgrade() -> None:
    op.drop_index("ix_messages_recipient_read", table_name="messages")
    op.drop_index("ix_messages_thread_created", table_name="messages")
    op.drop_table("messages")

    op.drop_index("ix_message_threads_users", table_name="message_threads")
    op.drop_table("message_threads")

    op.drop_index("ix_student_feedbacks_status", table_name="student_feedbacks")
    op.drop_index("ix_student_feedbacks_student_created", table_name="student_feedbacks")
    op.drop_table("student_feedbacks")

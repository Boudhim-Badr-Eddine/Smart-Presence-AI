"""Add soft delete flags and attendance indexes

Revision ID: 20241217_add_soft_delete_and_indexes
Revises: 427079e25122
Create Date: 2025-12-17
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "f7a8b9c0d1e2"
down_revision = "c8d4e5f6g7h8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Soft delete flags
    op.add_column(
        "users",
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "students",
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "sessions",
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "attendance_records",
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
    )

    # Additional indexes for frequent queries
    op.create_index("ix_attendance_marked_at", "attendance_records", ["marked_at"], unique=False)
    op.create_index("ix_attendance_student", "attendance_records", ["student_id"], unique=False)
    op.create_index("ix_attendance_session", "attendance_records", ["session_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_attendance_session", table_name="attendance_records")
    op.drop_index("ix_attendance_student", table_name="attendance_records")
    op.drop_index("ix_attendance_marked_at", table_name="attendance_records")

    op.drop_column("attendance_records", "is_deleted")
    op.drop_column("sessions", "is_deleted")
    op.drop_column("students", "is_deleted")
    op.drop_column("users", "is_deleted")

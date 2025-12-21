"""Add unique constraint on attendance_records(session_id, student_id)

Revision ID: 20251217_attendance_unique
Revises: 3c1a9d0b7e21
Create Date: 2025-12-17

Why:
- Prevent duplicate attendance rows for the same student in the same session.
- Makes QR/self-checkin flows robust under retries/concurrency.

This migration also deduplicates existing rows, keeping the most recent non-deleted
record per (session_id, student_id).
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "20251217_attendance_unique"
down_revision = "3c1a9d0b7e21"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Deduplicate existing data to allow adding the constraint.
    op.execute(
        """
        WITH ranked AS (
            SELECT
                id,
                ROW_NUMBER() OVER (
                    PARTITION BY session_id, student_id
                    ORDER BY is_deleted ASC, marked_at DESC NULLS LAST, id DESC
                ) AS rn
            FROM attendance_records
        )
        DELETE FROM attendance_records
        WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
        """
    )

    op.create_unique_constraint(
        "uq_attendance_session_student",
        "attendance_records",
        ["session_id", "student_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_attendance_session_student",
        "attendance_records",
        type_="unique",
    )

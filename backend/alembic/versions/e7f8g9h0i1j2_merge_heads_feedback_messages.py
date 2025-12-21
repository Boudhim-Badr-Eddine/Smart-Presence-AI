"""Merge heads (attendance_unique + feedback/messages)

Revision ID: e7f8g9h0i1j2
Revises: 20251217_attendance_unique, d1e2f3a4b5c6
Create Date: 2025-12-18

This merge resolves the multiple-head Alembic history introduced by the
feedback/messages migration.
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "e7f8g9h0i1j2"
down_revision = ("20251217_attendance_unique", "d1e2f3a4b5c6")
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Merge-only migration; no schema changes.
    pass


def downgrade() -> None:
    # Downgrading a merge is a no-op; Alembic will move to one of the parent heads.
    pass

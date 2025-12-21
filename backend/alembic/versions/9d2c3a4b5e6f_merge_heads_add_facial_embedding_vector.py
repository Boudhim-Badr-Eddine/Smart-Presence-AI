"""Merge heads; add facial embedding vector + user_id

Revision ID: 9d2c3a4b5e6f
Revises: f7a8b9c0d1e2, 427079e25122
Create Date: 2025-12-17

This migration resolves the two-head Alembic history and fixes facial recognition
storage by adding a pgvector embedding column and a user_id reference.

Notes:
- `student_id` is made nullable to support non-student roles (admin/trainer).
- `embedding` is stored as pgvector `vector(512)`.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "9d2c3a4b5e6f"
down_revision = ("f7a8b9c0d1e2", "427079e25122")
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Allow storing embeddings for non-students (admin/trainer)
    op.alter_column(
        "facial_embeddings",
        "student_id",
        existing_type=sa.Integer(),
        nullable=True,
    )

    op.add_column("facial_embeddings", sa.Column("user_id", sa.Integer(), nullable=True))
    op.create_index("ix_embeddings_user", "facial_embeddings", ["user_id"], unique=False)

    # Store actual embedding values in pgvector
    op.execute("ALTER TABLE facial_embeddings ADD COLUMN embedding vector(512)")


def downgrade() -> None:
    op.execute("ALTER TABLE facial_embeddings DROP COLUMN IF EXISTS embedding")

    op.drop_index("ix_embeddings_user", table_name="facial_embeddings")
    op.drop_column("facial_embeddings", "user_id")

    op.alter_column(
        "facial_embeddings",
        "student_id",
        existing_type=sa.Integer(),
        nullable=False,
    )

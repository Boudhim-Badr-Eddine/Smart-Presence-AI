"""Add session_requests table

Revision ID: c60g3e238752
Revises: b59f2d127641
Create Date: 2025-12-20 15:03:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c60g3e238752'
down_revision = 'b59f2d127641'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create session_requests table
    op.create_table(
        'session_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('trainer_id', sa.Integer(), nullable=False),
        sa.Column('trainer_name', sa.String(length=200), nullable=False),
        sa.Column('trainer_email', sa.String(length=200), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('class_name', sa.String(length=100), nullable=False),
        sa.Column('session_date', sa.String(length=50), nullable=False),
        sa.Column('start_time', sa.String(length=20), nullable=False),
        sa.Column('end_time', sa.String(length=20), nullable=False),
        sa.Column('session_type', sa.String(length=50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True, server_default='pending'),
        sa.Column('admin_response', sa.Text(), nullable=True),
        sa.Column('reviewed_by', sa.Integer(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('ix_session_requests_trainer_id', 'session_requests', ['trainer_id'], unique=False)
    op.create_index('ix_session_requests_status', 'session_requests', ['status'], unique=False)
    op.create_index('ix_session_requests_created_at', 'session_requests', ['created_at'], unique=False)
    op.create_index(op.f('ix_session_requests_id'), 'session_requests', ['id'], unique=False)


def downgrade() -> None:
    # Drop indexes
    op.drop_index(op.f('ix_session_requests_id'), table_name='session_requests')
    op.drop_index('ix_session_requests_created_at', table_name='session_requests')
    op.drop_index('ix_session_requests_status', table_name='session_requests')
    op.drop_index('ix_session_requests_trainer_id', table_name='session_requests')
    
    # Drop table
    op.drop_table('session_requests')

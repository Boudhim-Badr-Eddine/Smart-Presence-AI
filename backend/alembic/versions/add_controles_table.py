"""Add controles table and improve trainer model

Revision ID: add_controles_table
Revises: c60g3e238752
Create Date: 2025-12-21 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_controles_table'
down_revision = 'c60g3e238752'  # Latest migration
branch_labels = None
depends_on = None


def upgrade():
    # Create controles table
    op.create_table(
        'controles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('module', sa.String(length=100), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('class_name', sa.String(length=50), nullable=False),
        sa.Column('notified', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('title', sa.String(length=200), nullable=True),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=True),
        sa.Column('trainer_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['trainer_id'], ['trainers.id'], ondelete='SET NULL'),
    )
    
    # Create indexes
    op.create_index('ix_controles_id', 'controles', ['id'], unique=False)
    op.create_index('ix_controles_class_date', 'controles', ['class_name', 'date'], unique=False)
    op.create_index('ix_controles_module', 'controles', ['module'], unique=False)
    op.create_index('ix_controles_notified', 'controles', ['notified', 'date'], unique=False)
    
    # Add new columns to trainers table
    op.add_column('trainers', sa.Column('profile_photo_path', sa.String(length=255), nullable=True))
    op.add_column('trainers', sa.Column('linkedin_url', sa.String(length=255), nullable=True))
    op.add_column('trainers', sa.Column('education', sa.String(length=200), nullable=True))
    op.add_column('trainers', sa.Column('certifications', sa.String(length=500), nullable=True))
    op.add_column('trainers', sa.Column('availability', sa.String(length=200), nullable=True))


def downgrade():
    # Drop new trainer columns
    op.drop_column('trainers', 'availability')
    op.drop_column('trainers', 'certifications')
    op.drop_column('trainers', 'education')
    op.drop_column('trainers', 'linkedin_url')
    op.drop_column('trainers', 'profile_photo_path')
    
    # Drop controles table
    op.drop_index('ix_controles_notified', table_name='controles')
    op.drop_index('ix_controles_module', table_name='controles')
    op.drop_index('ix_controles_class_date', table_name='controles')
    op.drop_index('ix_controles_id', table_name='controles')
    op.drop_table('controles')

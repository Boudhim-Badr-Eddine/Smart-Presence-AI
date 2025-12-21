"""add n8n integration fields

Revision ID: n8n_integration_001
Revises: add_controles_table
Create Date: 2025-12-21 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'n8n_integration_001'
down_revision = 'add_controles_table'
branch_labels = None
depends_on = None


def upgrade():
    # Add fields needed by N8N workflows to students table
    op.add_column('students', sa.Column('pourcentage', sa.Integer(), nullable=True))
    op.add_column('students', sa.Column('justification', sa.Text(), nullable=True))
    op.add_column('students', sa.Column('alertsent', sa.Boolean(), server_default='false', nullable=True))
    
    # Create absence table for N8N workflow 1 (Email parents on absence)
    op.create_table(
        'absence',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('studentid', sa.Integer(), nullable=False),
        sa.Column('date', sa.DateTime(), nullable=False),
        sa.Column('hours', sa.Numeric(5, 2), nullable=False),
        sa.Column('notified', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_absence_studentid', 'absence', ['studentid'])
    op.create_index('ix_absence_notified', 'absence', ['notified'])
    
    # Create pdfabsences table for N8N workflow 5 (Daily PDF summary)
    op.create_table(
        'pdfabsences',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('class', sa.String(50), nullable=False),
        sa.Column('date', sa.String(20), nullable=False),
        sa.Column('pdf_path', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_pdfabsences_class_date', 'pdfabsences', ['class', 'date'])
    
    # Add idStr column to students for N8N compatibility
    op.add_column('students', sa.Column('idStr', sa.String(20), nullable=True))
    # Populate idStr with id as string
    op.execute("UPDATE students SET \"idStr\" = CAST(id AS VARCHAR)")


def downgrade():
    op.drop_column('students', 'pourcentage')
    op.drop_column('students', 'justification')
    op.drop_column('students', 'alertsent')
    op.drop_column('students', 'idStr')
    op.drop_index('ix_absence_studentid', table_name='absence')
    op.drop_index('ix_absence_notified', table_name='absence')
    op.drop_table('absence')
    op.drop_index('ix_pdfabsences_class_date', table_name='pdfabsences')
    op.drop_table('pdfabsences')

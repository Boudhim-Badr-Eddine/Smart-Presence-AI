"""add admin messages tables

Revision ID: b9a6fdb3a2b3
Revises: 4fe2a76790ad
Create Date: 2025-12-16 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'b9a6fdb3a2b3'
down_revision = '4fe2a76790ad'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        'admin_messages',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('admin_user_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('body', sa.Text(), nullable=True),
        sa.Column('message_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=True, server_default=sa.text("'sent'")),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
    )
    op.create_index('ix_admin_messages_type_created', 'admin_messages', ['message_type', 'created_at'])

    op.create_table(
        'admin_message_attachments',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('message_id', sa.Integer(), sa.ForeignKey('admin_messages.id', ondelete='CASCADE'), nullable=False),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('storage_path', sa.String(length=512), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=True),
        sa.Column('size_bytes', sa.Integer(), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
    )

    op.create_table(
        'admin_message_trainers',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('message_id', sa.Integer(), sa.ForeignKey('admin_messages.id', ondelete='CASCADE'), nullable=False),
        sa.Column('trainer_id', sa.Integer(), nullable=False),
    )

    op.create_table(
        'admin_message_classes',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('message_id', sa.Integer(), sa.ForeignKey('admin_messages.id', ondelete='CASCADE'), nullable=False),
        sa.Column('class_name', sa.String(length=100), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('admin_message_classes')
    op.drop_table('admin_message_trainers')
    op.drop_table('admin_message_attachments')
    op.drop_index('ix_admin_messages_type_created', table_name='admin_messages')
    op.drop_table('admin_messages')

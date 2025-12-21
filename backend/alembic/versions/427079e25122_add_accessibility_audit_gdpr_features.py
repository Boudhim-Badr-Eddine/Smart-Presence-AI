"""add_accessibility_audit_gdpr_features

Revision ID: 427079e25122
Revises: c8d4e5f6g7h8
Create Date: 2025-12-16 22:06:11.376917
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '427079e25122'
down_revision = 'c8d4e5f6g7h8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Minimal intended change: add audit_logs, webhooks, webhook_logs only.
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('user_role', sa.String(length=20)),
        sa.Column('user_email', sa.String(length=255)),
        sa.Column('action_type', sa.String(length=50), nullable=False),
        sa.Column('action_description', sa.Text()),
        sa.Column('resource_type', sa.String(length=50)),
        sa.Column('resource_id', sa.Integer()),
        sa.Column('ip_address', sa.String(length=45)),
        sa.Column('user_agent', sa.String(length=512)),
        sa.Column('request_method', sa.String(length=10)),
        sa.Column('request_path', sa.String(length=512)),
        sa.Column('old_values', sa.JSON()),
        sa.Column('new_values', sa.JSON()),
        sa.Column('meta', sa.JSON()),
        sa.Column('success', sa.String(length=20), default="success"),
        sa.Column('error_message', sa.Text()),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('retention_days', sa.Integer(), default=365),
    )
    op.create_index('ix_audit_user_action', 'audit_logs', ['user_id', 'action_type'])
    op.create_index('ix_audit_timestamp', 'audit_logs', ['timestamp'])
    op.create_index('ix_audit_resource', 'audit_logs', ['resource_type', 'resource_id'])

    op.create_table(
        'webhooks',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('url', sa.Text(), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true')),
        sa.Column('secret_key', sa.String(length=255)),
        sa.Column('auth_header', sa.String(length=512)),
        sa.Column('max_retries', sa.Integer(), server_default=sa.text('3')),
        sa.Column('retry_delay_seconds', sa.Integer(), server_default=sa.text('60')),
        sa.Column('custom_headers', sa.JSON()),
        sa.Column('payload_template', sa.JSON()),
        sa.Column('description', sa.Text()),
        sa.Column('created_by_user_id', sa.Integer()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True)),
        sa.Column('total_calls', sa.Integer(), server_default=sa.text('0')),
        sa.Column('successful_calls', sa.Integer(), server_default=sa.text('0')),
        sa.Column('failed_calls', sa.Integer(), server_default=sa.text('0')),
        sa.Column('last_called_at', sa.DateTime(timezone=True)),
        sa.Column('last_status_code', sa.Integer()),
    )
    op.create_index('ix_webhooks_event_active', 'webhooks', ['event_type', 'is_active'])

    op.create_table(
        'webhook_logs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('webhook_id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.String(length=50)),
        sa.Column('request_payload', sa.JSON()),
        sa.Column('request_headers', sa.JSON()),
        sa.Column('response_status_code', sa.Integer()),
        sa.Column('response_body', sa.Text()),
        sa.Column('response_time_ms', sa.Integer()),
        sa.Column('success', sa.Boolean()),
        sa.Column('error_message', sa.Text()),
        sa.Column('retry_count', sa.Integer(), server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_webhook_logs_webhook_created', 'webhook_logs', ['webhook_id', 'created_at'])


def downgrade() -> None:
    op.drop_table('webhook_logs')
    op.drop_table('webhooks')
    op.drop_table('audit_logs')

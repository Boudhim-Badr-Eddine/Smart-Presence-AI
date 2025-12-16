"""add smart attendance tables

Revision ID: c8d4e5f6g7h8
Revises: b9a6fdb3a2b3
Create Date: 2025-12-16 20:45:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'c8d4e5f6g7h8'
down_revision = 'b9a6fdb3a2b3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create attendance_sessions table
    op.create_table(
        'attendance_sessions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('session_id', sa.Integer(), sa.ForeignKey('sessions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('mode', sa.String(length=20), nullable=False),  # self_checkin, teams_auto, hybrid
        sa.Column('checkin_window_minutes', sa.Integer(), server_default=sa.text("15")),
        sa.Column('location_verification_enabled', sa.Boolean(), server_default=sa.text("false")),
        sa.Column('classroom_lat', sa.Numeric(10, 8), nullable=True),
        sa.Column('classroom_lng', sa.Numeric(11, 8), nullable=True),
        sa.Column('allowed_radius_meters', sa.Integer(), server_default=sa.text("100")),
        sa.Column('teams_meeting_id', sa.String(length=255), nullable=True),
        sa.Column('teams_meeting_url', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), onupdate=sa.text('now()')),
    )
    op.create_index('ix_attendance_sessions_session_mode', 'attendance_sessions', ['session_id', 'mode'])

    # Create self_checkins table
    op.create_table(
        'self_checkins',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('attendance_session_id', sa.Integer(), sa.ForeignKey('attendance_sessions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
        sa.Column('face_confidence', sa.Numeric(3, 2), nullable=True),
        sa.Column('liveness_passed', sa.Boolean(), server_default=sa.text("false")),
        sa.Column('location_verified', sa.Boolean(), server_default=sa.text("true")),
        sa.Column('checkin_lat', sa.Numeric(10, 8), nullable=True),
        sa.Column('checkin_lng', sa.Numeric(11, 8), nullable=True),
        sa.Column('distance_from_class_meters', sa.Integer(), nullable=True),
        sa.Column('verification_photo_path', sa.String(length=512), nullable=True),
        sa.Column('device_id', sa.String(length=100), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),  # approved, rejected, flagged
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
    )
    op.create_index('ix_self_checkins_session_student', 'self_checkins', ['attendance_session_id', 'student_id'])
    op.create_index('ix_self_checkins_status', 'self_checkins', ['status'])

    # Create teams_participation table
    op.create_table(
        'teams_participation',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('attendance_session_id', sa.Integer(), sa.ForeignKey('attendance_sessions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
        sa.Column('teams_meeting_id', sa.String(length=255), nullable=False),
        sa.Column('teams_participant_id', sa.String(length=255), nullable=False),
        sa.Column('join_time', sa.DateTime(), nullable=False),
        sa.Column('leave_time', sa.DateTime(), nullable=True),
        sa.Column('presence_percentage', sa.Numeric(5, 2), server_default=sa.text("0")),
        sa.Column('engagement_score', sa.Integer(), server_default=sa.text("0")),
        sa.Column('camera_on_minutes', sa.Integer(), server_default=sa.text("0")),
        sa.Column('mic_used_count', sa.Integer(), server_default=sa.text("0")),
        sa.Column('chat_messages_count', sa.Integer(), server_default=sa.text("0")),
        sa.Column('reactions_count', sa.Integer(), server_default=sa.text("0")),
        sa.Column('engagement_details', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), onupdate=sa.text('now()')),
    )
    op.create_index('ix_teams_participation_session_student', 'teams_participation', ['attendance_session_id', 'student_id'])
    op.create_index('ix_teams_participation_meeting_participant', 'teams_participation', ['teams_meeting_id', 'teams_participant_id'])

    # Create attendance_alerts table
    op.create_table(
        'attendance_alerts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
        sa.Column('session_id', sa.Integer(), sa.ForeignKey('sessions.id', ondelete='CASCADE'), nullable=True),
        sa.Column('alert_type', sa.String(length=50), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False),  # low, medium, high
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('is_acknowledged', sa.Boolean(), server_default=sa.text("false")),
        sa.Column('acknowledged_by_user_id', sa.Integer(), nullable=True),
        sa.Column('acknowledged_at', sa.DateTime(), nullable=True),
        sa.Column('action_taken', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
    )
    op.create_index('ix_attendance_alerts_student_severity', 'attendance_alerts', ['student_id', 'severity'])
    op.create_index('ix_attendance_alerts_acknowledged', 'attendance_alerts', ['is_acknowledged'])

    # Create fraud_detections table
    op.create_table(
        'fraud_detections',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
        sa.Column('session_id', sa.Integer(), sa.ForeignKey('sessions.id', ondelete='CASCADE'), nullable=True),
        sa.Column('checkin_id', sa.Integer(), sa.ForeignKey('self_checkins.id', ondelete='CASCADE'), nullable=True),
        sa.Column('fraud_type', sa.String(length=50), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False),  # low, medium, high, critical
        sa.Column('evidence', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('is_resolved', sa.Boolean(), server_default=sa.text("false")),
        sa.Column('resolved_by_user_id', sa.Integer(), nullable=True),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_fraud_detections_student_severity', 'fraud_detections', ['student_id', 'severity'])
    op.create_index('ix_fraud_detections_resolved', 'fraud_detections', ['is_resolved'])

    # Create smart_attendance_logs table
    op.create_table(
        'smart_attendance_logs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('student_id', sa.Integer(), nullable=True),
        sa.Column('session_id', sa.Integer(), nullable=True),
        sa.Column('details', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
    )
    op.create_index('ix_smart_attendance_logs_event_created', 'smart_attendance_logs', ['event_type', 'created_at'])


def downgrade() -> None:
    op.drop_index('ix_smart_attendance_logs_event_created', table_name='smart_attendance_logs')
    op.drop_table('smart_attendance_logs')
    
    op.drop_index('ix_fraud_detections_resolved', table_name='fraud_detections')
    op.drop_index('ix_fraud_detections_student_severity', table_name='fraud_detections')
    op.drop_table('fraud_detections')
    
    op.drop_index('ix_attendance_alerts_acknowledged', table_name='attendance_alerts')
    op.drop_index('ix_attendance_alerts_student_severity', table_name='attendance_alerts')
    op.drop_table('attendance_alerts')
    
    op.drop_index('ix_teams_participation_meeting_participant', table_name='teams_participation')
    op.drop_index('ix_teams_participation_session_student', table_name='teams_participation')
    op.drop_table('teams_participation')
    
    op.drop_index('ix_self_checkins_status', table_name='self_checkins')
    op.drop_index('ix_self_checkins_session_student', table_name='self_checkins')
    op.drop_table('self_checkins')
    
    op.drop_index('ix_attendance_sessions_session_mode', table_name='attendance_sessions')
    op.drop_table('attendance_sessions')

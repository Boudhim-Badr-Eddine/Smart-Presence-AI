from datetime import date, time

from fastapi import BackgroundTasks


def test_admin_created_session_visible_to_trainer_with_legacy_trainer_id(db_session):
    """Admin-created sessions must be visible on trainer pages.

    Historically some records stored sessions.trainer_id as trainers.id instead of users.id.
    We accept either input but should normalize new sessions to users.id and allow trainers to see both.
    """

    from app.api.routes.admin import create_session
    from app.api.routes.trainer import get_trainer_sessions
    from app.models.session import Session as SessionModel
    from app.models.trainer import Trainer
    from app.models.user import User

    admin = User(username="admin", email="admin@test.com", password_hash="x", role="admin")
    db_session.add(admin)

    trainer_user = User(
        username="trainer",
        email="trainer@test.com",
        password_hash="x",
        role="trainer",
    )
    db_session.add(trainer_user)
    db_session.commit()
    db_session.refresh(admin)
    db_session.refresh(trainer_user)

    trainer_row = Trainer(
        user_id=trainer_user.id,
        first_name="T",
        last_name="R",
        email=trainer_user.email,
        status="active",
    )
    db_session.add(trainer_row)
    db_session.commit()
    db_session.refresh(trainer_row)

    payload = {
        "title": "Session 1",
        "className": "DEV101",
        # Simulate legacy UI sending trainers.id instead of users.id
        "trainerId": trainer_row.id,
        "date": date.today().isoformat(),
        "startTime": time(9, 0).isoformat(timespec="minutes"),
        "endTime": time(10, 0).isoformat(timespec="minutes"),
        "moduleId": 1,
        "classroomId": 1,
        "sessionType": "theory",
    }

    create_session(payload=payload, db=db_session, current_user=admin, background_tasks=BackgroundTasks())

    # Verify DB normalized to users.id
    created = db_session.query(SessionModel).order_by(SessionModel.id.desc()).first()
    assert created is not None
    assert created.trainer_id == trainer_user.id

    # Trainer should see the session
    sessions = get_trainer_sessions(page=1, limit=20, db=db_session, current_user=trainer_user)
    assert isinstance(sessions, list)
    assert any(s.get("id") == created.id for s in sessions)

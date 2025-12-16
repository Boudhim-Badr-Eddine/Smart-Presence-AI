from datetime import date, time

from pydantic import BaseModel


class SessionCreate(BaseModel):
    module_id: int
    trainer_id: int
    classroom_id: int
    session_date: date
    start_time: time
    end_time: time
    duration_minutes: int | None = None
    topic: str | None = None
    session_type: str | None = "theory"


class SessionOut(BaseModel):
    id: int
    module_id: int
    trainer_id: int
    classroom_id: int
    session_date: date
    start_time: time
    end_time: time
    duration_minutes: int | None
    topic: str | None
    session_type: str | None
    status: str | None

    class Config:
        from_attributes = True

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(String(36), primary_key=True, default=_uuid)
    file_name = Column(String(512), nullable=False)
    file_path = Column(String(1024), nullable=False)
    file_size = Column(Integer, nullable=False, default=0)
    upload_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String(32), nullable=False, default="processing")
    title = Column(String(255), nullable=True)
    transcript_json = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    summary_json = Column(Text, nullable=True)
    participants_json = Column(Text, nullable=True)

    entries = relationship(
        "MeetingEntry",
        back_populates="meeting",
        cascade="all, delete-orphan",
        order_by="MeetingEntry.created_at",
    )
    tasks = relationship("Task", back_populates="meeting", cascade="all, delete-orphan")
    feedbacks = relationship(
        "Feedback",
        back_populates="meeting",
        cascade="all, delete-orphan",
    )


class MeetingEntry(Base):
    __tablename__ = "meeting_entries"

    id = Column(String(36), primary_key=True, default=_uuid)
    meeting_id = Column(String(36), ForeignKey("meetings.id"), nullable=False, index=True)
    entry_type = Column(String(32), nullable=False)
    content = Column(Text, nullable=False)
    is_confirmed = Column(Boolean, default=False, nullable=False)
    source_segment_ids = Column(Text, nullable=True)
    manually_edited = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    meeting = relationship("Meeting", back_populates="entries")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=_uuid)
    meeting_id = Column(String(36), ForeignKey("meetings.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False, default="")
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=True)
    quadrant = Column(String(64), nullable=True)
    priority = Column(String(64), nullable=False, default="routine")
    assignee = Column(String(128), nullable=True)
    due_date = Column(String(32), nullable=True)
    deadline = Column(String(32), nullable=True)
    status = Column(String(32), nullable=False, default="pending")
    is_overdue = Column(Boolean, default=False, nullable=False)
    is_ai_suggestion = Column(Boolean, default=False, nullable=False)
    source_item_id = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    meeting = relationship("Meeting", back_populates="tasks")
    feedbacks = relationship("Feedback", back_populates="task", cascade="all, delete-orphan")


class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(String(36), primary_key=True, default=_uuid)
    meeting_id = Column(String(36), ForeignKey("meetings.id"), nullable=True, index=True)
    task_id = Column(String(36), ForeignKey("tasks.id"), nullable=True, index=True)
    feedback_type = Column(String(64), nullable=False, default="general")
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    meeting = relationship("Meeting", back_populates="feedbacks")
    task = relationship("Task", back_populates="feedbacks")

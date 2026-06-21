import os
from pathlib import Path

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{DATA_DIR / 'meeting_assistant.db'}",
)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _ensure_schema():
    """开发环境：旧表结构缺少必要字段时重建或补列。"""
    inspector = inspect(engine)
    if not inspector.has_table("meetings"):
        return
    columns = {col["name"] for col in inspector.get_columns("meetings")}
    if "file_name" not in columns:
        Base.metadata.drop_all(bind=engine)
        return
    if "summary" not in columns:
        from sqlalchemy import text

        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE meetings ADD COLUMN summary TEXT"))

    if inspector.has_table("tasks"):
        task_columns = {col["name"] for col in inspector.get_columns("tasks")}
        from sqlalchemy import text

        migrations = [
            ("title", "ALTER TABLE tasks ADD COLUMN title VARCHAR(255) DEFAULT ''"),
            ("description", "ALTER TABLE tasks ADD COLUMN description TEXT"),
            ("due_date", "ALTER TABLE tasks ADD COLUMN due_date VARCHAR(32)"),
        ]
        with engine.begin() as conn:
            for col_name, sql in migrations:
                if col_name not in task_columns:
                    conn.execute(text(sql))
            if "content" in task_columns:
                conn.execute(
                    text(
                        "UPDATE tasks SET description = content "
                        "WHERE description IS NULL AND content IS NOT NULL"
                    )
                )
                conn.execute(
                    text(
                        "UPDATE tasks SET title = substr(content, 1, 50) "
                        "WHERE (title IS NULL OR title = '') AND content IS NOT NULL"
                    )
                )
            if "deadline" in task_columns:
                conn.execute(
                    text(
                        "UPDATE tasks SET due_date = deadline "
                        "WHERE due_date IS NULL AND deadline IS NOT NULL"
                    )
                )
            if "quadrant" in task_columns:
                conn.execute(
                    text(
                        "UPDATE tasks SET priority = quadrant "
                        "WHERE quadrant IS NOT NULL AND "
                        "(priority IS NULL OR priority IN ('high', 'medium', 'low'))"
                    )
                )


def init_db():
    from app.models.meeting import Feedback, Meeting, MeetingEntry, Task  # noqa: F401

    _ensure_schema()
    Base.metadata.create_all(bind=engine)

import json
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.meeting import Meeting, MeetingEntry, Task

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB
ALLOWED_EXTENSIONS = {".mp3", ".wav", ".m4a"}

MOCK_TRANSCRIPT = [
    {
        "id": "s1",
        "speaker": "张三",
        "content": "大家好，今天我们讨论一下Q1的产品规划。首先我想确认一下新功能的优先级。",
        "timestamp": "00:02:15",
    },
    {
        "id": "s2",
        "speaker": "李四",
        "content": "我觉得用户反馈最多的搜索功能应该优先做，这个已经拖了两个月了。",
        "timestamp": "00:02:48",
    },
    {
        "id": "s3",
        "speaker": "王五",
        "content": "我同意，但是技术架构重构也很重要，不然后续开发会很慢。",
        "timestamp": "00:03:12",
    },
    {
        "id": "s4",
        "speaker": "张三",
        "content": "那我们先定下来，搜索功能作为P0优先级，架构重构作为P1。",
        "timestamp": "00:03:45",
    },
    {
        "id": "s5",
        "speaker": "李四",
        "content": "好的，我来负责搜索功能的需求文档，预计下周完成。",
        "timestamp": "00:04:02",
    },
    {
        "id": "s6",
        "speaker": "王五",
        "content": "那我这边开始准备技术方案，需要两周时间。",
        "timestamp": "00:04:28",
    },
    {
        "id": "s7",
        "speaker": "张三",
        "content": "另外，关于UI改版的问题，设计团队说需要更多时间。",
        "timestamp": "00:05:10",
    },
    {
        "id": "s8",
        "speaker": "李四",
        "content": "那我们延期到3月中旬吧，先保证核心功能上线。",
        "timestamp": "00:05:35",
    },
]

MOCK_TRANSCRIPT_TEXT = """张三：大家好，今天我们讨论一下Q1的产品规划。首先我想确认一下新功能的优先级。
李四：我觉得用户反馈最多的搜索功能应该优先做，这个已经拖了两个月了。
王五：我同意，但是技术架构重构也很重要，不然后续开发会很慢。
张三：那我们先定下来，搜索功能作为P0优先级，架构重构作为P1。
李四：好的，我来负责搜索功能的需求文档，预计下周完成。
王五：那我这边开始准备技术方案，需要两周时间。
张三：另外，关于UI改版的问题，设计团队说需要更多时间。
李四：那我们延期到3月中旬吧，先保证核心功能上线。"""

MOCK_STRUCTURED_ITEMS = [
    {
        "id": "1",
        "type": "decision",
        "content": "搜索功能作为P0优先级，架构重构作为P1",
        "confirmed": False,
        "sourceSegmentIds": ["s4"],
    },
    {
        "id": "2",
        "type": "assignment",
        "content": "李四负责搜索功能的需求文档，预计下周完成",
        "confirmed": False,
        "sourceSegmentIds": ["s5"],
    },
    {
        "id": "3",
        "type": "assignment",
        "content": "王五负责准备技术方案，需要两周时间",
        "confirmed": False,
        "sourceSegmentIds": ["s6"],
    },
    {
        "id": "4",
        "type": "issue",
        "content": "UI改版需要更多时间，设计团队反馈周期不足",
        "confirmed": False,
        "sourceSegmentIds": ["s7"],
    },
    {
        "id": "5",
        "type": "decision",
        "content": "UI改版延期至3月中旬，优先保证核心功能上线",
        "confirmed": False,
        "sourceSegmentIds": ["s8"],
    },
]

MOCK_EXTRACTED_TASKS = [
    {
        "title": "修复搜索功能核心 bug",
        "description": "修复搜索功能的核心bug，影响用户正常使用",
        "priority": "urgent-important",
        "assignee": "李四",
        "due_date": "2024-01-20",
        "is_ai_suggestion": False,
        "source_item_id": "1",
    },
    {
        "title": "完成Q1产品规划文档",
        "description": "完成Q1产品规划文档",
        "priority": "important-not-urgent",
        "assignee": "张三",
        "due_date": "2024-02-01",
        "is_ai_suggestion": False,
        "source_item_id": "1",
    },
    {
        "title": "搜索功能需求文档",
        "description": "李四负责搜索功能需求文档，预计下周完成",
        "priority": "important-not-urgent",
        "assignee": "李四",
        "due_date": "2024-01-22",
        "is_ai_suggestion": True,
        "source_item_id": "2",
    },
    {
        "title": "技术方案设计",
        "description": "王五准备技术方案，需要两周时间",
        "priority": "important-not-urgent",
        "assignee": "王五",
        "due_date": "2024-01-29",
        "is_ai_suggestion": True,
        "source_item_id": "3",
    },
    {
        "title": "协调运维解决测试环境",
        "description": "协调运维团队解决测试环境部署失败问题",
        "priority": "urgent-important",
        "assignee": "张三",
        "due_date": "2024-01-18",
        "is_ai_suggestion": True,
        "source_item_id": "5",
    },
]

QUADRANT_VALUES = {
    "urgent-important",
    "important-not-urgent",
    "urgent-not-important",
    "routine",
}

PARTICIPANT_NAMES = ["张三", "李四", "王五", "赵六"]

TEST_MEETING_ID = "test_001"
TEST_MEETING_2_ID = "test_002"
TEST_MEETING_3_ID = "test_003"
SEED_MEETING_IDS = (TEST_MEETING_ID, TEST_MEETING_2_ID, TEST_MEETING_3_ID)


def _items_with_confirmed(items: list[dict], confirmed_ids: set[str]) -> list[dict]:
    return [
        {**item, "confirmed": str(item.get("id", "")) in confirmed_ids}
        for item in items
    ]


MOCK_Q1_ITEMS = _items_with_confirmed(
    [
        *MOCK_STRUCTURED_ITEMS,
        {
            "id": "6",
            "type": "todo",
            "content": "还有别的测试-要给测试时间",
            "sourceSegmentIds": [],
        },
    ],
    {"1", "2", "3", "4", "5", "6"},
)

MOCK_TEST2_ITEMS = _items_with_confirmed(MOCK_STRUCTURED_ITEMS, {"1", "2", "3", "4", "5"})

MOCK_TEST3_ITEMS = _items_with_confirmed(
    [
        {
            "id": "1",
            "type": "decision",
            "content": "test项目采用分阶段交付策略",
            "sourceSegmentIds": ["s4"],
        },
        {
            "id": "2",
            "type": "issue",
            "content": "test环境资源不足，需扩容",
            "sourceSegmentIds": ["s7"],
        },
        {
            "id": "3",
            "type": "todo",
            "content": "完成test用例编写与评审",
            "sourceSegmentIds": [],
        },
    ],
    {"1", "2", "3"},
)

SEED_MOCK_TASKS: dict[str, list[dict]] = {
    TEST_MEETING_ID: [
        {
            "title": "落实决策：搜索功能作为P0优先级",
            "description": "落实决策：搜索功能作为P0优先级，架构重构作为P1",
            "priority": "important-not-urgent",
            "assignee": "待指派",
            "due_date": "2024-02-01",
            "is_ai_suggestion": True,
            "source_item_id": "seed-q1-1",
        },
        {
            "title": "搜索功能需求文档",
            "description": "李四负责搜索功能需求文档，预计下周完成",
            "priority": "important-not-urgent",
            "assignee": "李四",
            "due_date": "2024-01-22",
            "is_ai_suggestion": True,
            "source_item_id": "seed-q1-2",
        },
        {
            "title": "技术方案设计",
            "description": "王五准备技术方案，需要两周时间",
            "priority": "important-not-urgent",
            "assignee": "王五",
            "due_date": "2024-01-29",
            "is_ai_suggestion": True,
            "source_item_id": "seed-q1-3",
        },
        {
            "title": "跟进问题：UI改版需要更多时间",
            "description": "跟进问题：UI改版需要更多时间，设计团队反馈周期不足",
            "priority": "urgent-important",
            "assignee": "待指派",
            "due_date": "2024-01-25",
            "is_ai_suggestion": True,
            "source_item_id": "seed-q1-4",
        },
        {
            "title": "落实决策：UI改版延期至3月中旬",
            "description": "落实决策：UI改版延期至3月中旬，优先保证核心功能上线",
            "priority": "important-not-urgent",
            "assignee": "待指派",
            "due_date": "2024-03-15",
            "is_ai_suggestion": True,
            "source_item_id": "seed-q1-5",
        },
        {
            "title": "测试排期确认",
            "description": "还有别的测试-要给测试时间",
            "priority": "routine",
            "assignee": "待指派",
            "due_date": "2024-02-05",
            "is_ai_suggestion": True,
            "source_item_id": "seed-q1-6",
        },
    ],
    TEST_MEETING_2_ID: [
        {
            "title": "落实决策：搜索功能作为P0优先级",
            "description": "落实决策：搜索功能作为P0优先级，架构重构作为P1",
            "priority": "important-not-urgent",
            "assignee": "待指派",
            "due_date": "2024-02-01",
            "is_ai_suggestion": True,
            "source_item_id": "seed-t2-1",
        },
        {
            "title": "搜索功能需求文档",
            "description": "李四负责搜索功能的需求文档，预计下周完成",
            "priority": "important-not-urgent",
            "assignee": "李四",
            "due_date": "2024-01-22",
            "is_ai_suggestion": True,
            "source_item_id": "seed-t2-2",
        },
        {
            "title": "技术方案设计",
            "description": "王五负责准备技术方案，需要两周时间",
            "priority": "important-not-urgent",
            "assignee": "王五",
            "due_date": "2024-01-29",
            "is_ai_suggestion": True,
            "source_item_id": "seed-t2-3",
        },
        {
            "title": "跟进问题：UI改版需要更多时间",
            "description": "跟进问题：UI改版需要更多时间，设计团队反馈周期不足",
            "priority": "urgent-important",
            "assignee": "待指派",
            "due_date": "2024-01-25",
            "is_ai_suggestion": True,
            "source_item_id": "seed-t2-4",
        },
        {
            "title": "落实决策：UI改版延期至3月中旬",
            "description": "落实决策：UI改版延期至3月中旬，优先保证核心功能上线",
            "priority": "important-not-urgent",
            "assignee": "待指派",
            "due_date": "2024-03-15",
            "is_ai_suggestion": True,
            "source_item_id": "seed-t2-5",
        },
    ],
    TEST_MEETING_3_ID: [
        {
            "title": "跟进问题：test环境资源不足",
            "description": "跟进问题：test环境资源不足，需扩容",
            "priority": "urgent-important",
            "assignee": "待指派",
            "due_date": "2024-01-25",
            "is_ai_suggestion": True,
            "source_item_id": "seed-t3-1",
        },
        {
            "title": "完成test用例编写与评审",
            "description": "完成test用例编写与评审",
            "priority": "routine",
            "assignee": "待指派",
            "due_date": "2024-02-01",
            "is_ai_suggestion": True,
            "source_item_id": "seed-t3-2",
        },
        {
            "title": "落实决策：test项目采用分阶段交付策略",
            "description": "落实决策：test项目采用分阶段交付策略",
            "priority": "important-not-urgent",
            "assignee": "待指派",
            "due_date": "2024-02-10",
            "is_ai_suggestion": True,
            "source_item_id": "seed-t3-3",
        },
    ],
}

SCENARIO_LABELS = {
    "project-progress": "项目进展",
    "weekly-report": "周报",
    "monthly-report": "月报",
    "quarterly-review": "季度复盘",
    "incident-report": "事故报告",
}

AUDIENCE_LABELS = {
    "direct-manager": "直属上级",
    "team": "团队成员",
    "executive": "高层管理",
    "client": "客户",
}

STYLE_LABELS = {
    "concise": "简洁型",
    "data-driven": "数据型",
    "storytelling": "故事型",
}


def _entry_to_dict(entry: MeetingEntry) -> dict:
    source_ids = json.loads(entry.source_segment_ids or "[]")
    return {
        "id": entry.id,
        "type": entry.entry_type,
        "content": entry.content,
        "confirmed": entry.is_confirmed,
        "sourceSegmentIds": source_ids,
        "manually_edited": entry.manually_edited,
    }


def _stable_entry_id(meeting_id: str, item: dict) -> str:
    raw_id = str(item.get("id") or "")
    if len(raw_id) >= 32:
        return raw_id
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"{meeting_id}:{raw_id}"))


def _dict_to_entry(meeting_id: str, item: dict) -> MeetingEntry:
    source_ids = item.get("sourceSegmentIds") or item.get("source_segment_ids") or []
    entry_id = _stable_entry_id(meeting_id, item)
    return MeetingEntry(
        id=entry_id,
        meeting_id=meeting_id,
        entry_type=item.get("type", "todo"),
        content=item.get("content", ""),
        is_confirmed=bool(item.get("confirmed", False)),
        source_segment_ids=json.dumps(source_ids, ensure_ascii=False),
        manually_edited=bool(item.get("manually_edited", False)),
    )


def _get_entries_for_meeting(db: Session, meeting_id: str) -> list[MeetingEntry]:
    return (
        db.query(MeetingEntry)
        .filter(MeetingEntry.meeting_id == meeting_id)
        .order_by(MeetingEntry.created_at)
        .all()
    )


def _migrate_summary_json_to_entries(db: Session, meeting: Meeting) -> list[MeetingEntry]:
    if not meeting.summary_json:
        return []
    existing = _get_entries_for_meeting(db, meeting.id)
    if existing:
        return existing
    items = json.loads(meeting.summary_json)
    entries = [_dict_to_entry(meeting.id, item) for item in items]
    for entry in entries:
        db.add(entry)
    db.commit()
    return entries


def _save_entries_from_items(
    db: Session,
    meeting: Meeting,
    items: list[dict],
    raw_summary: str | None = None,
) -> list[MeetingEntry]:
    """按 meeting 维度 upsert 纪要条目，不影响其他会议。"""
    try:
        existing_by_id = {e.id: e for e in _get_entries_for_meeting(db, meeting.id)}
        seen_ids: set[str] = set()
        saved: list[MeetingEntry] = []

        for item in items:
            entry = _dict_to_entry(meeting.id, item)
            seen_ids.add(entry.id)
            if entry.id in existing_by_id:
                row = existing_by_id[entry.id]
                row.entry_type = entry.entry_type
                row.content = entry.content
                row.is_confirmed = entry.is_confirmed
                row.source_segment_ids = entry.source_segment_ids
                row.manually_edited = entry.manually_edited
                saved.append(row)
            else:
                db.add(entry)
                saved.append(entry)

        for entry_id, row in existing_by_id.items():
            if entry_id not in seen_ids:
                db.delete(row)

        if raw_summary:
            meeting.summary = raw_summary
        meeting.summary_json = json.dumps(items, ensure_ascii=False)
        db.commit()
        return saved
    except Exception:
        db.rollback()
        raise


def _fallback_summary_dict(meeting: Meeting, source: str = "fallback") -> dict:
    """DeepSeek 或数据库异常时的 Mock 兜底响应，不抛错。"""
    participants = json.loads(meeting.participants_json or "[]")
    return {
        "meeting_id": meeting.id,
        "meeting_info": {
            "title": meeting.title or meeting.file_name,
            "date": meeting.upload_time.strftime("%Y-%m-%d %H:%M"),
            "participants": participants or ["张三", "李四", "王五"],
        },
        "transcript_segments": MOCK_TRANSCRIPT,
        "structured_items": MOCK_STRUCTURED_ITEMS,
        "status": "completed",
        "summary_generated": True,
        "generation_source": source,
    }


def _make_task_title(content: str, max_len: int = 50) -> str:
    text = content.strip()
    if len(text) <= max_len:
        return text
    return text[: max_len - 1] + "…"


def _parse_assignee_from_content(content: str) -> str | None:
    for name in PARTICIPANT_NAMES:
        if name in content:
            return name
    return None


def _infer_priority_from_entry(entry_type: str, content: str) -> str:
    urgent_keywords = ["紧急", "立即", "尽快", "今天", "本周", "部署失败", "不稳定", "bug", "告警"]
    important_keywords = ["P0", "P1", "核心", "重要", "优先", "负责"]

    is_urgent = any(keyword in content for keyword in urgent_keywords)
    is_important = entry_type == "assignment" or any(keyword in content for keyword in important_keywords)

    if is_urgent and is_important:
        return "urgent-important"
    if is_important:
        return "important-not-urgent"
    if is_urgent:
        return "urgent-not-important"
    return "routine"


def _normalize_quadrant(value: str | None) -> str:
    if value in QUADRANT_VALUES:
        return value
    if value in {"high", "urgent"}:
        return "urgent-important"
    if value in {"medium"}:
        return "important-not-urgent"
    if value in {"low"}:
        return "routine"
    return "routine"


def _check_overdue(due_date: str | None) -> bool:
    if not due_date:
        return False
    try:
        due = datetime.strptime(due_date[:10], "%Y-%m-%d").date()
        return due < datetime.utcnow().date()
    except ValueError:
        return False


def _task_to_dict(task: Task) -> dict:
    description = task.description or task.content or ""
    title = task.title or _make_task_title(description)
    due_date = task.due_date or task.deadline
    priority = _normalize_quadrant(task.priority or task.quadrant)
    return {
        "id": task.id,
        "meeting_id": task.meeting_id,
        "title": title,
        "description": description,
        "priority": priority,
        "assignee": task.assignee,
        "due_date": due_date,
        "status": task.status,
        "is_overdue": _check_overdue(due_date) if due_date else task.is_overdue,
        "is_ai_suggestion": task.is_ai_suggestion,
        "source_item_id": task.source_item_id,
    }


def _format_task_from_entry(entry: MeetingEntry) -> tuple[str, str, str]:
    """根据纪要条目类型生成任务标题、描述与责任人。"""
    content = entry.content.strip()
    if entry.entry_type == "decision":
        description = f"落实决策：{content}"
        return _make_task_title(description), description, "待指派"
    if entry.entry_type == "issue":
        description = f"跟进问题：{content}"
        return _make_task_title(description), description, "待指派"
    assignee = _parse_assignee_from_content(content) or "待指派"
    return _make_task_title(content), content, assignee


TASK_ENTRY_TYPES = ("todo", "assignment", "decision", "issue")


def _create_task_from_entry(db: Session, meeting_id: str, entry: MeetingEntry) -> Task:
    priority = _infer_priority_from_entry(entry.entry_type, entry.content)
    title, description, assignee = _format_task_from_entry(entry)
    task = Task(
        meeting_id=meeting_id,
        title=title,
        description=description,
        content=description,
        priority=priority,
        quadrant=priority,
        assignee=assignee,
        status="pending",
        is_overdue=False,
        is_ai_suggestion=True,
        source_item_id=entry.id,
    )
    db.add(task)
    return task


def _create_task_from_mock(db: Session, meeting_id: str, item: dict) -> Task:
    description = item.get("description") or item.get("content", "")
    priority = _normalize_quadrant(item.get("priority") or item.get("quadrant"))
    due_date = item.get("due_date") or item.get("deadline")
    task = Task(
        meeting_id=meeting_id,
        title=item.get("title") or _make_task_title(description),
        description=description,
        content=description,
        priority=priority,
        quadrant=priority,
        assignee=item.get("assignee"),
        due_date=due_date,
        deadline=due_date,
        status="pending",
        is_overdue=_check_overdue(due_date),
        is_ai_suggestion=item.get("is_ai_suggestion", False),
        source_item_id=item.get("source_item_id"),
    )
    db.add(task)
    return task


def sync_tasks_from_confirmed_entries(db: Session, meeting_id: str) -> list[Task]:
    """从已确认的纪要条目同步任务，保留用户已调整的优先级与截止日期。"""
    entries = _get_entries_for_meeting(db, meeting_id)
    task_entries = [
        entry
        for entry in entries
        if entry.is_confirmed and entry.entry_type in TASK_ENTRY_TYPES
    ]

    existing_tasks = (
        db.query(Task)
        .filter(Task.meeting_id == meeting_id)
        .all()
    )
    by_source = {task.source_item_id: task for task in existing_tasks if task.source_item_id}
    active_source_ids = {entry.id for entry in task_entries}
    result: list[Task] = []

    for entry in task_entries:
        title, description, assignee = _format_task_from_entry(entry)
        if entry.id in by_source:
            task = by_source[entry.id]
            task.title = title
            task.description = description
            task.content = description
            if entry.entry_type in ("decision", "issue"):
                task.assignee = "待指派"
            elif not task.assignee or task.assignee == "待指派":
                task.assignee = assignee
            result.append(task)
        else:
            result.append(_create_task_from_entry(db, meeting_id, entry))

    for task in existing_tasks:
        if task.source_item_id and task.source_item_id not in active_source_ids:
            db.delete(task)

    db.commit()
    for task in result:
        db.refresh(task)
    return result


def extract_tasks_from_entries(db: Session, meeting_id: str) -> list[Task]:
    return sync_tasks_from_confirmed_entries(db, meeting_id)


@dataclass
class FileValidationResult:
    valid: bool
    file_format: str
    file_size: int
    error: str | None = None


def get_file_extension(filename: str) -> str:
    if "." not in filename:
        return ""
    return "." + filename.rsplit(".", 1)[-1].lower()


def validate_audio_file(filename: str, content: bytes) -> FileValidationResult:
    file_format = get_file_extension(filename)
    file_size = len(content)

    if not file_format:
        return FileValidationResult(
            valid=False,
            file_format="",
            file_size=file_size,
            error="无法识别文件格式",
        )

    if file_format not in ALLOWED_EXTENSIONS:
        return FileValidationResult(
            valid=False,
            file_format=file_format.lstrip("."),
            file_size=file_size,
            error="请上传 MP3、WAV 或 M4A 格式文件",
        )

    if file_size == 0:
        return FileValidationResult(
            valid=False,
            file_format=file_format.lstrip("."),
            file_size=0,
            error="文件内容为空",
        )

    if file_size > MAX_FILE_SIZE:
        return FileValidationResult(
            valid=False,
            file_format=file_format.lstrip("."),
            file_size=file_size,
            error="文件超过 500MB，请压缩后重试",
        )

    return FileValidationResult(
        valid=True,
        file_format=file_format.lstrip("."),
        file_size=file_size,
    )


def save_audio_file(filename: str, content: bytes) -> Path:
    safe_name = filename.replace(" ", "_")
    file_path = UPLOAD_DIR / f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{safe_name}"
    file_path.write_bytes(content)
    return file_path


def _sync_mock_transcript(meeting: Meeting, *, force: bool = False) -> None:
    """写入默认转写文本；已有转写时不覆盖。"""
    if not force and meeting.transcript_json:
        return
    meeting.transcript_json = json.dumps(MOCK_TRANSCRIPT, ensure_ascii=False)
    if not meeting.participants_json:
        meeting.participants_json = json.dumps(["张三", "李四", "王五"], ensure_ascii=False)
    if not meeting.title:
        meeting.title = Path(meeting.file_name).stem or "Q1产品规划会"


def _apply_mock_transcript(meeting: Meeting) -> None:
    """模拟 ASR 转写，后续替换为真实 ASR API。"""
    meeting.title = Path(meeting.file_name).stem or "未命名会议"
    _sync_mock_transcript(meeting)
    meeting.summary_json = None
    meeting.status = "transcribed"


def _apply_mock_analysis(meeting: Meeting) -> None:
    """兼容旧逻辑：转写 + Mock 纪要（无 DeepSeek 时使用）。"""
    _apply_mock_transcript(meeting)
    meeting.summary_json = json.dumps(MOCK_STRUCTURED_ITEMS, ensure_ascii=False)
    meeting.status = "completed"


def import_meeting_audio(
    db: Session,
    filename: str,
    content: bytes,
    title: str | None = None,
) -> tuple[Meeting, FileValidationResult]:
    validation = validate_audio_file(filename, content)
    if not validation.valid:
        raise ValueError(validation.error or "文件校验失败")

    file_path = save_audio_file(filename, content)
    meeting = Meeting(
        file_name=filename,
        file_path=str(file_path),
        file_size=validation.file_size,
        upload_time=datetime.utcnow(),
        status="processing",
        title=title or Path(filename).stem or "未命名会议",
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    _apply_mock_transcript(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting, validation


def _apply_transcript_variant(meeting: Meeting, label: str) -> None:
    segments = [dict(seg) for seg in MOCK_TRANSCRIPT]
    if segments:
        segments[0]["content"] = f"【{label}】{segments[0]['content']}"
    meeting.transcript_json = json.dumps(segments, ensure_ascii=False)
    if not meeting.participants_json:
        meeting.participants_json = json.dumps(["张三", "李四", "王五"], ensure_ascii=False)


def _seed_meeting_if_needed(
    db: Session,
    meeting_id: str,
    title: str,
    file_name: str,
    items: list[dict],
    *,
    upload_time: datetime | None = None,
    transcript_label: str | None = None,
) -> Meeting:
    """插入种子会议（固定 ID），已有数据时不覆盖用户内容。"""
    is_seed = meeting_id in SEED_MEETING_IDS
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        meeting = Meeting(
            id=meeting_id,
            file_name=file_name,
            file_path=f"mock/{file_name}",
            file_size=0,
            upload_time=upload_time or datetime.utcnow(),
            status="completed",
            title=title,
        )
        if transcript_label:
            _apply_transcript_variant(meeting, transcript_label)
        else:
            _sync_mock_transcript(meeting, force=True)
        db.add(meeting)
        db.flush()

    if not meeting.transcript_json:
        if transcript_label:
            _apply_transcript_variant(meeting, transcript_label)
        else:
            _sync_mock_transcript(meeting, force=True)

    entries = _get_entries_for_meeting(db, meeting_id)
    expected_count = len(items)

    if is_seed:
        for entry in entries:
            db.delete(entry)
        db.flush()
        for item in items:
            db.add(_dict_to_entry(meeting_id, item))
        meeting.summary_json = json.dumps(items, ensure_ascii=False)
        meeting.status = "completed"
        meeting.title = title
        if transcript_label:
            _apply_transcript_variant(meeting, transcript_label)
    elif not entries:
        for item in items:
            db.add(_dict_to_entry(meeting_id, item))
        meeting.summary_json = json.dumps(items, ensure_ascii=False)
        meeting.status = "completed"
    elif len(entries) != expected_count:
        for entry in entries:
            db.delete(entry)
        db.flush()
        for item in items:
            db.add(_dict_to_entry(meeting_id, item))
        meeting.summary_json = json.dumps(items, ensure_ascii=False)

    db.commit()
    db.refresh(meeting)
    return meeting


def _ensure_seed_tasks(db: Session, meeting_id: str, min_count: int = 2) -> None:
    """确保种子会议至少有 min_count 条任务（tasks 表为空时写入 Mock 数据）。"""
    count = db.query(Task).filter(Task.meeting_id == meeting_id).count()
    if count >= min_count:
        return
    for item in SEED_MOCK_TASKS.get(meeting_id, []):
        description = item.get("description") or item.get("content", "")
        exists = (
            db.query(Task)
            .filter(Task.meeting_id == meeting_id, Task.description == description)
            .first()
        )
        if not exists:
            _create_task_from_mock(db, meeting_id, item)
    db.commit()


def ensure_seed_mock_tasks_if_empty(db: Session) -> None:
    """tasks 表完全为空时，为三个测试会议写入 Mock 任务。"""
    if db.query(Task).count() > 0:
        return
    for meeting_id in SEED_MEETING_IDS:
        for item in SEED_MOCK_TASKS.get(meeting_id, []):
            _create_task_from_mock(db, meeting_id, item)
    db.commit()


def _seed_file_names(db: Session) -> set[str]:
    return {
        m.file_name
        for m in db.query(Meeting).filter(Meeting.id.in_(SEED_MEETING_IDS)).all()
    }


def _task_count_for_meeting(db: Session, meeting_id: str) -> int:
    return db.query(Task).filter(Task.meeting_id == meeting_id).count()


def _is_duplicate_orphan(db: Session, meeting: Meeting) -> bool:
    """非种子、无任务、且与种子会议文件/标题冲突的上传重复会议。"""
    if meeting.id in SEED_MEETING_IDS:
        return False
    if _task_count_for_meeting(db, meeting.id) > 0:
        return False
    seed_files = _seed_file_names(db)
    seed_titles = {
        m.title
        for m in db.query(Meeting).filter(Meeting.id.in_(SEED_MEETING_IDS)).all()
    }
    if meeting.file_name in seed_files:
        return True
    if meeting.title in seed_titles:
        return True
    return meeting.title == "test" and meeting.file_name == "test.wav"


def _structured_items_for_display(
    db: Session,
    meeting: Meeting,
    entries: list[MeetingEntry],
) -> list[dict]:
    """以 tasks 表为准：无任务则不展示纪要；有任务则展示与任务关联的条目。"""
    task_count = _task_count_for_meeting(db, meeting.id)
    if task_count == 0:
        if _is_duplicate_orphan(db, meeting):
            return []
        return [_entry_to_dict(e) for e in entries]

    if meeting.id in SEED_MEETING_IDS:
        return [_entry_to_dict(e) for e in entries]

    tasks = db.query(Task).filter(Task.meeting_id == meeting.id).all()
    source_ids = {t.source_item_id for t in tasks if t.source_item_id}
    if source_ids and entries:
        matched = [_entry_to_dict(e) for e in entries if e.id in source_ids]
        if matched:
            return matched
    return [_entry_to_dict(e) for e in entries[:task_count]]


def cleanup_orphan_upload_meetings(db: Session) -> int:
    """删除与种子会议冲突、且无任何任务的上传重复会议。"""
    removed = 0
    uploads = db.query(Meeting).filter(~Meeting.id.in_(SEED_MEETING_IDS)).all()
    for meeting in uploads:
        if _is_duplicate_orphan(db, meeting):
            db.delete(meeting)
            removed += 1
    if removed:
        db.commit()
    return removed


def cleanup_duplicate_upload_meetings(db: Session) -> int:
    """兼容旧调用。"""
    return cleanup_orphan_upload_meetings(db)


def ensure_seed_meetings(db: Session) -> list[Meeting]:
    """确保三个演示会议存在，并同步各自任务。"""
    now = datetime.utcnow()
    q1 = _seed_meeting_if_needed(
        db,
        TEST_MEETING_ID,
        "Q1产品规划会",
        "q1_planning.wav",
        MOCK_Q1_ITEMS,
        upload_time=now,
        transcript_label="Q1产品规划会",
    )
    test2 = _seed_meeting_if_needed(
        db,
        TEST_MEETING_2_ID,
        "test会议",
        "test_meeting.wav",
        MOCK_TEST2_ITEMS,
        upload_time=now - timedelta(hours=1),
        transcript_label="test会议",
    )
    test3 = _seed_meeting_if_needed(
        db,
        TEST_MEETING_3_ID,
        "test（演示）",
        "test.wav",
        MOCK_TEST3_ITEMS,
        upload_time=now - timedelta(hours=2),
        transcript_label="test（演示）",
    )
    meetings = [q1, test2, test3]
    seed_min_tasks = {
        TEST_MEETING_ID: 6,
        TEST_MEETING_2_ID: 5,
        TEST_MEETING_3_ID: 3,
    }
    for meeting in meetings:
        sync_tasks_from_confirmed_entries(db, meeting.id)
        _ensure_seed_tasks(db, meeting.id, min_count=seed_min_tasks.get(meeting.id, 2))
    ensure_seed_mock_tasks_if_empty(db)
    cleanup_orphan_upload_meetings(db)
    return meetings


def ensure_test_meeting(db: Session) -> Meeting:
    """兼容旧调用：返回 Q1 产品规划会种子会议。"""
    return ensure_seed_meetings(db)[0]


def list_recent_meetings(db: Session, limit: int = 10) -> list[dict]:
    meetings = (
        db.query(Meeting)
        .order_by(Meeting.upload_time.desc())
        .limit(limit)
        .all()
    )
    return [_meeting_list_item(db, m) for m in meetings]


def _meeting_list_item(db: Session, meeting: Meeting) -> dict:
    entry_count = len(_get_entries_for_meeting(db, meeting.id))
    task_count = _task_count_for_meeting(db, meeting.id)
    return {
        "meeting_id": meeting.id,
        "title": meeting.title or meeting.file_name,
        "file_name": meeting.file_name,
        "upload_time": meeting.upload_time.strftime("%Y-%m-%d %H:%M"),
        "status": meeting.status,
        "file_size": meeting.file_size,
        "task_count": task_count,
        "entry_count": entry_count,
        "is_seed": meeting.id in SEED_MEETING_IDS,
    }


def list_all_meetings(db: Session) -> list[dict]:
    cleanup_orphan_upload_meetings(db)
    meetings = (
        db.query(Meeting)
        .order_by(Meeting.upload_time.desc())
        .all()
    )
    return [
        _meeting_list_item(db, m)
        for m in meetings
        if not _is_duplicate_orphan(db, m)
    ]


def _get_transcript_segments(meeting: Meeting) -> list[dict]:
    if meeting.transcript_json:
        try:
            segments = json.loads(meeting.transcript_json)
            if isinstance(segments, list) and segments:
                return segments
        except json.JSONDecodeError:
            pass
    return MOCK_TRANSCRIPT


def get_summary(db: Session, meeting_id: str) -> dict | None:
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        return None

    participants = json.loads(meeting.participants_json or "[]")

    entries = _get_entries_for_meeting(db, meeting_id)
    if not entries and meeting.summary_json:
        entries = _migrate_summary_json_to_entries(db, meeting)

    structured_items = _structured_items_for_display(db, meeting, entries)
    task_count = _task_count_for_meeting(db, meeting_id)

    return {
        "meeting_id": meeting.id,
        "meeting_info": {
            "title": meeting.title or meeting.file_name,
            "date": meeting.upload_time.strftime("%Y-%m-%d %H:%M"),
            "participants": participants or ["张三", "李四", "王五"],
        },
        "transcript_segments": _get_transcript_segments(meeting),
        "structured_items": structured_items,
        "task_count": task_count,
        "status": meeting.status,
        "summary_generated": bool(entries or meeting.summary_json),
    }


async def get_or_generate_summary(db: Session, meeting_id: str) -> dict | None:
    import traceback

    from app.services.deepseek_service import generate_structured_summary

    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        return None

    try:
        if not meeting.transcript_json:
            _sync_mock_transcript(meeting)
            db.commit()

        entries = _get_entries_for_meeting(db, meeting_id)
        if not entries and meeting.summary_json:
            entries = _migrate_summary_json_to_entries(db, meeting)

        generation_source = "cached"
        if not entries:
            if _is_duplicate_orphan(db, meeting):
                return get_summary(db, meeting_id)

            meeting.status = "summarizing"
            db.commit()

            try:
                items, source, raw_summary = await generate_structured_summary(
                    MOCK_TRANSCRIPT,
                    fallback_items=MOCK_STRUCTURED_ITEMS,
                    transcript_text=MOCK_TRANSCRIPT_TEXT,
                )
            except Exception as deepseek_err:
                print(f"[WARN] DeepSeek 调用失败 meeting_id={meeting_id}: {deepseek_err}")
                traceback.print_exc()
                items = MOCK_STRUCTURED_ITEMS
                source = "fallback"
                raw_summary = None

            if not items:
                items = MOCK_STRUCTURED_ITEMS
                source = "fallback"

            try:
                _save_entries_from_items(db, meeting, items, raw_summary)
                meeting.status = "completed"
                db.commit()
                db.refresh(meeting)
            except Exception as save_err:
                print(f"[WARN] 纪要入库失败 meeting_id={meeting_id}: {save_err}")
                traceback.print_exc()
                db.rollback()
                return _fallback_summary_dict(meeting, source=source)

            generation_source = source

        summary = get_summary(db, meeting_id)
        if summary:
            summary["generation_source"] = generation_source
        return summary
    except Exception as exc:
        print(f"[ERROR] get_or_generate_summary meeting_id={meeting_id}: {exc}")
        traceback.print_exc()
        db.rollback()
        return _fallback_summary_dict(meeting)


def update_structured_summary(
    db: Session,
    meeting_id: str,
    structured_items: list[dict],
) -> dict | None:
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        return None

    _save_entries_from_items(db, meeting, structured_items)
    all_confirmed = all(item.get("confirmed") for item in structured_items) if structured_items else False
    meeting.status = "confirmed" if all_confirmed else "completed"
    db.commit()
    db.refresh(meeting)
    return get_summary(db, meeting_id)


def extract_tasks(db: Session, meeting_id: str) -> list[Task] | None:
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        return None

    entries = _get_entries_for_meeting(db, meeting_id)
    if not entries and meeting.summary_json:
        entries = _migrate_summary_json_to_entries(db, meeting)

    if entries:
        return sync_tasks_from_confirmed_entries(db, meeting_id)

    existing = db.query(Task).filter(Task.meeting_id == meeting_id).all()
    if existing:
        return existing

    created_tasks = [_create_task_from_mock(db, meeting_id, item) for item in MOCK_EXTRACTED_TASKS]
    db.commit()
    for task in created_tasks:
        db.refresh(task)
    return created_tasks


def generate_tasks_from_summary(db: Session, meeting_id: str) -> dict | None:
    """从智能纪要已确认条目生成任务并持久化写入 tasks 表。"""
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        return None

    entries = _get_entries_for_meeting(db, meeting_id)
    if not entries and meeting.summary_json:
        _migrate_summary_json_to_entries(db, meeting)

    sync_tasks_from_confirmed_entries(db, meeting_id)
    return get_meeting_tasks(db, meeting_id)


def get_meeting_tasks(db: Session, meeting_id: str) -> dict | None:
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        return None

    entries = _get_entries_for_meeting(db, meeting_id)
    if not entries and meeting.summary_json:
        entries = _migrate_summary_json_to_entries(db, meeting)

    if entries:
        tasks = sync_tasks_from_confirmed_entries(db, meeting_id)
    else:
        tasks = (
            db.query(Task)
            .filter(Task.meeting_id == meeting_id)
            .order_by(Task.created_at)
            .all()
        )
        if not tasks:
            tasks = extract_tasks(db, meeting_id) or []

    for task in tasks:
        due_date = task.due_date or task.deadline
        task.is_overdue = _check_overdue(due_date)
    db.commit()

    return {
        "meeting_id": meeting.id,
        "meeting_title": meeting.title or meeting.file_name,
        "tasks": [_task_to_dict(task) for task in tasks],
        "count": len(tasks),
    }


def update_meeting_tasks(
    db: Session,
    meeting_id: str,
    task_updates: list[dict],
) -> dict | None:
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        return None

    for item in task_updates:
        task = (
            db.query(Task)
            .filter(Task.id == item.get("id"), Task.meeting_id == meeting_id)
            .first()
        )
        if not task:
            continue

        if item.get("title") is not None:
            task.title = item["title"]
        if item.get("description") is not None:
            task.description = item["description"]
            task.content = item["description"]
        if item.get("priority") is not None:
            priority = _normalize_quadrant(item["priority"])
            task.priority = priority
            task.quadrant = priority
        if "assignee" in item:
            task.assignee = item["assignee"]
        if "due_date" in item:
            task.due_date = item["due_date"]
            task.deadline = item["due_date"]
            task.is_overdue = _check_overdue(item["due_date"])
        if item.get("status") is not None:
            task.status = item["status"]

        task.updated_at = datetime.utcnow()

    db.commit()
    return get_meeting_tasks(db, meeting_id)


def build_meeting_conclusions_text(db: Session, meeting_id: str) -> str | None:
    """从会议纪要条目中拼接原始结论文本。"""
    summary = get_summary(db, meeting_id)
    if not summary:
        return None

    type_labels = {
        "decision": "决策",
        "issue": "问题",
        "assignment": "分工",
        "todo": "待办",
    }
    items = summary.get("structured_items") or []
    confirmed = [item for item in items if item.get("confirmed")]
    use_items = confirmed or items
    if not use_items:
        return None

    lines = [f"会议：{summary['meeting_info']['title']}"]
    for item in use_items:
        label = type_labels.get(item.get("type", ""), "条目")
        lines.append(f"【{label}】{item.get('content', '')}")
    return "\n".join(lines)


def _mock_optimize_report(
    original_text: str,
    scenario: str,
    audience: str,
    style: str,
) -> dict:
    scenario_label = SCENARIO_LABELS.get(scenario, scenario)
    audience_label = AUDIENCE_LABELS.get(audience, audience)
    style_label = STYLE_LABELS.get(style, style)

    optimized_text = (
        f"【{scenario_label} · 面向{audience_label} · {style_label}】\n\n"
        "一、核心进展\n"
        "1. 经会议确认，Q1功能优先级已明确：搜索功能为P0，架构重构为P1。\n\n"
        "二、任务分工\n"
        "· 李四：搜索功能需求文档，交付时间 1月22日\n"
        "· 王五：技术方案设计，交付时间 1月29日\n\n"
        "三、风险与应对\n"
        "· UI改版存在延期风险，已调整至3月中旬，优先保障核心功能3月初上线\n\n"
        "四、下一步计划\n"
        "· 本周完成需求文档评审\n"
        "· 下周启动技术方案评审"
    )

    highlights = [
        {
            "type": "structure",
            "icon": "✏️",
            "label": "结构调整",
            "desc": "按「进展→分工→风险→计划」四段式重组",
        },
        {
            "type": "add",
            "icon": "➕",
            "label": "新增内容",
            "desc": "补充具体交付日期（1月22日、1月29日）",
        },
        {
            "type": "remove",
            "icon": "➖",
            "label": "删减内容",
            "desc": "去除口语赘词「我觉得」「已经拖了两个月」等",
        },
        {
            "type": "enhance",
            "icon": "🔄",
            "label": "语义强化",
            "desc": "「定下来」→「经会议确认」",
        },
    ]

    original_word_count = len(original_text)
    optimized_word_count = len(optimized_text)
    change_percent = (
        round((optimized_word_count - original_word_count) / original_word_count * 100)
        if original_word_count
        else 0
    )

    return {
        "optimized_text": optimized_text,
        "highlights": highlights,
        "original_word_count": original_word_count,
        "optimized_word_count": optimized_word_count,
        "change_percent": change_percent,
        "scenario": scenario,
        "audience": audience,
        "style": style,
        "generation_source": "mock",
    }


async def optimize_report(
    original_text: str,
    scenario: str,
    audience: str,
    style: str,
) -> dict:
    from app.services.deepseek_service import optimize_report_with_deepseek

    optimized_text, highlights, source = await optimize_report_with_deepseek(
        original_text=original_text,
        scenario=scenario,
        audience=audience,
        style=style,
        scenario_labels=SCENARIO_LABELS,
        audience_labels=AUDIENCE_LABELS,
        style_labels=STYLE_LABELS,
    )

    if not optimized_text:
        return _mock_optimize_report(original_text, scenario, audience, style)

    original_word_count = len(original_text)
    optimized_word_count = len(optimized_text)
    change_percent = (
        round((optimized_word_count - original_word_count) / original_word_count * 100)
        if original_word_count
        else 0
    )

    return {
        "optimized_text": optimized_text,
        "highlights": highlights,
        "original_word_count": original_word_count,
        "optimized_word_count": optimized_word_count,
        "change_percent": change_percent,
        "scenario": scenario,
        "audience": audience,
        "style": style,
        "generation_source": source,
    }


def get_task_center(db: Session, status_filter: str | None = None) -> list[dict]:
    query = db.query(Task, Meeting).join(Meeting, Task.meeting_id == Meeting.id)
    if status_filter and status_filter != "all":
        query = query.filter(Task.status == status_filter)

    results = query.order_by(Meeting.upload_time.desc(), Task.created_at.desc()).all()
    tasks: list[dict] = []
    for task, meeting in results:
        task_dict = _task_to_dict(task)
        tasks.append(
            {
                **task_dict,
                "content": task_dict["description"],
                "meeting_name": meeting.title or meeting.file_name,
                "meeting_date": meeting.upload_time.strftime("%Y-%m-%d"),
                "deadline": task_dict["due_date"],
                "quadrant": task_dict["priority"],
            }
        )
    return tasks


def update_task_status(db: Session, task_id: str, status: str) -> dict | None:
    valid_statuses = {"pending", "completed", "postponed", "rejected"}
    if status not in valid_statuses:
        raise ValueError(f"无效状态: {status}")

    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return None

    task.status = status
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)

    meeting = db.query(Meeting).filter(Meeting.id == task.meeting_id).first()
    task_dict = _task_to_dict(task)
    return {
        **task_dict,
        "content": task_dict["description"],
        "meeting_name": (meeting.title or meeting.file_name) if meeting else "",
        "meeting_date": meeting.upload_time.strftime("%Y-%m-%d") if meeting else "",
        "deadline": task_dict["due_date"],
        "quadrant": task_dict["priority"],
    }

from typing import Optional
import traceback

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.meeting_service import (
    build_meeting_conclusions_text,
    delete_meeting,
    ensure_test_meeting,
    generate_tasks_from_summary,
    get_meeting_tasks,
    get_or_generate_summary,
    get_summary,
    get_task_center,
    import_meeting_audio,
    list_all_meetings,
    list_recent_meetings,
    optimize_report,
    update_meeting_tasks,
    update_structured_summary,
    update_task_status,
)

router = APIRouter()


def _friendly_api_error(action: str, exc: Exception, *, status_code: int = 503) -> HTTPException:
    """将未预期异常转为可读错误，避免直接 500。"""
    message = str(exc).strip() or exc.__class__.__name__
    print(f"[ERROR] {action}: {message}")
    traceback.print_exc()
    return HTTPException(status_code=status_code, detail=f"{action}失败：{message}")


class ImportResponse(BaseModel):
    meeting_id: str
    file_name: str
    file_size: int
    file_format: str
    format_valid: bool
    status: str
    message: str = "音频上传成功"
    transcript_text: str = ""
    transcript_segments: list[dict] = Field(default_factory=list)
    transcription_source: str = "mock"


class TestMeetingResponse(BaseModel):
    meeting_id: str
    title: str
    status: str
    message: str = "测试会议已就绪"


class RecentMeetingItem(BaseModel):
    meeting_id: str
    file_name: str
    upload_time: str
    status: str
    file_size: int


class MeetingListItem(BaseModel):
    meeting_id: str
    title: str
    file_name: str
    upload_time: str
    status: str
    file_size: int
    task_count: int = 0
    entry_count: int = 0
    is_seed: bool = False


class DeleteMeetingResponse(BaseModel):
    meeting_id: str
    message: str = "会议已删除"


class ExtractTasksRequest(BaseModel):
    meeting_id: str = Field(..., description="会议 ID")


class TaskItem(BaseModel):
    id: str
    meeting_id: str
    title: str
    description: str
    priority: str
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    status: str
    is_overdue: bool = False
    is_ai_suggestion: bool = False
    source_item_id: Optional[str] = None


class MeetingTasksResponse(BaseModel):
    meeting_id: str
    meeting_title: str
    tasks: list[TaskItem]
    count: int


class TaskUpdateItem(BaseModel):
    id: str
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None


class UpdateTasksRequest(BaseModel):
    meeting_id: str = Field(..., description="会议 ID")
    tasks: list[TaskUpdateItem] = Field(..., description="待更新的任务列表")


class UpdateTaskStatusRequest(BaseModel):
    task_id: str = Field(..., description="任务 ID")
    status: str = Field(..., description="pending | completed | postponed | rejected")


class TaskCenterItem(BaseModel):
    id: str
    meeting_id: str
    title: str
    description: str
    content: str
    priority: str
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    deadline: Optional[str] = None
    status: str
    is_overdue: bool = False
    is_ai_suggestion: bool = False
    meeting_name: str
    meeting_date: str
    quadrant: Optional[str] = None


class TaskCenterResponse(BaseModel):
    tasks: list[TaskCenterItem]
    total: int
    pending_count: int
    completed_count: int
    postponed_count: int
    rejected_count: int


class ExtractTasksResponse(BaseModel):
    meeting_id: str
    tasks: list[TaskItem]
    count: int


class OptimizeReportRequest(BaseModel):
    original_text: str = Field(..., min_length=1, description="原始汇报文本")
    scenario: str = "project-progress"
    audience: str = "direct-manager"
    style: str = "concise"


class OptimizeReportResponse(BaseModel):
    optimized_text: str
    highlights: list[dict]
    original_word_count: int
    optimized_word_count: int
    change_percent: int
    scenario: str
    audience: str
    style: str
    generation_source: Optional[str] = None


@router.post("/test", response_model=TestMeetingResponse)
async def create_test_meeting(db: Session = Depends(get_db)):
    try:
        meeting = ensure_test_meeting(db)
        return TestMeetingResponse(
            meeting_id=meeting.id,
            title=meeting.title or "Q1产品规划会（测试）",
            status=meeting.status or "completed",
        )
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise _friendly_api_error("创建测试会议", exc) from exc


@router.post("/import", response_model=ImportResponse)
async def import_meeting(
    file: UploadFile = File(..., description="音频文件"),
    title: Optional[str] = Form(None, description="会议标题"),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="未提供文件名")

    content = await file.read()

    try:
        meeting, validation, transcript = import_meeting_audio(db, file.filename, content, title)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise _friendly_api_error("会议导入", exc) from exc

    source = transcript.get("source", "mock")
    real_transcription = source in {"whisper", "ffmpeg-whisper"}
    if real_transcription:
        message = "音频上传成功，转写完成"
    else:
        error_hint = transcript.get("error")
        message = "音频上传成功，转写完成（演示数据）"
        if error_hint:
            message = f"{message}：{error_hint}"

    return ImportResponse(
        meeting_id=meeting.id,
        file_name=meeting.file_name,
        file_size=meeting.file_size,
        file_format=validation.file_format,
        format_valid=validation.valid,
        status=meeting.status,
        message=message,
        transcript_text=transcript.get("transcript_text", ""),
        transcript_segments=transcript.get("segments", []),
        transcription_source=source,
    )


@router.get("/list", response_model=list[MeetingListItem])
async def get_meeting_list(db: Session = Depends(get_db)):
    return list_all_meetings(db)


@router.delete("/{meeting_id}", response_model=DeleteMeetingResponse)
async def remove_meeting(meeting_id: str, db: Session = Depends(get_db)):
    try:
        result = delete_meeting(db, meeting_id)
        if not result:
            raise HTTPException(status_code=404, detail="会议不存在")
        return DeleteMeetingResponse(**result)
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise _friendly_api_error("删除会议", exc) from exc


@router.get("/recent", response_model=list[RecentMeetingItem])
async def get_recent_meetings(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    try:
        return list_recent_meetings(db, limit)
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise _friendly_api_error("获取最近上传", exc) from exc


class StructuredItemModel(BaseModel):
    id: str
    type: str
    content: str
    confirmed: bool = False
    sourceSegmentIds: list[str] = Field(default_factory=list)
    manually_edited: bool = False


class UpdateSummaryRequest(BaseModel):
    structured_items: list[StructuredItemModel]


@router.get("/summary/{meeting_id}")
async def get_meeting_summary(meeting_id: str, db: Session = Depends(get_db)):
    import traceback

    try:
        summary = await get_or_generate_summary(db, meeting_id)
        if not summary:
            raise HTTPException(status_code=404, detail="会议不存在")
        return summary
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[ERROR] GET /api/meeting/summary/{meeting_id}: {exc}")
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail="获取会议纪要失败") from exc


@router.put("/summary/{meeting_id}")
async def update_meeting_summary(
    meeting_id: str,
    body: UpdateSummaryRequest,
    db: Session = Depends(get_db),
):
    items = [item.model_dump() for item in body.structured_items]
    summary = update_structured_summary(db, meeting_id, items)
    if not summary:
        raise HTTPException(status_code=404, detail="会议不存在")
    return summary


@router.get("/tasks/center", response_model=TaskCenterResponse)
async def get_tasks_center(
    status: Optional[str] = Query(None, description="all | pending | completed"),
    db: Session = Depends(get_db),
):
    tasks = get_task_center(db, status)
    return TaskCenterResponse(
        tasks=tasks,
        total=len(tasks),
        pending_count=sum(1 for t in tasks if t["status"] == "pending"),
        completed_count=sum(1 for t in tasks if t["status"] == "completed"),
        postponed_count=sum(1 for t in tasks if t["status"] == "postponed"),
        rejected_count=sum(1 for t in tasks if t["status"] == "rejected"),
    )


@router.post("/tasks/status", response_model=TaskCenterItem)
async def change_task_status(body: UpdateTaskStatusRequest, db: Session = Depends(get_db)):
    try:
        task = update_task_status(db, body.task_id, body.status)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return TaskCenterItem(**task)


@router.get("/tasks/{meeting_id}", response_model=MeetingTasksResponse)
async def get_tasks_by_meeting(meeting_id: str, db: Session = Depends(get_db)):
    result = get_meeting_tasks(db, meeting_id)
    if not result:
        raise HTTPException(status_code=404, detail="会议不存在")
    return MeetingTasksResponse(**result)


@router.post("/tasks/update", response_model=MeetingTasksResponse)
async def update_tasks(body: UpdateTasksRequest, db: Session = Depends(get_db)):
    updates = [item.model_dump(exclude_unset=True) for item in body.tasks]
    result = update_meeting_tasks(db, body.meeting_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="会议不存在")
    return MeetingTasksResponse(**result)


@router.post("/tasks", response_model=MeetingTasksResponse)
async def create_tasks_from_summary(
    body: ExtractTasksRequest,
    db: Session = Depends(get_db),
):
    result = generate_tasks_from_summary(db, body.meeting_id)
    if not result:
        raise HTTPException(status_code=404, detail="会议不存在")
    return MeetingTasksResponse(**result)


@router.post("/report/optimize", response_model=OptimizeReportResponse)
async def optimize_meeting_report(body: OptimizeReportRequest):
    result = await optimize_report(
        original_text=body.original_text,
        scenario=body.scenario,
        audience=body.audience,
        style=body.style,
    )
    return OptimizeReportResponse(**result)


@router.get("/report/conclusions/{meeting_id}")
async def get_meeting_conclusions(meeting_id: str, db: Session = Depends(get_db)):
    text = build_meeting_conclusions_text(db, meeting_id)
    if text is None:
        raise HTTPException(status_code=404, detail="会议不存在或无纪要条目")
    summary = get_summary(db, meeting_id)
    return {
        "meeting_id": meeting_id,
        "meeting_title": summary["meeting_info"]["title"] if summary else "",
        "conclusions_text": text,
    }

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.meeting import TaskCenterItem, TaskCenterResponse
from app.database import get_db
from app.services.meeting_service import (
    TEST_MEETING_ID,
    build_meeting_conclusions_text,
    get_summary,
    get_task_center,
)

router = APIRouter()

MOCK_SOURCE_TEXT = """【决策】搜索功能作为P0优先级，架构重构作为P1优先级
【分工】李四负责搜索功能需求文档，预计下周完成
【分工】王五准备技术方案，需要两周时间
【问题】UI改版需要更多时间，建议延期到3月中旬
【待办】协调运维团队解决测试环境部署失败问题"""


class SettingSourceResponse(BaseModel):
    meeting_id: str
    meeting_title: str
    source_text: str
    conclusions_text: str
    is_mock: bool = False


def _resolve_meeting_id(raw_id: str) -> str:
    """兼容前端传入的数字 ID（如 1）与真实 meeting_id。"""
    if raw_id in ("1", "test_001"):
        return TEST_MEETING_ID
    return raw_id


@router.get("/source/{meeting_id}", response_model=SettingSourceResponse)
async def get_setting_source(meeting_id: str, db: Session = Depends(get_db)):
    """汇报优化页：获取纪要来源文本。"""
    resolved_id = _resolve_meeting_id(meeting_id)
    text = build_meeting_conclusions_text(db, resolved_id)
    summary = get_summary(db, resolved_id)

    if text and summary:
        title = summary["meeting_info"]["title"]
        return SettingSourceResponse(
            meeting_id=resolved_id,
            meeting_title=title,
            source_text=text,
            conclusions_text=text,
            is_mock=False,
        )

    return SettingSourceResponse(
        meeting_id=resolved_id,
        meeting_title="Q1产品规划会（测试）",
        source_text=MOCK_SOURCE_TEXT,
        conclusions_text=MOCK_SOURCE_TEXT,
        is_mock=True,
    )


@router.get("/task/center/{user_id}", response_model=TaskCenterResponse)
async def get_setting_task_center(
    user_id: str,
    status: Optional[str] = Query(None, description="all | pending | completed"),
    db: Session = Depends(get_db),
):
    """任务中心页：获取用户任务列表（user_id 预留，当前返回全部任务）。"""
    _ = user_id
    tasks = get_task_center(db, status)
    return TaskCenterResponse(
        tasks=[TaskCenterItem(**task) for task in tasks],
        total=len(tasks),
        pending_count=sum(1 for t in tasks if t["status"] == "pending"),
        completed_count=sum(1 for t in tasks if t["status"] == "completed"),
        postponed_count=sum(1 for t in tasks if t["status"] == "postponed"),
        rejected_count=sum(1 for t in tasks if t["status"] == "rejected"),
    )

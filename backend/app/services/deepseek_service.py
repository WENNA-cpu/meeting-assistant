"""DeepSeek API 结构化纪要生成服务。"""

import json
import os
import uuid
from typing import Any

import httpx

from app.services.text_utils import to_simplified_chinese

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_API_BASE = os.getenv("DEEPSEEK_API_BASE", "https://api.deepseek.com")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

TYPE_MAP = {
    "决策": "decision",
    "decision": "decision",
    "问题": "issue",
    "issue": "issue",
    "分工": "assignment",
    "assignment": "assignment",
    "待办": "todo",
    "todo": "todo",
}

SUMMARY_SYSTEM_PROMPT = """你是一个会议纪要助手。请将会议转写文本结构化，区分出：

决策：确认了什么结论
问题：提出了什么问题
分工：谁负责什么
待办：需要做什么

请按 JSON 格式返回，结构如下：
{
  "决策": ["条目1", "条目2"],
  "问题": ["条目1"],
  "分工": ["条目1"],
  "待办": ["条目1"]
}

要求：
1. 仅输出 JSON 对象，不要 markdown 代码块或其他说明文字
2. 不要编造转写中不存在的内容
3. 同一事实不要重复出现在多个分类中
4. 若某类无内容，返回空数组 []
5. 所有条目必须使用中文简体（普通话），禁止使用繁体字"""


def _build_user_prompt(transcript_segments: list[dict[str, Any]]) -> str:
    lines = []
    for seg in transcript_segments:
        speaker = seg.get("speaker", "未知")
        timestamp = seg.get("timestamp", "")
        content = to_simplified_chinese(str(seg.get("content", "")))
        lines.append(f"{timestamp} {speaker}: {content}")
    transcript_text = "\n".join(lines)
    return f"转写文本：\n{transcript_text}\n\n请按 JSON 格式返回，使用中文简体。"


def _parse_llm_json(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.rsplit("```", 1)[0].strip()
    data = json.loads(text)
    if not isinstance(data, dict):
        raise ValueError("LLM 返回格式不是对象")
    return data


def _extract_items_from_response(data: dict[str, Any]) -> list[dict[str, Any]]:
    """将 DeepSeek 返回的分类 JSON 转为统一条目列表。"""
    items: list[dict[str, Any]] = []
    index = 1

    if "items" in data and isinstance(data["items"], list):
        return data["items"]

    for key, value in data.items():
        entry_type = TYPE_MAP.get(key)
        if not entry_type:
            continue
        if isinstance(value, str) and value.strip():
            items.append(
                {
                    "id": str(index),
                    "type": entry_type,
                    "content": value.strip(),
                    "confirmed": False,
                    "sourceSegmentIds": [],
                }
            )
            index += 1
        elif isinstance(value, list):
            for entry in value:
                if isinstance(entry, str) and entry.strip():
                    items.append(
                        {
                            "id": str(index),
                            "type": entry_type,
                            "content": entry.strip(),
                            "confirmed": False,
                            "sourceSegmentIds": [],
                        }
                    )
                    index += 1
                elif isinstance(entry, dict) and entry.get("content"):
                    items.append(
                        {
                            "id": str(entry.get("id") or index),
                            "type": entry_type,
                            "content": str(entry["content"]).strip(),
                            "confirmed": bool(entry.get("confirmed", False)),
                            "sourceSegmentIds": entry.get("sourceSegmentIds", []),
                        }
                    )
                    index += 1
    return items


def _normalize_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    allowed_types = {"decision", "issue", "assignment", "todo"}
    normalized: list[dict[str, Any]] = []
    for index, item in enumerate(items, start=1):
        item_type = str(item.get("type", "todo"))
        if item_type not in allowed_types:
            item_type = TYPE_MAP.get(item_type, "todo")
        source_ids = item.get("sourceSegmentIds") or item.get("source_segment_ids") or []
        if not isinstance(source_ids, list):
            source_ids = []
        normalized.append(
            {
                "id": str(item.get("id") or index),
                "type": item_type,
                "content": to_simplified_chinese(str(item.get("content", "")).strip()),
                "confirmed": bool(item.get("confirmed", False)),
                "sourceSegmentIds": [str(sid) for sid in source_ids],
                "manually_edited": bool(item.get("manually_edited", False)),
            }
        )
    return [item for item in normalized if item["content"]]


async def generate_structured_summary(
    transcript_segments: list[dict[str, Any]],
    fallback_items: list[dict[str, Any]] | None = None,
    transcript_text: str | None = None,
) -> tuple[list[dict[str, Any]], str, str | None]:
    """
    调用 DeepSeek 生成结构化纪要。
    返回 (items, source, raw_summary_json)
    source 为 deepseek | mock | fallback
    """
    if not transcript_segments and not transcript_text:
        return fallback_items or [], "empty", None

    if not DEEPSEEK_API_KEY:
        return fallback_items or [], "mock", None

    if transcript_text:
        user_prompt = f"转写文本：\n{to_simplified_chinese(transcript_text)}\n\n请按 JSON 格式返回，使用中文简体。"
    else:
        user_prompt = _build_user_prompt(transcript_segments)
    url = f"{DEEPSEEK_API_BASE.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            body = response.json()
            content = body["choices"][0]["message"]["content"]
            parsed = _parse_llm_json(content)
            raw_items = _extract_items_from_response(parsed)
            items = _normalize_items(raw_items)
            if items:
                return items, "deepseek", content
    except Exception:
        pass

    return fallback_items or [], "fallback", None


def create_manual_item(
    content: str,
    item_type: str = "todo",
    source_segment_ids: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "id": str(uuid.uuid4())[:8],
        "type": item_type,
        "content": content,
        "confirmed": False,
        "sourceSegmentIds": source_segment_ids or [],
        "manually_edited": True,
    }


SCENARIO_PROMPTS = {
    "project-progress": "项目进展汇报：突出里程碑、完成度、关键决策与下一步计划",
    "weekly-report": "周报：按「本周完成 / 进行中 / 下周计划 / 风险」结构组织",
    "monthly-report": "月报：按「月度成果 / 核心指标 / 问题复盘 / 下月规划」结构组织",
}

REPORT_OPTIMIZE_SYSTEM_PROMPT = """你是专业的职场汇报写作助手。将口语化的会议结论改写为正式、专业的汇报话术。

要求：
1. 去除「我觉得」「那个」等口语赘词，使用简洁、专业的表达
2. 按汇报场景组织段落，层次清晰
3. 保留原文中的关键事实（人名、日期、优先级等），不要编造不存在的内容
4. 仅输出 JSON 对象，格式如下：
{
  "optimized_text": "优化后的完整汇报文案",
  "highlights": [
    {"type": "structure", "icon": "✏️", "label": "结构调整", "desc": "简要说明"},
    {"type": "add", "icon": "➕", "label": "新增内容", "desc": "简要说明"},
    {"type": "remove", "icon": "➖", "label": "删减内容", "desc": "简要说明"},
    {"type": "enhance", "icon": "🔄", "label": "语义强化", "desc": "简要说明"}
  ]
}
5. highlights 列出 2-4 条主要变更说明，type 从 structure/add/remove/enhance 中选择
6. optimized_text 中不要包含 markdown 代码块"""


def _build_report_user_prompt(
    original_text: str,
    scenario: str,
    audience: str,
    style: str,
    scenario_labels: dict[str, str],
    audience_labels: dict[str, str],
    style_labels: dict[str, str],
) -> str:
    scenario_hint = SCENARIO_PROMPTS.get(scenario, scenario_labels.get(scenario, scenario))
    audience_label = audience_labels.get(audience, audience)
    style_label = style_labels.get(style, style)
    return (
        f"汇报场景：{scenario_labels.get(scenario, scenario)}（{scenario_hint}）\n"
        f"目标受众：{audience_label}\n"
        f"写作风格：{style_label}\n\n"
        f"原始会议结论：\n{original_text}\n\n"
        "请输出优化后的汇报话术 JSON。"
    )


def _default_highlights() -> list[dict[str, str]]:
    return [
        {
            "type": "structure",
            "icon": "✏️",
            "label": "结构调整",
            "desc": "按汇报场景重组段落层次",
        },
        {
            "type": "enhance",
            "icon": "🔄",
            "label": "语义强化",
            "desc": "口语表达转为专业汇报用语",
        },
    ]


async def optimize_report_with_deepseek(
    original_text: str,
    scenario: str,
    audience: str,
    style: str,
    scenario_labels: dict[str, str],
    audience_labels: dict[str, str],
    style_labels: dict[str, str],
) -> tuple[str | None, list[dict[str, str]], str]:
    """调用 DeepSeek 优化汇报话术。返回 (optimized_text, highlights, source)。"""
    if not original_text.strip():
        return None, [], "empty"

    if not DEEPSEEK_API_KEY:
        return None, [], "mock"

    user_prompt = _build_report_user_prompt(
        original_text,
        scenario,
        audience,
        style,
        scenario_labels,
        audience_labels,
        style_labels,
    )
    url = f"{DEEPSEEK_API_BASE.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": REPORT_OPTIMIZE_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.3,
        "response_format": {"type": "json_object"},
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            body = response.json()
            content = body["choices"][0]["message"]["content"]
            parsed = _parse_llm_json(content)
            optimized = str(parsed.get("optimized_text", "")).strip()
            highlights = parsed.get("highlights") or _default_highlights()
            if not isinstance(highlights, list):
                highlights = _default_highlights()
            if optimized:
                return optimized, highlights, "deepseek"
    except Exception:
        pass

    return None, [], "fallback"

"""中文文本工具。"""


def to_simplified_chinese(text: str) -> str:
    """将繁体或其他中文变体转为简体中文。"""
    if not text:
        return text
    try:
        import zhconv

        return zhconv.convert(text, "zh-cn")
    except ImportError:
        return text


def simplify_segments(segments: list[dict]) -> list[dict]:
    """转写片段内容转为简体中文。"""
    simplified: list[dict] = []
    for seg in segments:
        item = dict(seg)
        if item.get("content"):
            item["content"] = to_simplified_chinese(str(item["content"]))
        simplified.append(item)
    return simplified

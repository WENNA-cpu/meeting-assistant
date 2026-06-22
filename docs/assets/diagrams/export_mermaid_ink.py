"""通过 mermaid.ink 导出中文 Mermaid 图（Kroki 缺中文字体会显示 ???）。"""
from __future__ import annotations

import base64
import shutil
import urllib.request
from pathlib import Path

DIAGRAMS_DIR = Path(__file__).resolve().parent
IMAGES_DIR = DIAGRAMS_DIR.parent.parent / "images"

EXPORTS = [
    ("10-tech-implementation.mmd", "会议助手_技术实现.png"),
    ("11-implemented-features.mmd", "会议助手_已实现功能.png"),
]


def to_base64url(text: str) -> str:
    encoded = base64.urlsafe_b64encode(text.encode("utf-8")).decode("ascii")
    return encoded.rstrip("=")


def export_one(mmd_path: Path, out_diagram: Path, out_image: Path) -> None:
    content = mmd_path.read_text(encoding="utf-8").strip()
    url = f"https://mermaid.ink/img/{to_base64url(content)}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 AiMeetWise/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = resp.read()
    out_diagram.write_bytes(data)
    shutil.copy2(out_diagram, out_image)
    print(f"OK {out_image.name} ({len(data)} bytes)")


def main() -> None:
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    for mmd_name, image_name in EXPORTS:
        mmd_path = DIAGRAMS_DIR / mmd_name
        out_diagram = DIAGRAMS_DIR / mmd_path.with_suffix(".png").name
        out_image = IMAGES_DIR / image_name
        export_one(mmd_path, out_diagram, out_image)
    print("Done.")


if __name__ == "__main__":
    main()

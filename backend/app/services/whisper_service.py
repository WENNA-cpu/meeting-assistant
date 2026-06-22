"""本地 Whisper 语音转写：FFmpeg 使用 ggml 文件，faster-whisper 使用模型名 + 国内镜像。"""

import json
import os
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Any

# faster-whisper 通过 Hugging Face 镜像下载模型
os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
os.environ.setdefault("HUGGINGFACE_HUB_ENDPOINT", os.environ["HF_ENDPOINT"])

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_DEFAULT_MODEL_DIR = _BACKEND_DIR / "models" / "whisper.cpp"
_DEFAULT_GGML_BIN = _DEFAULT_MODEL_DIR / "ggml-base.bin"
_DEFAULT_FASTER_CACHE_DIR = _BACKEND_DIR / "models" / "faster-whisper"

WHISPER_MODEL_NAME = os.getenv("WHISPER_MODEL", "base")
FFMPEG_PATH = os.getenv("FFMPEG_PATH", r"C:\Users\Admin\ffmpeg\bin\ffmpeg.exe")
WHISPER_MODEL_DIR = os.getenv("WHISPER_MODEL_DIR", str(_DEFAULT_MODEL_DIR))
WHISPER_MODEL_PATH = os.getenv("WHISPER_MODEL_PATH", "")
WHISPER_CACHE_DIR = os.getenv("WHISPER_CACHE_DIR", str(_DEFAULT_FASTER_CACHE_DIR))
HF_ENDPOINT = os.getenv("HF_ENDPOINT", "https://hf-mirror.com")
MOCK_TRANSCRIPTION = os.getenv("MOCK_TRANSCRIPTION", "").lower() in {"1", "true", "yes"}
WHISPER_INITIAL_PROMPT = os.getenv(
    "WHISPER_INITIAL_PROMPT",
    "以下是普通话会议录音，请使用简体中文输出。",
)

from app.services.text_utils import simplify_segments, to_simplified_chinese

_faster_model = None


class WhisperTranscriptionError(Exception):
    """本地 Whisper 转写失败。"""


def _get_faster_whisper_model_dir() -> str:
    """faster-whisper 本地模型目录（非 .bin 文件）。"""
    if WHISPER_MODEL_PATH:
        path = Path(WHISPER_MODEL_PATH)
        if path.is_file():
            return str(path.parent)
        if path.is_dir():
            return str(path)
    return WHISPER_MODEL_DIR or str(_DEFAULT_MODEL_DIR)


def _get_faster_whisper_model():
    """使用模型名称加载 faster-whisper（通过国内镜像下载/读取缓存）。"""
    global _faster_model
    if _faster_model is not None:
        return _faster_model

    os.environ["HF_ENDPOINT"] = HF_ENDPOINT
    os.environ["HUGGINGFACE_HUB_ENDPOINT"] = HF_ENDPOINT

    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        print("[ERROR] faster-whisper 未安装，将回退 Mock")
        raise WhisperTranscriptionError(
            "faster-whisper 未安装，请执行 pip install faster-whisper"
        ) from exc

    cache_dir = Path(WHISPER_CACHE_DIR)
    cache_dir.mkdir(parents=True, exist_ok=True)

    try:
        print(
            f"[INFO] 正在加载 faster-whisper 模型: {WHISPER_MODEL_NAME} "
            f"（镜像: {HF_ENDPOINT}，缓存: {cache_dir}）"
        )
        _faster_model = WhisperModel(
            WHISPER_MODEL_NAME,
            device="cpu",
            compute_type="int8",
            download_root=str(cache_dir),
        )
        print(f"[INFO] faster-whisper 模型加载成功: {WHISPER_MODEL_NAME}")
    except Exception as exc:
        print(f"[ERROR] faster-whisper 模型加载失败: {exc}，将回退 Mock")
        raise WhisperTranscriptionError(f"faster-whisper 模型加载失败: {exc}") from exc

    return _faster_model


def _resolve_ggml_bin_path() -> Path:
    """FFmpeg whisper 使用的 ggml .bin 文件路径。"""
    if WHISPER_MODEL_PATH:
        path = Path(WHISPER_MODEL_PATH)
        if path.is_file() and path.suffix.lower() == ".bin":
            size_mb = path.stat().st_size / (1024 * 1024)
            print(f"[INFO] FFmpeg ggml 模型已找到: {path} ({size_mb:.1f} MB)")
            return path

    model_dir = Path(_get_faster_whisper_model_dir())
    candidates = [
        model_dir / f"ggml-{WHISPER_MODEL_NAME}.bin",
        model_dir / "ggml-base.bin",
        _DEFAULT_GGML_BIN,
    ]
    for candidate in candidates:
        if candidate.is_file():
            size_mb = candidate.stat().st_size / (1024 * 1024)
            print(f"[INFO] FFmpeg ggml 模型已找到: {candidate} ({size_mb:.1f} MB)")
            return candidate

    print(f"[ERROR] 未找到 ggml 模型文件，已检查目录: {model_dir}")
    raise WhisperTranscriptionError(
        f"未找到 ggml 模型文件，请将 ggml-{WHISPER_MODEL_NAME}.bin 放到 {model_dir}"
    )


def is_whisper_available() -> bool:
    if MOCK_TRANSCRIPTION:
        return False
    if _DEFAULT_GGML_BIN.is_file():
        return True
    try:
        from faster_whisper import WhisperModel  # noqa: F401

        return True
    except ImportError:
        return False


def _resolve_ffmpeg_executable() -> str | None:
    candidates = [
        FFMPEG_PATH,
        r"C:\Users\Admin\ffmpeg\bin\ffmpeg.exe",
        r"E:\ffmpeg\bin\ffmpeg.exe",
        "ffmpeg",
    ]
    seen: set[str] = set()
    for candidate in candidates:
        if not candidate or candidate in seen:
            continue
        seen.add(candidate)
        path = Path(candidate)
        if path.is_file():
            return str(path)
        found = _which(candidate)
        if found:
            return found
    return None


def _which(name: str) -> str | None:
    path_env = os.environ.get("PATH", "")
    for folder in path_env.split(os.pathsep):
        candidate = Path(folder) / name
        if candidate.is_file():
            return str(candidate)
        if os.name == "nt":
            candidate_exe = Path(folder) / f"{name}.exe"
            if candidate_exe.is_file():
                return str(candidate_exe)
    return None


def _escape_ffmpeg_filter_path(path: str) -> str:
    normalized = Path(path).resolve().as_posix()
    if os.name == "nt" and re.match(r"^[A-Za-z]:/", normalized):
        normalized = normalized.replace(":", "\\:", 1)
    return normalized.replace("'", r"\'")


def _format_timestamp(seconds: float) -> str:
    total = max(0, int(seconds))
    hours, remainder = divmod(total, 3600)
    minutes, secs = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


def _segments_from_plain_text(text: str) -> list[dict[str, str]]:
    cleaned = text.strip()
    if not cleaned:
        return []
    return [
        {
            "id": "s1",
            "speaker": "未知",
            "content": cleaned,
            "timestamp": "00:00:00",
        }
    ]


def _build_result(
    segments: list[dict[str, str]],
    *,
    source: str,
    model: str,
) -> dict[str, Any]:
    segments = simplify_segments(segments)
    transcript_text = " ".join(seg["content"] for seg in segments).strip()
    transcript_text = to_simplified_chinese(transcript_text)
    if not segments and transcript_text:
        segments = _segments_from_plain_text(transcript_text)
    if not segments:
        raise WhisperTranscriptionError("Whisper 未返回有效转写内容")
    return {
        "segments": segments,
        "transcript_text": transcript_text,
        "source": source,
        "model": model,
    }


def _parse_whisper_json_output(raw_text: str) -> list[dict[str, str]]:
    segments: list[dict[str, str]] = []
    if not raw_text.strip():
        return segments

    for index, line in enumerate(raw_text.splitlines(), start=1):
        line = line.strip()
        if not line:
            continue
        try:
            item = json.loads(line)
        except json.JSONDecodeError:
            continue
        text = str(item.get("text", "")).strip()
        if not text:
            continue
        start_ms = float(item.get("start", 0))
        segments.append(
            {
                "id": f"s{index}",
                "speaker": "未知",
                "content": text,
                "timestamp": _format_timestamp(start_ms / 1000.0),
            }
        )

    if segments:
        return segments

    try:
        payload = json.loads(raw_text)
    except json.JSONDecodeError:
        return _segments_from_plain_text(raw_text)

    if isinstance(payload, dict):
        chunks = payload.get("segments") or payload.get("transcription") or []
    elif isinstance(payload, list):
        chunks = payload
    else:
        chunks = []

    for index, item in enumerate(chunks, start=1):
        if isinstance(item, str):
            text = item.strip()
            start = 0.0
        else:
            text = str(item.get("text", "")).strip()
            start = float(item.get("start", 0))
            if start > 1000:
                start /= 1000.0
        if not text:
            continue
        segments.append(
            {
                "id": f"s{index}",
                "speaker": "未知",
                "content": text,
                "timestamp": _format_timestamp(start),
            }
        )
    return segments


def transcribe_with_ffmpeg_whisper(audio_path: Path, *, language: str = "zh") -> dict[str, Any]:
    """使用 FFmpeg whisper 滤镜 + 本地 ggml .bin 文件转写。"""
    ffmpeg_exe = _resolve_ffmpeg_executable()
    if not ffmpeg_exe:
        raise WhisperTranscriptionError("未找到 FFmpeg，可设置 FFMPEG_PATH 环境变量")

    model_path = _resolve_ggml_bin_path()

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
        output_path = Path(tmp.name)

    filter_chain = (
        "aformat=sample_rates=16000:channel_layouts=mono,"
        f"whisper=model={_escape_ffmpeg_filter_path(str(model_path))}:"
        f"language={language}:queue=3:"
        f"destination={_escape_ffmpeg_filter_path(str(output_path))}:format=json"
    )
    cmd = [
        ffmpeg_exe,
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        str(audio_path),
        "-vn",
        "-af",
        filter_chain,
        "-f",
        "null",
        "-",
    ]

    try:
        print(f"[INFO] FFmpeg whisper 开始转写: {audio_path}")
        completed = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=int(os.getenv("FFMPEG_WHISPER_TIMEOUT", "1800")),
            check=False,
        )
        if completed.returncode != 0:
            stderr = (completed.stderr or completed.stdout or "").strip()
            print(f"[ERROR] FFmpeg whisper 转写失败: {stderr}")
            raise WhisperTranscriptionError(stderr or "FFmpeg whisper 转写失败")

        raw_output = output_path.read_text(encoding="utf-8", errors="replace") if output_path.exists() else ""
        if not raw_output.strip():
            raw_output = (completed.stderr or completed.stdout or "").strip()

        segments = _parse_whisper_json_output(raw_output)
        print(f"[INFO] FFmpeg whisper 转写成功，共 {len(segments)} 段")
        return _build_result(segments, source="ffmpeg-whisper", model=model_path.name)
    finally:
        if output_path.exists():
            output_path.unlink(missing_ok=True)


def transcribe_with_faster_whisper(audio_path: Path, *, language: str = "zh") -> dict[str, Any]:
    """使用 faster-whisper 模型名转写（国内镜像下载/本地缓存）。"""
    model = _get_faster_whisper_model()

    try:
        print(f"[INFO] faster-whisper 开始转写: {audio_path}（模型: {WHISPER_MODEL_NAME}）")
        segment_iter, _info = model.transcribe(
            str(audio_path),
            language=language,
            task="transcribe",
            initial_prompt=WHISPER_INITIAL_PROMPT,
        )
        segments: list[dict[str, str]] = []
        for index, segment in enumerate(segment_iter, start=1):
            text = (segment.text or "").strip()
            if not text:
                continue
            segments.append(
                {
                    "id": f"s{index}",
                    "speaker": "未知",
                    "content": text,
                    "timestamp": _format_timestamp(segment.start),
                }
            )
        print(f"[INFO] faster-whisper 转写成功，共 {len(segments)} 段")
        return _build_result(segments, source="whisper", model=WHISPER_MODEL_NAME)
    except Exception as exc:
        print(f"[ERROR] faster-whisper 转写失败: {exc}，将回退 Mock")
        raise WhisperTranscriptionError(f"faster-whisper 转写失败: {exc}") from exc


def transcribe_audio_file(file_path: Path, filename: str, *, language: str = "zh") -> dict[str, Any]:
    """
    转写音频：FFmpeg whisper -> faster-whisper（均仅本地）。
    失败时抛出 WhisperTranscriptionError，由上层回退 Mock。
    """
    del filename

    if MOCK_TRANSCRIPTION:
        raise WhisperTranscriptionError("MOCK_TRANSCRIPTION 已启用，跳过真实转写")

    if not file_path.exists():
        raise WhisperTranscriptionError(f"音频文件不存在: {file_path}")

    errors: list[str] = []

    try:
        return transcribe_with_ffmpeg_whisper(file_path, language=language)
    except WhisperTranscriptionError as exc:
        errors.append(f"FFmpeg: {exc}")
        print(f"[WARN] FFmpeg whisper 失败，尝试 faster-whisper: {exc}")
    except Exception as exc:
        errors.append(f"FFmpeg: {exc}")
        print(f"[WARN] FFmpeg whisper 异常，尝试 faster-whisper: {exc}")

    try:
        return transcribe_with_faster_whisper(file_path, language=language)
    except WhisperTranscriptionError as exc:
        errors.append(f"faster-whisper: {exc}")
        raise WhisperTranscriptionError("；".join(errors)) from exc
    except Exception as exc:
        errors.append(f"faster-whisper: {exc}")
        raise WhisperTranscriptionError("；".join(errors)) from exc

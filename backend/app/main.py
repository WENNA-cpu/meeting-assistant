from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.api.meeting import router as meeting_router
from app.api.setting import router as setting_router
from app.database import get_db, init_db, SessionLocal

load_dotenv()

app = FastAPI(
    title="AI智能会议助手 API",
    description="会议导入、智能纪要、任务提取、汇报优化、任务中心",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3015",
        "http://127.0.0.1:3015",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meeting_router, prefix="/api/meeting", tags=["meeting"])
app.include_router(setting_router, prefix="/api/setting", tags=["setting"])


@app.on_event("startup")
def on_startup():
    try:
        init_db()
        from app.services.meeting_service import ensure_seed_meetings

        db = SessionLocal()
        try:
            ensure_seed_meetings(db)
        except Exception as exc:
            db.rollback()
            print(f"[WARN] 种子会议初始化失败，服务仍可启动：{exc}")
        finally:
            db.close()
    except Exception as exc:
        print(f"[ERROR] 数据库初始化失败：{exc}")


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "meeting-assistant-api"}

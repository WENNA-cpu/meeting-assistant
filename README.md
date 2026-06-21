# AI智能会议助手

面向 To B 场景的会议效率工具：会议导入 → 智能纪要 → 任务提取 → 汇报优化 → 任务中心。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS |
| 后端 | Python FastAPI + SQLite |
| 部署 | Docker Compose + Nginx |

## 项目结构

```
AiMeetWise/
├── backend/                 # FastAPI 后端
│   ├── app/
│   │   ├── api/meeting.py   # REST API
│   │   ├── models/meeting.py# 数据模型
│   │   ├── services/        # 业务逻辑
│   │   ├── database.py      # SQLite 连接
│   │   └── main.py          # 应用入口
│   ├── requirements.txt
│   └── Dockerfile
├── src/pages/               # 前端页面（5 个模块）
├── router/index.tsx         # 路由配置
├── vite.config.ts           # Vite 配置（/api 代理）
├── docker-compose.yml
└── README.md
```

## 快速开始

### 1. 后端

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API 文档：http://localhost:8000/docs

### 2. 前端

```bash
npm install
npm run dev
```

访问：http://localhost:5173

开发环境下 `/api` 自动代理到 `http://localhost:8000`。

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/meeting/import` | 上传音频，返回 `meeting_id` |
| GET | `/api/meeting/summary/{meeting_id}` | 获取结构化纪要 |
| POST | `/api/meeting/tasks` | 从纪要提取任务 |
| POST | `/api/meeting/report/optimize` | 优化汇报话术 |
| GET | `/api/meeting/tasks/center` | 获取用户所有待办任务 |

## 数据存储

SQLite 数据库，表结构：

- `meetings` — 会议记录、转写与纪要 JSON
- `tasks` — 任务（优先级象限、状态、负责人等）
- `feedbacks` — 反馈记录

## Docker 部署

```bash
docker compose up -d --build
```

- 前端：http://localhost
- 后端：http://localhost:8000

## 前端路由

| 路径 | 页面 |
|------|------|
| `/import` | 会议导入 |
| `/summary` | 智能纪要 |
| `/priority` | 任务优先级 |
| `/report` | 汇报优化 |
| `/tasks` | 任务中心 |

## 仓库

https://github.com/WENNA-cpu/meeting-assistant.git

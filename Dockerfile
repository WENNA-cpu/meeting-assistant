# AI 会议助手 — 根目录多阶段构建
# docker compose build 使用 target: backend | frontend

########## 1. FastAPI 后端（生产端口 8001） ##########
FROM python:3.11-slim AS backend

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app

RUN mkdir -p /app/data /app/uploads

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]


########## 2. React + Vite 前端构建（子路径 /meeting/） ##########
FROM node:20-alpine AS frontend-builder

WORKDIR /app

ENV VITE_BASE_PATH=/meeting/

COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN corepack enable && pnpm install --frozen-lockfile || npm ci || npm install

COPY . .

RUN npm run build


########## 3. Nginx 静态托管 + /api 反代 ##########
FROM nginx:alpine AS frontend

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

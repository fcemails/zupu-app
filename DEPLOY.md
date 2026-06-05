# 族谱系统 · Docker 部署文档

## 一、系统概述

本系统为基于 Next.js 16 + SQLite 的家族族谱管理平台，支持族谱树可视化、迁徙地图标记、大事记录入、成员档案管理及邀请协作等功能。

**技术栈**

| 组件 | 版本 |
|------|------|
| Next.js | 16.x |
| React | 19.x |
| Prisma | 7.x |
| SQLite (better-sqlite3) | 12.x |
| Node.js（容器内） | 22 LTS |

---

## 二、目录结构

部署前请确认项目根目录如下：

```
zupu-app/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/
│   └── uploads/          ← 用户上传图片，需持久化挂载
├── src/
├── package.json
├── next.config.ts
├── entrypoint.sh         ← 容器启动脚本
├── Dockerfile
└── docker-compose.yml
```

---

## 三、环境变量说明

在 `zupu-app/` 目录下创建 `.env.production`（不要提交到 Git）：

```dotenv
# ── 数据库 ──────────────────────────────────────────────
# SQLite 文件路径（容器内绝对路径，与 volume 挂载一致）
DATABASE_URL=file:/data/zupu.db

# ── Session 密钥 ────────────────────────────────────────
# 必须修改为随机强密钥（至少 64 字节十六进制字符串）
# 生成命令：openssl rand -hex 32
SESSION_SECRET=替换为你自己的随机密钥

# ── 文件存储（选其一）──────────────────────────────────
# 方案一：本地存储（默认，无需额外配置）
STORAGE_PROVIDER=local

# 方案二：S3 兼容存储（阿里云 OSS、腾讯 COS 等）
# STORAGE_PROVIDER=s3
# S3_BUCKET=your-bucket-name
# S3_REGION=cn-hangzhou
# S3_ACCESS_KEY_ID=your-access-key
# S3_SECRET_ACCESS_KEY=your-secret-key
# S3_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com   # 非 AWS 时填写

# ── 邮件发送（选填，用于邀请邮件）──────────────────────
# 不配置时，邀请功能仍可使用链接，但不会自动发送邮件
EMAIL_SMTP_HOST=smtp.example.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your@email.com
EMAIL_SMTP_PASS=your-smtp-password
EMAIL_FROM=noreply@example.com
EMAIL_DOMAIN=example.com
```

> **重要**：
> - `DATABASE_URL` 必须使用容器内绝对路径 `file:/data/zupu.db`，不能使用相对路径。
> - `.env.production` 中的值**不要加引号**。Docker Compose 读取 `env_file` 时不会去掉引号，加引号会导致值里带有 `"` 字符，Prisma 无法识别 URL scheme。

---

## 四、创建 Dockerfile

在 `zupu-app/` 目录下创建 `Dockerfile`：

```dockerfile
# ════════════════════════════════════════════════════════════════
# Stage 1 – deps
#   单独安装依赖，保留编译工具在此阶段，不污染最终镜像。
# ════════════════════════════════════════════════════════════════
FROM node:22-alpine AS deps
WORKDIR /app

RUN apk add --no-cache python3 make g++ gcc libc6-compat

COPY package*.json ./
RUN npm ci

# ════════════════════════════════════════════════════════════════
# Stage 2 – builder
#   生成 Prisma 客户端，构建 Next.js standalone 产物。
# ════════════════════════════════════════════════════════════════
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ════════════════════════════════════════════════════════════════
# Stage 3 – runner
#   最小化运行镜像，仅包含 standalone 产物与 Prisma CLI。
# ════════════════════════════════════════════════════════════════
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# 非 root 用户
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Next.js standalone 产物
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public           ./public

# Prisma schema、迁移文件与配置（entrypoint 执行 migrate deploy 需要）
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

# 完整 node_modules（含 Prisma CLI 所有传递依赖与 better-sqlite3 原生模块）
# standalone 的 nft 子集不含 Prisma CLI 依赖，直接用 deps 阶段全量覆盖
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# 启动脚本
COPY --chown=nextjs:nodejs entrypoint.sh ./
RUN chmod +x entrypoint.sh

# 数据与上传目录
RUN mkdir -p /data /app/public/uploads \
 && chown -R nextjs:nodejs /data /app/public/uploads

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
```

---

## 五、创建 entrypoint.sh

在 `zupu-app/` 目录下创建 `entrypoint.sh`：

```sh
#!/bin/sh
set -e

SCHEMA="./prisma/schema.prisma"
MIGRATIONS_DIR="./prisma/migrations"

if [ -d "$MIGRATIONS_DIR" ] && [ "$(ls -A "$MIGRATIONS_DIR" 2>/dev/null)" ]; then
  echo "[zupu] running prisma migrate deploy..."
  node_modules/.bin/prisma migrate deploy --schema "$SCHEMA"
else
  echo "[zupu] no migration files found, running prisma db push..."
  node_modules/.bin/prisma db push --schema "$SCHEMA" --skip-generate
fi

echo "[zupu] starting server..."
exec node server.js
```

> **说明**：脚本在容器启动时自动执行数据库迁移，有迁移文件则用 `migrate deploy`，否则用 `db push` 初始化表结构。

---

## 六、启用 standalone 输出

编辑 `zupu-app/next.config.ts`：

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

---

## 七、创建 docker-compose.yml

在 `zupu-app/` 目录下创建 `docker-compose.yml`：

```yaml
version: "3.9"

services:
  zupu:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: zupu-app
    restart: unless-stopped
    ports:
      - "3000:3000"          # 宿主机端口:容器端口，可按需修改
    env_file:
      - .env.production
    volumes:
      - /www/zp/db:/data                 # SQLite 数据库文件持久化（宿主机目录，按需修改路径）
      - zupu_uploads:/app/public/uploads # 用户上传图片持久化
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s

volumes:
  zupu_uploads:
```

---

## 八、部署步骤

### 8.1 首次部署

```bash
# 1. 进入项目目录
cd zupu-app

# 2. 创建生产环境变量文件（参照第三节内容填写）
cp .env.production.example .env.production
# 用文本编辑器修改以下必填项：
#   DATABASE_URL=file:/data/zupu.db     ← 保持此绝对路径不变（不要加引号）
#   SESSION_SECRET=你的随机密钥         ← 必须替换，不要加引号

# 3. 构建并启动容器（首次较慢，约 3-5 分钟）
docker compose up -d --build

# 4. 查看启动日志
docker compose logs -f zupu
```

启动成功后访问 `http://服务器IP:3000`。

### 8.2 更新部署

```bash
# 拉取最新代码后重新构建
docker compose up -d --build

# 旧容器自动替换，数据 volume 不受影响
```

### 8.3 查看日志

```bash
docker compose logs -f zupu
```

### 8.4 备份数据

```bash
# 备份数据库（直接复制宿主机文件）
mkdir -p backup
cp /www/zp/db/zupu.db backup/zupu-db-$(date +%Y%m%d).db

# 备份上传图片
docker run --rm \
  -v zupu-app_zupu_uploads:/uploads \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/zupu-uploads-$(date +%Y%m%d).tar.gz /uploads
```

### 8.5 恢复数据

```bash
# 停止容器
docker compose down

# 恢复数据库（直接替换宿主机文件）
cp backup/zupu-db-20240101.db /www/zp/db/zupu.db
chown 1001:1001 /www/zp/db/zupu.db

# 重新启动
docker compose up -d
```

---

## 九、反向代理配置（Nginx）

生产环境建议在容器前配置 Nginx，并启用 HTTPS。

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;

    # 上传文件大小限制（图片最大 4MB，留足余量）
    client_max_body_size 10m;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded-for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 十、常见问题

| 现象 | 排查方向 |
|------|---------|
| 容器启动后立即退出 | 执行 `docker compose logs zupu`，检查数据库路径权限或 SESSION_SECRET 是否配置 |
| 容器状态一直 unhealthy | 正常启动需 20 秒预热，等待后再检查；或执行 `docker compose logs zupu` 查看报错 |
| 图片上传失败 | 确认 `/app/public/uploads` volume 已挂载且 nextjs 用户有写权限 |
| 邀请邮件发不出 | 检查 `EMAIL_SMTP_*` 变量；不影响邀请链接功能本身 |
| 数据库迁移报错 | 确认 `DATABASE_URL=file:/data/zupu.db`（绝对路径）且 `/data` 目录可写 |
| 页面空白 / 500 错误 | 检查 `SESSION_SECRET` 是否已修改为有效随机值 |

---

## 十一、最低服务器配置

| 资源 | 建议 |
|------|------|
| CPU | 1 核 |
| 内存 | 512 MB（推荐 1 GB） |
| 磁盘 | 10 GB（含图片存储） |
| 操作系统 | Linux（Ubuntu 22.04 / Debian 12 均可） |
| Docker | 24.x 及以上 |
| Docker Compose | v2（`docker compose` 命令） |

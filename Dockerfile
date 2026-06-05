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

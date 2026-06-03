# ════════════════════════════════════════════════════════════════
# Stage 1 – deps
#   Install all node_modules including native module compilation.
#   Kept separate so build tools (gcc/g++/python3) stay out of the
#   final image while the compiled better-sqlite3 binary is reused.
# ════════════════════════════════════════════════════════════════
FROM node:22-alpine AS deps
WORKDIR /app

RUN apk add --no-cache python3 make g++ gcc libc6-compat

COPY package*.json ./
RUN npm ci

# ════════════════════════════════════════════════════════════════
# Stage 2 – builder
#   Generate the Prisma client and produce a Next.js standalone
#   build (output: "standalone" must be set in next.config.ts).
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
#   Minimal Alpine image. Contains only:
#     - Next.js standalone server + static assets
#     - Prisma CLI (for db push / migrate deploy on startup)
#     - better-sqlite3 native binary (traced by standalone output)
# ════════════════════════════════════════════════════════════════
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# ── Next.js standalone output ─────────────────────────────────────
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public           ./public

# ── Prisma schema + migrations ────────────────────────────────────
# The entrypoint uses these to initialise / migrate the database.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# ── Prisma CLI packages ───────────────────────────────────────────
# The standalone tracer (nft) tracks only runtime JS imports, not the
# prisma executable. Copy the CLI and its engines explicitly so the
# entrypoint can run `prisma migrate deploy` / `prisma db push`.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/prisma           ./node_modules/prisma
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@prisma/engines  ./node_modules/@prisma/engines
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/.bin/prisma      ./node_modules/.bin/prisma

# ── Startup script ────────────────────────────────────────────────
COPY --chown=nextjs:nodejs entrypoint.sh ./
RUN chmod +x entrypoint.sh

# ── Persistent data directories ───────────────────────────────────
RUN mkdir -p /data /app/public/uploads \
 && chown -R nextjs:nodejs /data /app/public/uploads

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]

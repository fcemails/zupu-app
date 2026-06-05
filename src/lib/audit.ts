import type { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'

export type AuditEntry = {
  userId: string
  familyId: string
  action: string
  target?: string | null
  details?: unknown
}

function sanitizeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeJson)
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, sanitizeJson(v)]),
    )
  }
  return value
}

export async function audit(entry: AuditEntry) {
  const details = entry.details == null
    ? undefined
    : sanitizeJson(entry.details) as Prisma.InputJsonValue
  return prisma.auditLog.create({
    data: {
      userId: entry.userId,
      familyId: entry.familyId,
      action: entry.action,
      target: entry.target ?? null,
      details,
    },
  })
}

export async function fetchAuditLogs(familyId: string, page = 1, limit = 50) {
  const skip = (page - 1) * limit
  if (prisma.auditLog && typeof prisma.auditLog.findMany === 'function') {
    return prisma.auditLog.findMany({
      where: { familyId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { user: true },
    })
  }

  const rows = await prisma.$queryRaw`
    SELECT "AuditLog".*, "User"."name" AS user_name, "User"."email" AS user_email, "User"."avatar" AS user_avatar
    FROM "AuditLog"
    LEFT JOIN "User" ON "AuditLog"."userId" = "User"."id"
    WHERE "AuditLog"."familyId" = ${familyId}
    ORDER BY "AuditLog"."createdAt" DESC
    LIMIT ${limit} OFFSET ${skip}
  `

  return (rows as any[]).map(row => ({
    id: row.id,
    createdAt: row.createdAt,
    userId: row.userId,
    action: row.action,
    target: row.target,
    details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
    user: {
      id: row.userId,
      name: row.user_name,
      email: row.user_email,
      avatar: row.user_avatar,
    },
  }))
}

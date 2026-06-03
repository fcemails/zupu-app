import { getSession } from '@/lib/session'
import { requireRole } from '@/lib/permissions'
import { fetchAuditLogs } from '@/lib/audit'
import { jsonError, jsonOK } from '@/lib/apiResponse'
import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Ctx) {
  try {
    const { id: familyId } = await params
    const session = await getSession()
    if (!session) return jsonError('UNAUTHORIZED', 'Unauthorized', 401)

    try {
      await requireRole(session.userId, familyId, 'admin')
    } catch (e) {
      console.error('Role check failed:', e)
      return jsonError('FORBIDDEN', 'Forbidden', 403)
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(Number(searchParams.get('page') ?? '1'), 1)
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '50'), 1), 200)

      const logs = await fetchAuditLogs(familyId, page, limit)
    let total = logs.length
    if (prisma.auditLog && typeof prisma.auditLog.count === 'function') {
      try {
        total = await prisma.auditLog.count({ where: { familyId } })
      } catch (countErr) {
        console.error('Audit logs count failed:', countErr)
      }
    } else {
      try {
        const countRows = await prisma.$queryRaw`
          SELECT COUNT(*) AS count
          FROM "AuditLog"
          WHERE "familyId" = ${familyId}
        `
        total = Number((countRows as any[])[0]?.count ?? total)
      } catch (countErr) {
        console.error('Audit logs count fallback failed:', countErr)
      }
    }
    return jsonOK({ page, limit, total, logs })
  } catch (err) {
    console.error('Audit logs error:', err)
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return jsonError('SERVER_ERROR', message, 500)
  }
}

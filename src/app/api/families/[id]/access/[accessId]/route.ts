import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/permissions'
import { audit } from '@/lib/audit'
import { jsonError } from '@/lib/apiResponse'

type Ctx = { params: Promise<{ id: string; accessId: string }> }

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id: familyId, accessId } = await params
  const session = await getSession()
  if (!session) return jsonError('UNAUTHORIZED', 'Unauthorized', 401)

  try {
    await requireRole(session.userId, familyId, 'owner')
  } catch {
    return jsonError('FORBIDDEN', 'Forbidden', 403)
  }

  const access = await prisma.familyAccess.findUnique({ where: { id: accessId } })
  if (!access || access.familyId !== familyId) {
    return jsonError('NOT_FOUND', 'Not found', 404)
  }
  if (access.role === 'owner') {
    return jsonError('FORBIDDEN', '不能移除谱主', 400)
  }

  await prisma.familyAccess.delete({ where: { id: accessId } })
  await audit({
    userId: session.userId,
    familyId,
    action: 'access.delete',
    target: accessId,
    details: { userId: access.userId, role: access.role },
  })
  return new Response(null, { status: 204 })
}

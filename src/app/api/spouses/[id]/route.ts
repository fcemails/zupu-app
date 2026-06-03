import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/permissions'
import { audit } from '@/lib/audit'
import { jsonError, jsonOK } from '@/lib/apiResponse'

type Ctx = { params: Promise<{ id: string }> }

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  const session = await getSession()
  if (!session) return jsonError('UNAUTHORIZED', 'Unauthorized', 401)

  const spouse = await prisma.spouse.findUnique({
    where: { id },
    include: { p1: { select: { familyId: true } } },
  })
  if (!spouse) return jsonError('NOT_FOUND', 'Not found', 404)

  try {
    await requireRole(session.userId, spouse.p1.familyId, 'editor')
  } catch {
    return jsonError('FORBIDDEN', 'Forbidden', 403)
  }

  await prisma.spouse.delete({ where: { id } })
  await audit({
    userId: session.userId,
    familyId: spouse.p1.familyId,
    action: 'spouse.delete',
    target: id,
    details: { p1Id: spouse.p1.familyId, p2Id: spouse.p2Id },
  })
  return new Response(null, { status: 204 })
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params
  const session = await getSession()
  if (!session) return jsonError('UNAUTHORIZED', 'Unauthorized', 401)

  const spouse = await prisma.spouse.findUnique({
    where: { id },
    include: { p1: { select: { familyId: true } } },
  })
  if (!spouse) return jsonError('NOT_FOUND', 'Not found', 404)

  try {
    await requireRole(session.userId, spouse.p1.familyId, 'editor')
  } catch {
    return jsonError('FORBIDDEN', 'Forbidden', 403)
  }

  const { label } = await req.json().catch(() => ({}))
  const updated = await prisma.spouse.update({
    where: { id },
    data: { label: label ?? null },
  })

  await audit({
    userId: session.userId,
    familyId: spouse.p1.familyId,
    action: 'spouse.update',
    target: id,
    details: { label: label ?? null },
  })

  return jsonOK(updated)
}

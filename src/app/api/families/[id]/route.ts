import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/permissions'
import { z } from 'zod'
import { jsonError, jsonOK } from '@/lib/apiResponse'

const UpdateSchema = z.object({
  surname: z.string().min(1).optional(),
  tang: z.string().min(1).optional(),
  region: z.string().optional(),
  era: z.string().optional(),
  motto: z.string().optional(),
  zibei: z.string().optional(),
  access: z.enum(['public', 'semi', 'private']).optional(),
})

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  const session = await getSession()
  if (!session) return jsonError('UNAUTHORIZED', 'Unauthorized', 401)

  try {
    await requireRole(session.userId, id, 'viewer')
  } catch {
    return jsonError('FORBIDDEN', 'Forbidden', 403)
  }

  const family = await prisma.family.findUnique({
    where: { id },
    include: { _count: { select: { members: true, events: true } } },
  })
  if (!family) return jsonError('NOT_FOUND', '族谱不存在', 404)
  return jsonOK(family)
}

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params
  const session = await getSession()
  if (!session) return jsonError('UNAUTHORIZED', 'Unauthorized', 401)

  try {
    await requireRole(session.userId, id, 'admin')
  } catch {
    return jsonError('FORBIDDEN', 'Forbidden', 403)
  }

  const body = await req.json().catch(() => null)
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return jsonError('INVALID_PARAMS', '参数错误', 400)

  const family = await prisma.family.update({ where: { id }, data: parsed.data })
  return jsonOK(family)
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  const session = await getSession()
  if (!session) return jsonError('UNAUTHORIZED', 'Unauthorized', 401)

  try {
    await requireRole(session.userId, id, 'owner')
  } catch {
    return jsonError('FORBIDDEN', 'Forbidden', 403)
  }

  await prisma.family.delete({ where: { id } })
  return jsonOK({ ok: true })
}

import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { requireRole, maskSensitive } from '@/lib/permissions'
import { audit } from '@/lib/audit'
import { z } from 'zod'
import { jsonError, jsonOK } from '@/lib/apiResponse'

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  zi: z.string().optional(),
  hao: z.string().optional(),
  sex: z.enum(['M', 'F']).optional(),
  gen: z.number().int().min(1).optional(),
  branch: z.string().optional(),
  birth: z.string().optional(),
  birthLunar: z.string().optional(),
  death: z.string().optional(),
  deathLunar: z.string().optional(),
  lifespan: z.string().optional(),
  title: z.string().optional(),
  bio: z.string().optional(),
  burial: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  deceased: z.boolean().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
})

type Ctx = { params: Promise<{ id: string; personId: string }> }

export async function PUT(req: Request, { params }: Ctx) {
  const { id: familyId, personId } = await params
  const session = await getSession()
  if (!session) return jsonError('UNAUTHORIZED', 'Unauthorized', 401)

  let role
  try {
    role = await requireRole(session.userId, familyId, 'editor')
  } catch {
    return jsonError('FORBIDDEN', 'Forbidden', 403)
  }

  const body = await req.json().catch(() => null)
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return jsonError('INVALID_PARAMS', '参数错误', 400, parsed.error.issues)

  const updateResult = await prisma.person.updateMany({
    where: { id: personId, familyId },
    data: parsed.data,
  })

  if (updateResult.count === 0) {
    return jsonError('NOT_FOUND', '族人不存在或不属于该族谱', 404)
  }

  const person = await prisma.person.findUnique({ where: { id: personId } })
  if (!person) {
    return jsonError('NOT_FOUND', '族人不存在', 404)
  }

  try {
    await audit({
      userId: session.userId,
      familyId,
      action: 'member.update',
      target: personId,
      details: parsed.data,
    })
  } catch (err) {
    console.error('Member update audit failed:', err)
  }

  return jsonOK(maskSensitive(person as unknown as Record<string, unknown>, role, ['burial', 'address', 'phone']))
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id: familyId, personId } = await params
  const session = await getSession()
  if (!session) return jsonError('UNAUTHORIZED', 'Unauthorized', 401)

  try {
    await requireRole(session.userId, familyId, 'admin')
  } catch {
    return jsonError('FORBIDDEN', 'Forbidden', 403)
  }

  await prisma.person.delete({ where: { id: personId, familyId } })
  try {
    await audit({
      userId: session.userId,
      familyId,
      action: 'member.delete',
      target: personId,
    })
  } catch (err) {
    console.error('Member delete audit failed:', err)
  }
  return jsonOK({ ok: true })
}

import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { logError } from '@/lib/logger'
import { z } from 'zod'
import { jsonError, jsonOK } from '@/lib/apiResponse'

const CreateSchema = z.object({
  surname: z.string().min(1),
  tang: z.string().min(1),
  region: z.string().optional(),
  era: z.string().optional(),
  motto: z.string().optional(),
  zibei: z.string().optional(),
  access: z.enum(['public', 'semi', 'private']).default('semi'),
})

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return jsonError('UNAUTHORIZED', 'Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const page = Math.max(Number(searchParams.get('page') ?? '1'), 1)
  const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '20'), 1), 50)
  const skip = (page - 1) * limit

  const accesses = await prisma.familyAccess.findMany({
    where: { userId: session.userId },
    include: {
      family: {
        include: { _count: { select: { members: true, events: true } } },
      },
    },
    orderBy: { family: { createdAt: 'asc' } },
    skip,
    take: limit,
  })

  return jsonOK({
    page,
    limit,
    items: accesses.map(a => ({
      ...a.family,
      role: a.role,
      memberCount: a.family._count.members,
      eventCount: a.family._count.events,
    })),
  })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return jsonError('UNAUTHORIZED', 'Unauthorized', 401)

  const body = await req.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return jsonError('INVALID_PARAMS', '参数错误', 400, parsed.error.issues)

  const family = await prisma.family.create({
    data: {
      ...parsed.data,
      accessList: { create: { userId: session.userId, role: 'owner' } },
    },
  })

  try {
    await audit({
      userId: session.userId,
      familyId: family.id,
      action: 'family.create',
      target: family.id,
      details: parsed.data,
    })
  } catch (err) {
    logError(err, { action: 'family.create', familyId: family.id, userId: session.userId })
  }

  return jsonOK(family, 201)
}

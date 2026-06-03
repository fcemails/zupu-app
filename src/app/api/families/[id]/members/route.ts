import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { requireRole, maskSensitive } from '@/lib/permissions'
import { audit } from '@/lib/audit'
import { z } from 'zod'
import { jsonError, jsonOK } from '@/lib/apiResponse'

const MemberSchema = z.object({
  name: z.string().min(1),
  zi: z.string().optional(),
  hao: z.string().optional(),
  sex: z.enum(['M', 'F']).default('M'),
  gen: z.number().int().min(1),
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
  photo: z.string().optional(),
  deceased: z.boolean().default(false),
  parentId: z.string().optional(),
})

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Ctx) {
  const { id: familyId } = await params
  const session = await getSession()
  if (!session) return jsonError('UNAUTHORIZED', 'Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const page = Math.max(Number(searchParams.get('page') ?? '1'), 1)
  const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '50'), 1), 100)
  const skip = (page - 1) * limit

  let role = null
  try {
    role = await requireRole(session.userId, familyId, 'viewer')
  } catch {
    const family = await prisma.family.findUnique({ where: { id: familyId } })
    if (!family || family.access === 'private') {
      return jsonError('FORBIDDEN', 'Forbidden', 403)
    }
  }

  const members = await prisma.person.findMany({
    where: { familyId },
    include: {
      parentRels: { include: { parent: { select: { id: true, name: true } } } },
      childRels: { include: { child: { select: { id: true, name: true } } } },
      spouseRels1: { include: { p2: { select: { id: true, name: true } } } },
      spouseRels2: { include: { p1: { select: { id: true, name: true } } } },
    },
    orderBy: [{ gen: 'asc' }, { name: 'asc' }],
    skip,
    take: limit,
  })

  const masked = members.map(m => maskSensitive(m as unknown as Record<string, unknown>, role, ['burial', 'address', 'phone']))
  return jsonOK({ page, limit, members: masked })
}

export async function POST(req: Request, { params }: Ctx) {
  const { id: familyId } = await params
  const session = await getSession()
  if (!session) return jsonError('UNAUTHORIZED', 'Unauthorized', 401)

  try {
    await requireRole(session.userId, familyId, 'editor')
  } catch {
    return jsonError('FORBIDDEN', 'Forbidden', 403)
  }

  const body = await req.json().catch(() => null)
  const parsed = MemberSchema.safeParse(body)
  if (!parsed.success) return jsonError('INVALID_PARAMS', '参数错误', 400, parsed.error.issues)

  const { parentId, ...data } = parsed.data
  const person = await prisma.person.create({
    data: { ...data, familyId },
  })

  if (parentId) {
    await prisma.relationship.create({
      data: { parentId, childId: person.id },
    }).catch(() => {})
  }

  try {
    await audit({
      userId: session.userId,
      familyId,
      action: 'member.create',
      target: person.id,
      details: { ...data, parentId },
    })
  } catch (err) {
    console.error('Member create audit failed:', err)
  }

  return jsonOK(person, 201)
}

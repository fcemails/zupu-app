import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { requireRole, maskSensitive } from '@/lib/permissions'
import { z } from 'zod'

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

export async function GET(_req: Request, { params }: Ctx) {
  const { id: familyId } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let role = null
  try {
    role = await requireRole(session.userId, familyId, 'viewer')
  } catch {
    const family = await prisma.family.findUnique({ where: { id: familyId } })
    if (!family || family.access === 'private') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
  })

  const masked = members.map(m => maskSensitive(m as unknown as Record<string, unknown>, role, ['burial', 'address', 'phone']))
  return NextResponse.json(masked)
}

export async function POST(req: Request, { params }: Ctx) {
  const { id: familyId } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await requireRole(session.userId, familyId, 'editor')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = MemberSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: '参数错误', details: parsed.error.issues }, { status: 400 })

  const { parentId, ...data } = parsed.data
  const person = await prisma.person.create({
    data: { ...data, familyId },
  })

  if (parentId) {
    await prisma.relationship.create({
      data: { parentId, childId: person.id },
    }).catch(() => {})
  }

  return NextResponse.json(person, { status: 201 })
}

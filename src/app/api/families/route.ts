import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreateSchema = z.object({
  surname: z.string().min(1),
  tang: z.string().min(1),
  region: z.string().optional(),
  era: z.string().optional(),
  motto: z.string().optional(),
  zibei: z.string().optional(),
  access: z.enum(['public', 'semi', 'private']).default('semi'),
})

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accesses = await prisma.familyAccess.findMany({
    where: { userId: session.userId },
    include: {
      family: {
        include: { _count: { select: { members: true, events: true } } },
      },
    },
    orderBy: { family: { createdAt: 'asc' } },
  })

  return NextResponse.json(accesses.map(a => ({
    ...a.family,
    role: a.role,
    memberCount: a.family._count.members,
    eventCount: a.family._count.events,
  })))
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: '参数错误' }, { status: 400 })

  const family = await prisma.family.create({
    data: {
      ...parsed.data,
      accessList: { create: { userId: session.userId, role: 'owner' } },
    },
  })

  return NextResponse.json(family, { status: 201 })
}

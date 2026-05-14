import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/permissions'
import { z } from 'zod'

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
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await requireRole(session.userId, id, 'viewer')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const family = await prisma.family.findUnique({
    where: { id },
    include: { _count: { select: { members: true, events: true } } },
  })
  if (!family) return NextResponse.json({ error: '族谱不存在' }, { status: 404 })
  return NextResponse.json(family)
}

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await requireRole(session.userId, id, 'admin')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: '参数错误' }, { status: 400 })

  const family = await prisma.family.update({ where: { id }, data: parsed.data })
  return NextResponse.json(family)
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await requireRole(session.userId, id, 'owner')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.family.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

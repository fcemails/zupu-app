import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/permissions'
import { z } from 'zod'

const EventSchema = z.object({
  year: z.number().int().optional(),
  yearText: z.string().optional(),
  title: z.string().min(1),
  desc: z.string().optional(),
  actors: z.array(z.string()).optional(),
  major: z.boolean().default(false),
})

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { id: familyId } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await requireRole(session.userId, familyId, 'viewer')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const events = await prisma.familyEvent.findMany({
    where: { familyId },
    orderBy: [{ year: 'desc' }, { id: 'desc' }],
  })
  return NextResponse.json(events)
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
  const parsed = EventSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: '参数错误' }, { status: 400 })

  const { actors, ...rest } = parsed.data
  const event = await prisma.familyEvent.create({
    data: { ...rest, familyId, actors: actors ? JSON.stringify(actors) : null },
  })
  return NextResponse.json(event, { status: 201 })
}

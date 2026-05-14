import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { requireRole, maskSensitive } from '@/lib/permissions'
import { z } from 'zod'

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
})

type Ctx = { params: Promise<{ id: string; personId: string }> }

export async function PUT(req: Request, { params }: Ctx) {
  const { id: familyId, personId } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let role
  try {
    role = await requireRole(session.userId, familyId, 'editor')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: '参数错误' }, { status: 400 })

  const person = await prisma.person.update({
    where: { id: personId, familyId },
    data: parsed.data,
  })

  return NextResponse.json(maskSensitive(person as unknown as Record<string, unknown>, role, ['burial', 'address', 'phone']))
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id: familyId, personId } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await requireRole(session.userId, familyId, 'admin')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.person.delete({ where: { id: personId, familyId } })
  return NextResponse.json({ ok: true })
}

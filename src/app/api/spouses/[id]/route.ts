import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/permissions'

type Ctx = { params: Promise<{ id: string }> }

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const spouse = await prisma.spouse.findUnique({
    where: { id },
    include: { p1: { select: { familyId: true } } },
  })
  if (!spouse) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    await requireRole(session.userId, spouse.p1.familyId, 'editor')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.spouse.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const spouse = await prisma.spouse.findUnique({
    where: { id },
    include: { p1: { select: { familyId: true } } },
  })
  if (!spouse) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    await requireRole(session.userId, spouse.p1.familyId, 'editor')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { label } = await req.json().catch(() => ({}))
  const updated = await prisma.spouse.update({
    where: { id },
    data: { label: label ?? null },
  })
  return NextResponse.json(updated)
}

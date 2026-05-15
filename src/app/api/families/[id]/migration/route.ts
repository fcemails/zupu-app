import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/permissions'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { id: familyId } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await requireRole(session.userId, familyId, 'viewer')
  } catch {
    const family = await prisma.family.findUnique({ where: { id: familyId } })
    if (!family || family.access === 'private') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const raw = await prisma.person.findMany({
    where: { familyId },
    select: {
      id: true, name: true, zi: true, sex: true, gen: true, branch: true,
      birth: true, death: true, deceased: true,
      lat: true, lng: true,
      parentRels: { select: { parentId: true } },
    },
    orderBy: [{ gen: 'asc' }, { name: 'asc' }],
  })

  const members = raw.map(({ parentRels, ...m }) => ({
    ...m,
    parentIds: parentRels.map(r => r.parentId),
  }))

  return NextResponse.json({ members })
}

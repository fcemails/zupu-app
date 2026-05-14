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
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [family, members, relationships, events] = await Promise.all([
    prisma.family.findUnique({ where: { id: familyId } }),
    prisma.person.findMany({ where: { familyId }, orderBy: [{ gen: 'asc' }, { name: 'asc' }] }),
    prisma.relationship.findMany({
      where: { parent: { familyId } },
      select: { parentId: true, childId: true },
    }),
    prisma.familyEvent.findMany({ where: { familyId }, orderBy: { year: 'asc' } }),
  ])

  if (!family) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const payload = {
    exportedAt: new Date().toISOString(),
    family: {
      id: family.id, surname: family.surname, tang: family.tang,
      region: family.region, era: family.era, motto: family.motto, zibei: family.zibei,
    },
    members: members.map(m => ({
      id: m.id, name: m.name, zi: m.zi, hao: m.hao, sex: m.sex,
      gen: m.gen, branch: m.branch, birth: m.birth, death: m.death,
      lifespan: m.lifespan, title: m.title, bio: m.bio, deceased: m.deceased,
    })),
    relationships,
    events: events.map(e => ({
      id: e.id, year: e.year, yearText: e.yearText, title: e.title,
      desc: e.desc, major: e.major,
      actors: e.actors ? JSON.parse(e.actors) : [],
    })),
  }

  const filename = `${family.surname}氏${family.tang}_${new Date().toISOString().slice(0, 10)}.json`
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getUserRole } from '@/lib/permissions'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') ?? '').trim()
  const familyId = searchParams.get('familyId') ?? ''

  if (!q || q.length < 1) return NextResponse.json({ members: [], events: [] })
  if (!familyId) return NextResponse.json({ error: 'familyId required' }, { status: 400 })

  const role = await getUserRole(session.userId, familyId)
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [members, events] = await Promise.all([
    prisma.person.findMany({
      where: {
        familyId,
        OR: [
          { name: { contains: q } },
          { zi: { contains: q } },
          { hao: { contains: q } },
          { branch: { contains: q } },
          { title: { contains: q } },
          { bio: { contains: q } },
        ],
      },
      select: { id: true, name: true, zi: true, gen: true, branch: true, sex: true, deceased: true },
      take: 10,
    }),
    prisma.familyEvent.findMany({
      where: {
        familyId,
        OR: [
          { title: { contains: q } },
          { desc: { contains: q } },
        ],
      },
      select: { id: true, title: true, yearText: true, year: true, major: true },
      take: 6,
    }),
  ])

  return NextResponse.json({ members, events })
}

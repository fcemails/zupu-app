import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getUserRole } from '@/lib/permissions'
import { jsonError, jsonOK } from '@/lib/apiResponse'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return jsonError('UNAUTHORIZED', 'Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') ?? '').trim()
  const familyId = searchParams.get('familyId') ?? ''

  if (!q || q.length < 1) return jsonOK({ members: [], events: [] })
  if (!familyId) return jsonError('MISSING_PARAM', 'familyId required', 400)

  const role = await getUserRole(session.userId, familyId)
  if (!role) return jsonError('FORBIDDEN', 'Forbidden', 403)

  const page = Math.max(Number(searchParams.get('page') ?? '1'), 1)
  const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '10'), 1), 50)
  const skip = (page - 1) * limit

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
      take: limit,
      skip,
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
      take: limit,
      skip,
    }),
  ])

  return jsonOK({ page, limit, members, events })
}

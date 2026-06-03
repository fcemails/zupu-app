import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/permissions'
import { audit } from '@/lib/audit'
import { z } from 'zod'
import { jsonError, jsonOK } from '@/lib/apiResponse'

const CreateSchema = z.object({
  p1Id: z.string().min(1),
  p2Id: z.string().min(1),
  label: z.string().optional(),
})

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return jsonError('UNAUTHORIZED', 'Unauthorized', 401)

  const body = await req.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return jsonError('INVALID_PARAMS', '参数错误', 400, parsed.error.issues)

  const { p1Id, p2Id, label } = parsed.data
  if (p1Id === p2Id) return jsonError('INVALID_RELATION', '不能与自己结为配偶', 400)

  const persons = await prisma.person.findMany({
    where: { id: { in: [p1Id, p2Id] } },
    select: { id: true, familyId: true },
  })
  if (persons.length !== 2) return jsonError('NOT_FOUND', '人员不存在', 404)
  if (persons[0].familyId !== persons[1].familyId) {
    return jsonError('INVALID_FAMILY', '两人不属于同一族谱', 400)
  }

  const familyId = persons[0].familyId
  try {
    await requireRole(session.userId, familyId, 'editor')
  } catch {
    return jsonError('FORBIDDEN', 'Forbidden', 403)
  }

  const existing = await prisma.spouse.findFirst({
    where: {
      OR: [
        { p1Id, p2Id },
        { p1Id: p2Id, p2Id: p1Id },
      ],
    },
  })
  if (existing) return jsonError('CONFLICT', '配偶关系已存在', 409)

  const spouse = await prisma.spouse.create({
    data: { p1Id, p2Id, label: label || null },
    include: {
      p2: { select: { id: true, name: true, zi: true, sex: true, gen: true } },
    },
  })

  await audit({
    userId: session.userId,
    familyId,
    action: 'spouse.create',
    target: spouse.id,
    details: { p1Id, p2Id, label: label || null },
  })

  return jsonOK({ spouseRecordId: spouse.id, label: spouse.label, ...spouse.p2 }, 201)
}

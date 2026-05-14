import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/permissions'
import { z } from 'zod'

const CreateSchema = z.object({
  p1Id: z.string().min(1),
  p2Id: z.string().min(1),
  label: z.string().optional(),
})

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: '参数错误' }, { status: 400 })

  const { p1Id, p2Id, label } = parsed.data
  if (p1Id === p2Id) return NextResponse.json({ error: '不能与自己结为配偶' }, { status: 400 })

  // Verify both persons exist and belong to the same family the user has access to
  const persons = await prisma.person.findMany({
    where: { id: { in: [p1Id, p2Id] } },
    select: { id: true, familyId: true },
  })
  if (persons.length !== 2) return NextResponse.json({ error: '人员不存在' }, { status: 404 })
  if (persons[0].familyId !== persons[1].familyId) {
    return NextResponse.json({ error: '两人不属于同一族谱' }, { status: 400 })
  }

  const familyId = persons[0].familyId
  try {
    await requireRole(session.userId, familyId, 'editor')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Check if relationship already exists (either direction)
  const existing = await prisma.spouse.findFirst({
    where: {
      OR: [
        { p1Id, p2Id },
        { p1Id: p2Id, p2Id: p1Id },
      ],
    },
  })
  if (existing) return NextResponse.json({ error: '配偶关系已存在' }, { status: 409 })

  const spouse = await prisma.spouse.create({
    data: { p1Id, p2Id, label: label || null },
    include: {
      p2: { select: { id: true, name: true, zi: true, sex: true, gen: true } },
    },
  })

  return NextResponse.json({ spouseRecordId: spouse.id, label: spouse.label, ...spouse.p2 }, { status: 201 })
}

import { getFamily } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import { hasPermission, maskSensitive } from '@/lib/permissions'
import TreeClient from './TreeClient'

type Props = { params: Promise<{ familyId: string }> }

export default async function TreePage({ params }: Props) {
  const { familyId } = await params
  const { family, role } = await getFamily(familyId)

  const [rawMembers, relationships] = await Promise.all([
    prisma.person.findMany({
      where: { familyId },
      orderBy: [{ gen: 'asc' }, { name: 'asc' }],
      include: {
        parentRels: { select: { parentId: true } },
        childRels: { select: { childId: true } },
        spouseRels1: {
          select: {
            id: true,
            label: true,
            p2: { select: { id: true, name: true, zi: true, sex: true, gen: true } },
          },
        },
        spouseRels2: {
          select: {
            id: true,
            label: true,
            p1: { select: { id: true, name: true, zi: true, sex: true, gen: true } },
          },
        },
      },
    }),
    prisma.relationship.findMany({
      where: { parent: { familyId } },
      select: { parentId: true, childId: true },
    }),
  ])

  const canSeeSensitive = hasPermission(role, 'editor')

  const members = rawMembers.map(m => {
    const base = maskSensitive(m as unknown as Record<string, unknown>, role, ['burial', 'address', 'phone'])
    return {
      ...base,
      parentIds: m.parentRels.map(r => r.parentId),
      childIds: m.childRels.map(r => r.childId),
      spouses: [
        ...m.spouseRels1.map(s => ({ ...s.p2, label: s.label, spouseRecordId: s.id })),
        ...m.spouseRels2.map(s => ({ ...s.p1, label: s.label, spouseRecordId: s.id })),
      ],
    }
  })

  return (
    <TreeClient
      members={members as never}
      relationships={relationships}
      family={family}
      role={role}
      canSeeSensitive={canSeeSensitive}
    />
  )
}

import { getFamily } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import MembersClient from './MembersClient'

type Props = { params: Promise<{ familyId: string }> }

export default async function MembersPage({ params }: Props) {
  const { familyId } = await params
  const { family, role } = await getFamily(familyId)

  const members = await prisma.person.findMany({
    where: { familyId },
    include: {
      parentRels: { include: { parent: { select: { id: true, name: true } } } },
      childRels: { include: { child: { select: { id: true, name: true } } } },
    },
    orderBy: [{ gen: 'asc' }, { name: 'asc' }],
  })

  return <MembersClient members={members as never} family={family} role={role} />
}

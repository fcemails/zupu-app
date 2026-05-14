import { getFamily } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import TimelineClient from './TimelineClient'

type Props = { params: Promise<{ familyId: string }> }

export default async function TimelinePage({ params }: Props) {
  const { familyId } = await params
  const { family, role } = await getFamily(familyId)

  const events = await prisma.familyEvent.findMany({
    where: { familyId },
    orderBy: [{ year: 'asc' }, { id: 'asc' }],
  })

  return <TimelineClient events={events as never} family={family} role={role} />
}

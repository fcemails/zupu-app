import { getFamily } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import InviteClient from './InviteClient'
import { redirect } from 'next/navigation'
import { hasPermission } from '@/lib/permissions'

type Props = { params: Promise<{ familyId: string }> }

export default async function InvitePage({ params }: Props) {
  const { familyId } = await params
  const { family, role } = await getFamily(familyId)

  if (!hasPermission(role, 'admin')) {
    redirect(`/families/${familyId}/dashboard`)
  }

  const collaborators = await prisma.familyAccess.findMany({
    where: { familyId },
    include: { user: true },
    orderBy: { id: 'asc' },
  })

  const invitations = await prisma.invitation.findMany({
    where: { familyId, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })

  return <InviteClient family={family} role={role} collaborators={collaborators as never} invitations={invitations as never} />
}

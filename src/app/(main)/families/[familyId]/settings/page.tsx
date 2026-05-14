import { getFamily } from '@/lib/dal'
import { hasPermission } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

type Props = { params: Promise<{ familyId: string }> }

export default async function SettingsPage({ params }: Props) {
  const { familyId } = await params
  const { family, role } = await getFamily(familyId)

  if (!hasPermission(role, 'admin')) {
    redirect(`/families/${familyId}/dashboard`)
  }

  return <SettingsClient family={family} role={role} />
}

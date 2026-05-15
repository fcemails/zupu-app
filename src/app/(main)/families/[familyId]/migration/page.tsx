import { getFamily } from '@/lib/dal'
import MigrationClient from './MigrationClient'

type Props = { params: Promise<{ familyId: string }> }

export default async function MigrationPage({ params }: Props) {
  const { familyId } = await params
  const { family, role } = await getFamily(familyId)
  return <MigrationClient family={family} role={role} />
}

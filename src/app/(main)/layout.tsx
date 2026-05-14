import { verifySession, getMyFamilies } from '@/lib/dal'
import AppShell from '@/components/layout/AppShell'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession()
  const accesses = await getMyFamilies()
  const families = accesses.map(a => ({ ...a.family, role: a.role }))

  return (
    <AppShell session={session} families={families}>
      {children}
    </AppShell>
  )
}

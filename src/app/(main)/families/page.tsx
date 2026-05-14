import { redirect } from 'next/navigation'
import { getMyFamilies } from '@/lib/dal'
import Link from 'next/link'

export default async function FamiliesPage() {
  const accesses = await getMyFamilies()
  if (accesses.length > 0) {
    redirect(`/families/${accesses[0].familyId}/dashboard`)
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 24, textAlign: 'center' }}>
      <div className="stamp lg">
        <span>创</span><span>建</span><span>族</span><span>谱</span>
      </div>
      <div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 600, letterSpacing: 4, margin: '0 0 8px' }}>
          尚未创建族谱
        </h2>
        <p style={{ color: 'var(--ink-3)', fontSize: 14, margin: 0 }}>
          您还没有任何族谱，立即创建或加入一个家族
        </p>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <Link href="/families/new" className="btn primary">创建族谱</Link>
        <Link href="/explore" className="btn ghost">浏览族谱广场</Link>
      </div>
    </div>
  )
}

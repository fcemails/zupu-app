import { getFamily } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

type Props = { params: Promise<{ familyId: string }> }

export default async function DashboardPage({ params }: Props) {
  const { familyId } = await params
  const { family, role } = await getFamily(familyId)

  const [members, events, collaborators] = await Promise.all([
    prisma.person.findMany({ where: { familyId }, orderBy: { gen: 'asc' } }),
    prisma.familyEvent.findMany({ where: { familyId }, orderBy: { year: 'desc' }, take: 5 }),
    prisma.familyAccess.findMany({
      where: { familyId },
      include: { user: true },
    }),
  ])

  const maxGen = members.reduce((m, p) => Math.max(m, p.gen), 0)
  const livingCount = members.filter(p => !p.deceased).length

  const ZIBEI = family.zibei ? [...family.zibei].filter(c => c.trim()) : []

  return (
    <div className="page">
      {/* Hero scroll */}
      <div className="hero">
        <div className="scroll-card">
          <div className="title-vert">
            {(family.era || '').split('').map((c, i) => <span key={i}>{c}</span>)}
          </div>
          <div className="clan">{family.surname}氏</div>
          <div className="tang-name">{family.tang}</div>
          {family.motto && <div className="motto">{family.motto}</div>}
          <div className="stats">
            <div className="stat"><div className="n">{members.length}</div><div className="l">在谱族人</div></div>
            <div className="stat"><div className="n">{maxGen}</div><div className="l">传承世代</div></div>
            <div className="stat"><div className="n">{livingCount}</div><div className="l">健在族人</div></div>
            <div className="stat"><div className="n">{events.length}</div><div className="l">大事记录</div></div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card-hd">
            <h2>近期动态</h2>
            <Link href={`/families/${familyId}/timeline`} className="more">查看全部 →</Link>
          </div>
          <ul className="activity-list" style={{ margin: 0, padding: 0 }}>
            {events.slice(0, 4).map(ev => (
              <li key={ev.id}>
                <div className="dot" style={{ fontFamily: 'var(--font-serif)' }}>
                  {ev.major ? '★' : '·'}
                </div>
                <div>
                  <div className="who">{ev.title}</div>
                  <div className="what">{ev.desc?.slice(0, 40)}{ev.desc && ev.desc.length > 40 ? '…' : ''}</div>
                </div>
                <div className="when">{ev.year ? `${ev.year}年` : ev.yearText ?? ''}</div>
              </li>
            ))}
            {events.length === 0 && (
              <li style={{ color: 'var(--ink-4)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>暂无大事记录</li>
            )}
          </ul>
        </div>
      </div>

      {/* KPI grid */}
      <div className="kpi-grid">
        <div className="kpi">
          <div className="lbl">在谱成员</div>
          <div className="v">{members.length}</div>
          <div className="d">{family.surname}氏子孙</div>
        </div>
        <div className="kpi">
          <div className="lbl">传承世代</div>
          <div className="v">{maxGen}世</div>
          <div className="d">{family.era ? `始于${family.era}` : '历代传承'}</div>
        </div>
        <div className="kpi">
          <div className="lbl">协作成员</div>
          <div className="v">{collaborators.length}</div>
          <div className="d">{role === 'owner' || role === 'admin' ? <Link href={`/families/${familyId}/invite`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>管理协作</Link> : '共同维护'}</div>
        </div>
        <div className="kpi">
          <div className="lbl">大事记</div>
          <div className="v">{events.length}</div>
          <div className="d"><Link href={`/families/${familyId}/timeline`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>查看详情</Link></div>
        </div>
      </div>

      {/* Bottom split */}
      <div className="split-2">
        {/* 字辈表 */}
        {ZIBEI.length > 0 && (
          <div className="card">
            <div className="card-hd">
              <h2>字辈表</h2>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {ZIBEI.map((c, i) => (
                <div key={i} style={{ textAlign: 'center', minWidth: 44 }}>
                  <div style={{ fontSize: 10, color: 'var(--ink-4)', letterSpacing: 1 }}>第{i + 1}辈</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 600, color: 'var(--accent)', marginTop: 4 }}>{c}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 协作者 */}
        <div className="card">
          <div className="card-hd">
            <h2>协作成员</h2>
            {(role === 'owner' || role === 'admin') && (
              <Link href={`/families/${familyId}/invite`} className="more">管理 →</Link>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {collaborators.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                <div className="avatar" style={{ width: 28, height: 28, fontSize: 12 }}>{c.user.name[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{c.user.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{c.user.email}</div>
                </div>
                <span className={`role-pill ${c.role}`}>
                  {c.role === 'owner' ? '谱主' : c.role === 'admin' ? '管理员' : c.role === 'editor' ? '编辑' : '查看'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

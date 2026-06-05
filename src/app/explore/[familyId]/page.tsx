import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ familyId: string }> }

export default async function PublicFamilyPage({ params }: Props) {
  const { familyId } = await params
  const session = await getSession()

  const family = await prisma.family.findUnique({
    where: { id: familyId },
    include: {
      _count: { select: { members: true, events: true } },
      accessList: { where: { role: 'owner' }, include: { user: { select: { name: true } } }, take: 1 },
    },
  })

  if (!family || family.access === 'private') notFound()

  const [members, events] = await Promise.all([
    prisma.person.findMany({
      where: { familyId },
      orderBy: [{ gen: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, zi: true, gen: true, branch: true, sex: true, deceased: true, birth: true, death: true },
    }),
    prisma.familyEvent.findMany({
      where: { familyId },
      orderBy: [{ year: 'asc' }, { id: 'asc' }],
      select: { id: true, title: true, desc: true, year: true, yearText: true, major: true },
    }),
  ])

  const maxGen = members.reduce((m, p) => Math.max(m, p.gen), 0)
  const livingCount = members.filter(p => !p.deceased).length
  const ZIBEI = family.zibei ? [...family.zibei].filter(c => c.trim()) : []
  const owner = family.accessList[0]?.user

  // Group members by generation
  const byGen: Record<number, typeof members> = {}
  for (const m of members) {
    if (!byGen[m.gen]) byGen[m.gen] = []
    byGen[m.gen].push(m)
  }
  const gens = Object.keys(byGen).map(Number).sort((a, b) => a - b)

  return (
    <div className="explore-shell">
      <header className="explore-topbar">
        <div className="brand">
          <div className="seal" style={{ width: 32, height: 32, background: 'var(--accent)', color: '#f6e9d3', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 13, borderRadius: 4, boxShadow: 'inset 0 0 0 2px var(--accent), inset 0 0 0 3px #f6e9d3', transform: 'rotate(-2deg)' }}>谱</div>
          <div className="name" style={{ fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 600, letterSpacing: 1 }}>
            族谱广场
            <small style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 400, color: 'var(--ink-3)', letterSpacing: 2, marginTop: 2 }}>EXPLORE</small>
          </div>
        </div>
        <Link href="/explore" style={{ fontSize: 13, color: 'var(--ink-3)', textDecoration: 'none', marginRight: 'auto', marginLeft: 20 }}>
          ← 返回广场
        </Link>
        {session
          ? <Link href="/families" className="btn primary sm">我的族谱</Link>
          : <Link href="/login" className="btn primary sm">登录 / 注册</Link>}
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Family hero */}
        <div className="hero" style={{ marginBottom: 32 }}>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Family meta */}
            <div className="card">
              <div className="card-hd"><h2>基本信息</h2></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                {family.region && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: 'var(--ink-3)', width: 64, flexShrink: 0 }}>发源地</span>
                    <span style={{ color: 'var(--ink)' }}>{family.region}</span>
                  </div>
                )}
                {family.era && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: 'var(--ink-3)', width: 64, flexShrink: 0 }}>始迁年代</span>
                    <span style={{ color: 'var(--ink)' }}>{family.era}</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: 'var(--ink-3)', width: 64, flexShrink: 0 }}>公开状态</span>
                  <span className={`chip${family.access === 'public' ? '' : ' qing'}`} style={{ fontSize: 11 }}>
                    {family.access === 'public' ? '完全公开' : '半公开'}
                  </span>
                </div>
                {owner && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: 'var(--ink-3)', width: 64, flexShrink: 0 }}>谱主</span>
                    <span style={{ color: 'var(--ink)' }}>{owner.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Recent events */}
            {events.length > 0 && (
              <div className="card">
                <div className="card-hd"><h2>近期大事</h2></div>
                <ul className="activity-list" style={{ margin: 0, padding: 0 }}>
                  {events.slice(-4).reverse().map(ev => (
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
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* KPI row */}
        <div className="kpi-grid" style={{ marginBottom: 32 }}>
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
            <div className="lbl">大事记录</div>
            <div className="v">{events.length}</div>
            <div className="d">家族历史事件</div>
          </div>
          <div className="kpi">
            <div className="lbl">健在族人</div>
            <div className="v">{livingCount}</div>
            <div className="d">在世成员</div>
          </div>
        </div>

        {/* Zibei */}
        {ZIBEI.length > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-hd"><h2>字辈表</h2></div>
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

        {/* Members by generation */}
        {members.length > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-hd">
              <h2>族人名录</h2>
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{members.length} 人</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {gens.map(gen => (
                <div key={gen}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-4)', letterSpacing: 2, marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--line)' }}>
                    第 {gen} 世
                    {ZIBEI[gen - 1] && <span style={{ marginLeft: 8, fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--accent)' }}>字辈「{ZIBEI[gen - 1]}」</span>}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {byGen[gen].map(m => (
                      <div key={m.id} style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        padding: '6px 12px', borderRadius: 6,
                        background: 'var(--surface)',
                        border: '1px solid var(--line)',
                        fontSize: 13,
                      }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%',
                          display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600,
                          background: m.sex === 'F' ? '#fce7f3' : 'var(--line-2)',
                          color: m.sex === 'F' ? '#9d174d' : 'var(--ink-2)',
                          flexShrink: 0,
                        }}>
                          {m.name[0]}
                        </div>
                        <span style={{ fontWeight: 500, color: m.deceased ? 'var(--ink-3)' : 'var(--ink)' }}>
                          {m.name}
                          {m.deceased && <span style={{ marginLeft: 3, fontSize: 11 }}>†</span>}
                        </span>
                        {m.zi && <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>字{m.zi}</span>}
                        {m.branch && <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{m.branch}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Events timeline */}
        {events.length > 0 && (
          <div className="card">
            <div className="card-hd"><h2>大事记</h2></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {events.map((ev, i) => (
                <div key={ev.id} style={{
                  display: 'flex', gap: 16, paddingBottom: i < events.length - 1 ? 20 : 0,
                  position: 'relative',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 20 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                      background: ev.major ? 'var(--accent)' : 'var(--line-2)',
                      border: `2px solid ${ev.major ? 'var(--accent)' : 'var(--line)'}`,
                    }} />
                    {i < events.length - 1 && (
                      <div style={{ flex: 1, width: 1, background: 'var(--line)', marginTop: 4 }} />
                    )}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 500, color: 'var(--ink)', fontSize: 14 }}>{ev.title}</span>
                      {ev.major && <span className="chip" style={{ fontSize: 10 }}>重大</span>}
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-4)', whiteSpace: 'nowrap' }}>
                        {ev.year ? `${ev.year}年` : ev.yearText ?? ''}
                      </span>
                    </div>
                    {ev.desc && (
                      <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6 }}>{ev.desc}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!session && (
          <div style={{ marginTop: 32, padding: '24px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 8, letterSpacing: 2 }}>
              登录后可管理或创建您自己的族谱
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>
              汇聚万千家族的数字宗谱，传承中华血脉文化
            </div>
            <Link href="/login" className="btn primary">立即登录 / 注册</Link>
          </div>
        )}
      </div>
    </div>
  )
}

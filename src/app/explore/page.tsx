import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ExplorePage() {
  const session = await getSession()
  const families = await prisma.family.findMany({
    where: { access: { in: ['public', 'semi'] } },
    include: {
      _count: { select: { members: true, events: true } },
      accessList: { take: 1, where: { role: 'owner' }, include: { user: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

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
        <div style={{ flex: 1 }} />
        {session
          ? <Link href="/families" className="btn primary sm">我的族谱</Link>
          : <Link href="/login" className="btn primary sm">登录 / 注册</Link>}
      </header>

      <div className="explore-hero">
        <div className="explore-hero-inner">
          <h1 className="explore-h1">族 谱 广 场</h1>
          <p className="explore-h-sub">
            汇聚万千家族的数字宗谱，传承中华血脉文化。<br />
            在此寻根问祖，共续家族薪火。
          </p>
          <div className="explore-chips">
            <span className="chip qing">{families.length} 部族谱</span>
            <span className="chip accent">公开收录</span>
          </div>
        </div>
        <div className="explore-hero-stamp">
          <div className="stamp lg" style={{ width: 90, height: 90, fontSize: 26 }}>
            <span>寻</span><span>根</span><span>问</span><span>祖</span>
          </div>
        </div>
      </div>

      <div className="explore-grid" style={{ paddingTop: 48 }}>
        {families.map(f => {
          const owner = f.accessList[0]?.user
          return (
            <div key={f.id} className="fam-card">
              <div className="fam-card-top">
                <div className="fam-stamp">
                  <div className="big">{f.surname}</div>
                  <div className="small">氏</div>
                </div>
                <div>
                  <div className="fam-tang">{f.tang}</div>
                  <div className="fam-sub">{f.region ?? ''}{f.era ? ` · ${f.era}` : ''}</div>
                </div>
                <span className={`chip${f.access === 'public' ? '' : ' qing'}`} style={{ fontSize: 10 }}>
                  {f.access === 'public' ? '公开' : '半公开'}
                </span>
              </div>
              {f.motto && <div className="fam-desc">{f.motto}</div>}
              <div className="fam-stats">
                <div className="fs"><div className="n">{f._count.members}</div><div className="l">族人</div></div>
                <div className="fs"><div className="n">{f._count.events}</div><div className="l">大事</div></div>
                <div className="fs"><div className="n" style={{ fontSize: 13 }}>{f.surname}</div><div className="l">姓氏</div></div>
                <div className="fs"><div className="n" style={{ fontSize: 11 }}>—</div><div className="l">世代</div></div>
              </div>
              <div className="fam-foot">
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  {owner ? `谱主：${owner.name}` : ''}
                </span>
                <Link
                  href={`/explore/${f.id}`}
                  className="fam-link"
                >进入查看 →</Link>
              </div>
            </div>
          )
        })}
        {families.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: 'var(--ink-3)' }}>
            暂无公开族谱，
            <Link href={session ? '/families/new' : '/login'} style={{ color: 'var(--accent)' }}>
              {session ? '立即创建您的族谱' : '登录后创建您的族谱'}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

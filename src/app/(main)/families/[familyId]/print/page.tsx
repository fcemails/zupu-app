import { getFamily } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import PrintButton from './PrintButton'

type Props = { params: Promise<{ familyId: string }> }

const CN_NUM = ['一','二','三','四','五','六','七','八','九','十',
  '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十']
const cnNum = (n: number) => CN_NUM[n - 1] ?? String(n)

export default async function PrintPage({ params }: Props) {
  const { familyId } = await params
  const { family } = await getFamily(familyId)

  const [members, rels, spouses] = await Promise.all([
    prisma.person.findMany({
      where: { familyId },
      orderBy: [{ gen: 'asc' }, { name: 'asc' }],
    }),
    prisma.relationship.findMany({
      where: { parent: { familyId } },
    }),
    prisma.spouse.findMany({
      where: { p1: { familyId } },
      include: { p1: true, p2: true },
    }),
  ])

  const byGen: Record<number, typeof members> = {}
  for (const m of members) {
    if (!byGen[m.gen]) byGen[m.gen] = []
    byGen[m.gen].push(m)
  }

  const childrenOf: Record<string, string[]> = {}
  for (const r of rels) {
    if (!childrenOf[r.parentId]) childrenOf[r.parentId] = []
    childrenOf[r.parentId].push(r.childId)
  }

  const memberMap = Object.fromEntries(members.map(m => [m.id, m]))

  const spousesOf: Record<string, { name: string; label: string | null }[]> = {}
  for (const s of spouses) {
    const p1id = s.p1Id, p2id = s.p2Id
    if (!spousesOf[p1id]) spousesOf[p1id] = []
    spousesOf[p1id].push({ name: s.p2.name, label: s.label })
    if (!spousesOf[p2id]) spousesOf[p2id] = []
    spousesOf[p2id].push({ name: s.p1.name, label: s.label })
  }

  const gens = Object.keys(byGen).map(Number).sort((a, b) => a - b)
  const ZIBEI = family.zibei ? [...family.zibei].filter(c => c.trim()) : []

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700&display=swap');

        :root {
          --ink: #1c1814;
          --ink-3: #6a6052;
          --ink-4: #9b917f;
          --line: rgba(28,24,20,.18);
          --accent: #8a1717;
          --font-serif: "Noto Serif SC", "Songti SC", "SimSun", serif;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #f5efe2;
          color: var(--ink);
          font-family: var(--font-serif);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .print-shell {
          max-width: 900px;
          margin: 0 auto;
          padding: 32px 24px 60px;
        }

        /* ── screen-only controls ── */
        .screen-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 32px;
          padding: 14px 18px;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 8px;
        }
        @media print { .screen-bar { display: none !important; } }

        /* ── title page ── */
        .title-page {
          text-align: center;
          padding: 60px 0 48px;
          border-bottom: 3px double var(--line);
          margin-bottom: 48px;
          page-break-after: always;
        }
        .title-page .clan-name {
          font-size: 48px;
          font-weight: 700;
          letter-spacing: 12px;
          color: var(--accent);
          margin-bottom: 16px;
        }
        .title-page .tang-name {
          font-size: 22px;
          letter-spacing: 6px;
          color: var(--ink);
          margin-bottom: 28px;
        }
        .title-page .meta {
          font-size: 14px;
          color: var(--ink-3);
          letter-spacing: 3px;
          line-height: 2;
        }
        .title-page .motto {
          margin: 28px auto 0;
          max-width: 480px;
          font-size: 14px;
          color: var(--ink-3);
          line-height: 2.2;
          letter-spacing: 2px;
          border-top: 1px solid var(--line);
          padding-top: 20px;
        }
        .title-page .zibei-row {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 24px;
        }
        .title-page .zibei-char {
          text-align: center;
          min-width: 48px;
        }
        .title-page .zibei-char .gen-lbl {
          font-size: 10px;
          color: var(--ink-4);
          letter-spacing: 1px;
        }
        .title-page .zibei-char .ch {
          font-size: 28px;
          font-weight: 700;
          color: var(--accent);
          display: block;
        }

        /* ── generation section ── */
        .gen-section {
          margin-bottom: 40px;
          page-break-inside: avoid;
        }
        .gen-heading {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid var(--line);
        }
        .gen-heading .num {
          font-size: 22px;
          font-weight: 700;
          color: var(--accent);
          letter-spacing: 2px;
          white-space: nowrap;
        }
        .gen-heading .zi-char {
          font-size: 14px;
          color: var(--ink-3);
          letter-spacing: 1px;
        }
        .gen-heading .count {
          margin-left: auto;
          font-size: 12px;
          color: var(--ink-4);
          letter-spacing: 1px;
        }

        /* ── person cards grid ── */
        .person-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }

        .person-card {
          border: 1px solid var(--line);
          border-top: 3px solid var(--accent);
          padding: 14px;
          background: #fff;
          page-break-inside: avoid;
          position: relative;
        }
        .person-card.female {
          border-top-color: #9d6b8e;
        }

        .person-card .card-top {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          margin-bottom: 10px;
        }
        .person-card .portrait {
          width: 48px;
          height: 60px;
          border: 1px solid var(--line);
          overflow: hidden;
          flex-shrink: 0;
          background: #f5efe2;
          display: grid;
          place-items: center;
        }
        .person-card .portrait img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .person-card .portrait .char {
          font-size: 20px;
          font-weight: 700;
          color: var(--ink-3);
        }

        .person-card .name-block .name {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 2px;
          color: var(--ink);
          line-height: 1.2;
        }
        .person-card .name-block .subname {
          font-size: 12px;
          color: var(--ink-3);
          margin-top: 3px;
          letter-spacing: 1px;
        }
        .person-card .name-block .title-tag {
          display: inline-block;
          font-size: 10px;
          padding: 1px 6px;
          border: 1px solid var(--accent);
          color: var(--accent);
          border-radius: 2px;
          margin-top: 4px;
          letter-spacing: 1px;
        }

        .person-card .info-row {
          font-size: 12px;
          color: var(--ink-3);
          line-height: 1.9;
          letter-spacing: 0.5px;
        }
        .person-card .info-row .k {
          color: var(--ink-4);
          margin-right: 4px;
        }

        .person-card .bio-text {
          margin-top: 8px;
          font-size: 11.5px;
          color: var(--ink-3);
          line-height: 1.9;
          letter-spacing: 0.5px;
          border-top: 1px dashed var(--line);
          padding-top: 8px;
        }

        .person-card .children-row {
          margin-top: 8px;
          font-size: 11px;
          color: var(--ink-4);
          letter-spacing: 0.5px;
          border-top: 1px dashed var(--line);
          padding-top: 6px;
        }

        .deceased-mark {
          position: absolute;
          top: 8px;
          right: 10px;
          font-size: 13px;
          color: var(--ink-4);
        }

        /* ── footer ── */
        .print-footer {
          margin-top: 60px;
          text-align: center;
          font-size: 12px;
          color: var(--ink-4);
          letter-spacing: 2px;
          border-top: 1px solid var(--line);
          padding-top: 20px;
        }

        @media print {
          body { background: #fff; }
          .print-shell { padding: 0; max-width: 100%; }
          .gen-section { page-break-inside: auto; }
          .person-card { break-inside: avoid; }
        }
      `}</style>

      <div className="print-shell">
        {/* Screen-only controls */}
        <div className="screen-bar">
          <Link href={`/families/${familyId}/tree`} style={{ fontSize: 13, color: 'var(--ink-3)', textDecoration: 'none' }}>
            ← 返回族谱树
          </Link>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>
            共 {members.length} 位族人 · {gens.length} 世
          </span>
          <PrintButton />
        </div>

        {/* Title page */}
        <div className="title-page">
          <div className="clan-name">{family.surname}氏宗谱</div>
          <div className="tang-name">{family.tang}</div>
          <div className="meta">
            {family.region && <div>始迁地 · {family.region}</div>}
            {family.era && <div>年代 · {family.era}</div>}
            <div>在谱族人 {members.length} 位 · 共 {gens.length} 世</div>
          </div>
          {ZIBEI.length > 0 && (
            <>
              <div className="meta" style={{ marginTop: 20 }}>字辈表</div>
              <div className="zibei-row">
                {ZIBEI.map((c, i) => (
                  <div key={i} className="zibei-char">
                    <div className="gen-lbl">第{cnNum(i + 1)}世</div>
                    <span className="ch">{c}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {family.motto && <div className="motto">{family.motto}</div>}
        </div>

        {/* Generation sections */}
        {gens.map(gen => {
          const persons = byGen[gen]
          const ziChar = ZIBEI[gen - 1]
          return (
            <div key={gen} className="gen-section">
              <div className="gen-heading">
                <span className="num">第 {cnNum(gen)} 世</span>
                {ziChar && <span className="zi-char">字辈「{ziChar}」</span>}
                <span className="count">{persons.length} 人</span>
              </div>
              <div className="person-grid">
                {persons.map(m => {
                  const spouseList = spousesOf[m.id] ?? []
                  const childIds = childrenOf[m.id] ?? []
                  const childNames = childIds
                    .map(id => memberMap[id]?.name)
                    .filter(Boolean)
                  return (
                    <div key={m.id} className={`person-card${m.sex === 'F' ? ' female' : ''}`}>
                      {m.deceased && <span className="deceased-mark">†</span>}
                      <div className="card-top">
                        <div className="portrait">
                          {m.photo
                            ? <img src={m.photo} alt={m.name} />
                            : <span className="char">{m.name[m.name.length - 1]}</span>
                          }
                        </div>
                        <div className="name-block">
                          <div className="name">{m.name}</div>
                          <div className="subname">
                            {m.zi && `字 ${m.zi}`}{m.zi && m.hao ? '　' : ''}{m.hao && `号 ${m.hao}`}
                          </div>
                          {m.title && <span className="title-tag">{m.title}</span>}
                        </div>
                      </div>

                      <div className="info-row">
                        {m.branch && (
                          <div><span className="k">房支</span>{m.branch}</div>
                        )}
                        {(m.birth || m.birthLunar) && (
                          <div><span className="k">生</span>{m.birthLunar || m.birth}</div>
                        )}
                        {(m.death || m.deathLunar) && (
                          <div><span className="k">殁</span>{m.deathLunar || m.death}</div>
                        )}
                        {m.lifespan && (
                          <div><span className="k">寿</span>{m.lifespan}</div>
                        )}
                        {spouseList.length > 0 && (
                          <div>
                            <span className="k">配</span>
                            {spouseList.map((s, i) => (
                              <span key={i}>{i > 0 ? '　' : ''}{s.label ? `${s.label}　` : ''}{s.name}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      {m.bio && (
                        <div className="bio-text">{m.bio}</div>
                      )}

                      {childNames.length > 0 && (
                        <div className="children-row">
                          子嗣：{childNames.join('　')}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        <div className="print-footer">
          {family.surname}氏宗谱 · {family.tang} · 数字族谱系统印制
        </div>
      </div>
    </>
  )
}

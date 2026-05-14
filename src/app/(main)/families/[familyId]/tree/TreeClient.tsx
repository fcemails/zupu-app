'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Role } from '@/lib/permissions'

/* ── constants & helpers ─────────────────────────────────── */

const CN_NUM = ['一','二','三','四','五','六','七','八','九','十']
const cnNum = (n: number) => CN_NUM[n - 1] ?? String(n)

const NW = 132, NH = 84, HGAP = 30, VGAP = 80

/* ── types ───────────────────────────────────────────────── */

type SpousePerson = {
  id: string; name: string; zi?: string | null; sex: string; gen: number;
  label?: string | null; spouseRecordId?: string
}
type Person = {
  id: string; name: string; zi?: string | null; hao?: string | null; sex: string;
  gen: number; branch?: string | null;
  birth?: string | null; birthLunar?: string | null;
  death?: string | null; deathLunar?: string | null;
  lifespan?: string | null; title?: string | null; bio?: string | null;
  burial?: string | null; address?: string | null; phone?: string | null;
  photo?: string | null; deceased: boolean;
  parentIds: string[]; childIds: string[]; spouses: SpousePerson[];
}
type Rel = { parentId: string; childId: string }
type Family = { id: string; surname: string; tang: string; zibei?: string | null }

/* ── layout algorithm (bottom-up parent-centering) ───────── */

function computeLayout(members: Person[], rels: Rel[]) {
  if (members.length === 0) {
    return { positions: new Map<string, { x: number; y: number }>(), bounds: { w: 0, h: 0 } }
  }

  const childrenOf: Record<string, string[]> = {}
  const parentsOf: Record<string, string[]> = {}
  for (const m of members) { childrenOf[m.id] = []; parentsOf[m.id] = [] }
  for (const r of rels) {
    childrenOf[r.parentId]?.push(r.childId)
    parentsOf[r.childId]?.push(r.parentId)
  }

  const byGen: Record<number, Person[]> = {}
  for (const m of members) {
    if (!byGen[m.gen]) byGen[m.gen] = []
    byGen[m.gen].push(m)
  }
  const gens = Object.keys(byGen).map(Number).sort((a, b) => a - b)

  // Sort each generation by parent's position in the previous generation
  for (let gi = 1; gi < gens.length; gi++) {
    const prevIdx = Object.fromEntries(byGen[gens[gi - 1]].map((m, i) => [m.id, i]))
    byGen[gens[gi]].sort((a, b) => {
      const pa = parentsOf[a.id][0] != null ? (prevIdx[parentsOf[a.id][0]] ?? 0) : 0
      const pb = parentsOf[b.id][0] != null ? (prevIdx[parentsOf[b.id][0]] ?? 0) : 0
      return pa - pb
    })
  }

  const xPos: Record<string, number> = {}

  // Seed the last generation with sequential positions
  byGen[gens[gens.length - 1]].forEach((m, i) => { xPos[m.id] = i * (NW + HGAP) })

  // Propagate upward: each parent sits centered over its children
  for (let gi = gens.length - 2; gi >= 0; gi--) {
    let prevRight = -Infinity
    byGen[gens[gi]].forEach(m => {
      const kids = childrenOf[m.id].filter(c => xPos[c] !== undefined)
      let x: number
      if (kids.length) {
        const xs = kids.map(c => xPos[c])
        x = (Math.min(...xs) + Math.max(...xs)) / 2
      } else {
        x = prevRight === -Infinity ? 0 : prevRight + NW + HGAP
      }
      x = Math.max(x, prevRight + (prevRight === -Infinity ? 0 : NW + HGAP))
      xPos[m.id] = x
      prevRight = x
    })
  }

  // Center a single child directly under its parent
  for (let gi = 0; gi < gens.length - 1; gi++) {
    byGen[gens[gi]].forEach(m => {
      const cs = childrenOf[m.id].filter(c => xPos[c] !== undefined)
      if (cs.length === 1) xPos[cs[0]] = xPos[m.id]
    })
  }

  // Resolve overlaps within each generation
  gens.forEach(g => {
    const ms = byGen[g].slice().sort((a, b) => xPos[a.id] - xPos[b.id])
    let prevRight = -Infinity
    ms.forEach(m => {
      if (xPos[m.id] < prevRight) xPos[m.id] = prevRight
      prevRight = xPos[m.id] + NW + HGAP
    })
  })

  // Normalize so leftmost node starts at x=0
  let minX = Infinity
  members.forEach(m => { if (xPos[m.id] !== undefined) minX = Math.min(minX, xPos[m.id]) })
  members.forEach(m => { if (xPos[m.id] !== undefined) xPos[m.id] -= minX })

  const positions = new Map<string, { x: number; y: number }>()
  let maxW = 0, maxH = 0
  members.forEach(m => {
    const x = xPos[m.id] ?? 0
    const y = (m.gen - 1) * (NH + VGAP)
    positions.set(m.id, { x, y })
    maxW = Math.max(maxW, x + NW)
    maxH = Math.max(maxH, y + NH)
  })

  return { positions, bounds: { w: maxW, h: maxH } }
}

/* ── orthogonal edge paths ───────────────────────────────── */

function buildEdgePaths(members: Person[], rels: Rel[], positions: Map<string, { x: number; y: number }>): string[] {
  const childrenOf: Record<string, string[]> = {}
  for (const m of members) childrenOf[m.id] = []
  for (const r of rels) { if (childrenOf[r.parentId]) childrenOf[r.parentId].push(r.childId) }

  const paths: string[] = []
  members.forEach(m => {
    childrenOf[m.id].forEach(cid => {
      const a = positions.get(m.id)
      const b = positions.get(cid)
      if (!a || !b) return
      const x1 = a.x + NW / 2, y1 = a.y + NH
      const x2 = b.x + NW / 2, y2 = b.y
      const my = (y1 + y2) / 2
      paths.push(`M${x1} ${y1} V${my} H${x2} V${y2}`)
    })
  })
  return paths
}

/* ── spouse editor (used inside edit panel) ──────────────── */

function SpouseEditor({
  memberId, initialSpouses, allMembers,
}: {
  memberId: string; initialSpouses: SpousePerson[]; allMembers: Person[]
}) {
  const [spouses, setSpouses] = useState<SpousePerson[]>(initialSpouses)
  const [pickId, setPickId] = useState('')
  const [pickLabel, setPickLabel] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const spousePersonIds = new Set(spouses.map(s => s.id))
  const available = allMembers.filter(m => m.id !== memberId && !spousePersonIds.has(m.id))

  async function addSpouse() {
    if (!pickId) { setError('请选择配偶'); return }
    setAdding(true); setError('')
    const res = await fetch('/api/spouses', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ p1Id: memberId, p2Id: pickId, label: pickLabel || undefined }),
    })
    setAdding(false)
    if (res.status === 409) { setError('配偶关系已存在'); return }
    if (!res.ok) { setError('添加失败，请重试'); return }
    const data = await res.json()
    setSpouses(prev => [...prev, { ...data, spouseRecordId: data.spouseRecordId ?? data.id }])
    setPickId(''); setPickLabel('')
  }

  async function removeSpouse(spouseRecordId: string) {
    const res = await fetch(`/api/spouses/${spouseRecordId}`, { method: 'DELETE' })
    if (!res.ok && res.status !== 204) { setError('移除失败'); return }
    setSpouses(prev => prev.filter(s => s.spouseRecordId !== spouseRecordId))
  }

  return (
    <div>
      <div className="rel-list" style={{ marginBottom: 10 }}>
        {spouses.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--ink-4)', padding: '4px 0' }}>尚未录入配偶</div>
        )}
        {spouses.map((s, i) => (
          <div key={s.spouseRecordId ?? s.id} className="r">
            <span style={{ fontFamily: 'var(--font-serif)' }}>{s.name}</span>
            {s.zi && <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>字{s.zi}</span>}
            <span className="role">{s.label || (i === 0 ? '元配' : '继配')}</span>
            {s.spouseRecordId && (
              <button
                type="button"
                onClick={() => removeSpouse(s.spouseRecordId!)}
                style={{ marginLeft: 6, border: 0, background: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 11, padding: 0 }}
              >
                移除
              </button>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="field-input" style={{ flex: '1 1 160px', marginBottom: 0 }}>
          <label style={{ fontSize: 11 }}>添加配偶</label>
          <select title="选择配偶" value={pickId} onChange={e => setPickId(e.target.value)}>
            <option value="">— 从族人中选择 —</option>
            {available.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}{m.zi ? `（字${m.zi}）` : ''} · 第{cnNum(m.gen)}世
              </option>
            ))}
          </select>
        </div>
        <div className="field-input" style={{ width: 90, marginBottom: 0 }}>
          <label style={{ fontSize: 11 }}>称谓</label>
          <input
            value={pickLabel}
            onChange={e => setPickLabel(e.target.value)}
            placeholder="元配/继配"
          />
        </div>
        <button
          type="button" className="btn ghost sm"
          onClick={addSpouse} disabled={adding || !pickId}
          style={{ flexShrink: 0 }}
        >
          {adding ? '添加中…' : '+ 添加'}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--accent)' }}>{error}</div>
      )}
    </div>
  )
}

/* ── section title ───────────────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="form-section-title"><span className="dot" />{children}</div>
}

/* ── member view panel ───────────────────────────────────── */

function MemberViewPanel({
  member, family, allMembers, onNavigate, canSeeSensitive,
}: {
  member: Person; family: Family; allMembers: Person[];
  onNavigate: (id: string) => void; canSeeSensitive: boolean
}) {
  const [showBurial, setShowBurial] = useState(false)
  const zibei = family.zibei ? [...family.zibei].filter(c => c.trim()) : []

  useEffect(() => setShowBurial(false), [member.id])

  const parent = member.parentIds[0] ? allMembers.find(m => m.id === member.parentIds[0]) : null
  const children = member.childIds
    .map(id => allMembers.find(m => m.id === id))
    .filter(Boolean) as Person[]

  const yearMatch = (s: string | null | undefined) =>
    s ? (s.match(/\d{4}/) || [''])[0] : ''

  return (
    <>
      {/* Portrait + name */}
      <div className="member-hero">
        <div className="portrait">
          {member.photo ? (
            <img src={member.photo} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
          ) : (
            <>
              <span>{member.name[member.name.length - 1]}</span>
              <span className="placeholder">画像</span>
            </>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div className="ttl">{member.name}</div>
          <div className="sub">
            {member.zi && <span>字 {member.zi}</span>}
            {member.hao && <span>　号 {member.hao}</span>}
          </div>
          <div className="tags">
            {member.title && <span className="chip accent">{member.title}</span>}
            {member.deceased && <span className="chip">考</span>}
            {member.sex === 'F' && <span className="chip">妣</span>}
          </div>
        </div>
        <div className="stamp">
          <span>{family.surname}</span><span>氏</span><span>宗</span><span>谱</span>
        </div>
      </div>

      {/* 生卒与行第 */}
      <SectionTitle>生卒与行第</SectionTitle>
      <div className="field-grid">
        <div className="field">
          <div className="k">生</div>
          <div className="v">{member.birth || '—'}</div>
        </div>
        <div className="field">
          <div className="k">殁</div>
          <div className="v">{member.death || '—'}</div>
        </div>
        {member.birthLunar && (
          <div className="field">
            <div className="k">生（农历）</div>
            <div className="v">{member.birthLunar}</div>
          </div>
        )}
        {member.deathLunar && (
          <div className="field">
            <div className="k">殁（农历）</div>
            <div className="v">{member.deathLunar}</div>
          </div>
        )}
        <div className="field">
          <div className="k">寿</div>
          <div className="v">{member.lifespan || '—'}</div>
        </div>
        <div className="field">
          <div className="k">字辈</div>
          <div className="v">
            第{cnNum(member.gen)}世{zibei[member.gen - 1] ? ` · ${zibei[member.gen - 1]}字` : ''}
          </div>
        </div>
        <div className="field">
          <div className="k">房支</div>
          <div className="v">{member.branch || '—'}</div>
        </div>
        <div className="field">
          <div className="k" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            墓葬地
            <span style={{ fontSize: 9, color: 'var(--ink-4)', border: '1px solid var(--line)', borderRadius: 2, padding: '0 3px', lineHeight: '14px' }}>隐</span>
          </div>
          {canSeeSensitive ? (
            <div className="v" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className={showBurial ? '' : 'masked'}>
                {showBurial ? (member.burial || '—') : '⬚⬚⬚⬚⬚⬚'}
              </span>
              {member.burial && (
                <button
                  type="button"
                  onClick={() => setShowBurial(v => !v)}
                  style={{ border: 0, background: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0, fontSize: 11 }}
                >
                  {showBurial ? '隐藏' : '显示'}
                </button>
              )}
            </div>
          ) : (
            <div className="v" style={{ color: 'var(--ink-4)' }}>••• 仅成员可见</div>
          )}
        </div>
      </div>

      {/* 生平传略 */}
      {member.bio && (
        <>
          <SectionTitle>生平传略</SectionTitle>
          <div className="bio">{member.bio}</div>
        </>
      )}

      {/* 配偶与子女 */}
      <SectionTitle>配偶与子女</SectionTitle>
      <div className="rel-block">
        <div>
          <h4>配偶</h4>
          <div className="rel-list">
            {member.spouses.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>未录入</div>
            )}
            {member.spouses.map((s, i) => (
              <div key={s.id} className="r" style={{ cursor: 'pointer' }} onClick={() => onNavigate(s.id)}>
                <span style={{ fontFamily: 'var(--font-serif)' }}>{s.name}</span>
                {s.zi && <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>字{s.zi}</span>}
                <span className="role">{s.label || (i === 0 ? '元配' : '继配')}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4>子女</h4>
          <div className="rel-list">
            {children.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>无嗣 · 或未录</div>
            )}
            {children.map(c => (
              <div key={c.id} className="r" style={{ cursor: 'pointer' }} onClick={() => onNavigate(c.id)}>
                <span style={{ fontFamily: 'var(--font-serif)', letterSpacing: 1 }}>{c.name}</span>
                {c.zi && <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>字{c.zi}</span>}
                <span className="role">{c.sex === 'F' ? '女' : '男'} · 第{cnNum(c.gen)}世</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 父辈 */}
      {parent && (
        <>
          <SectionTitle>父 · 上一世</SectionTitle>
          <div className="rel-list">
            <div className="r" style={{ cursor: 'pointer' }} onClick={() => onNavigate(parent.id)}>
              <span style={{ fontFamily: 'var(--font-serif)', letterSpacing: 1 }}>{parent.name}</span>
              {parent.zi && <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>字{parent.zi}</span>}
              <span className="role">第{cnNum(parent.gen)}世</span>
            </div>
          </div>
        </>
      )}
    </>
  )
}

/* ── member edit panel ───────────────────────────────────── */

type EditForm = {
  name: string; zi: string; hao: string; sex: string; gen: string; branch: string;
  birth: string; birthLunar: string; death: string; deathLunar: string;
  lifespan: string; title: string; bio: string;
  burial: string; address: string; phone: string; deceased: boolean;
}

function MemberEditPanel({
  member, familyId, zibei, allMembers, role, onSaved, onCancel, onDeleted,
}: {
  member: Person; familyId: string; zibei: string[]; allMembers: Person[];
  role: Role;
  onSaved: (updated: Person) => void; onCancel: () => void; onDeleted: (id: string) => void
}) {
  const [form, setForm] = useState<EditForm>({
    name: member.name, zi: member.zi ?? '', hao: member.hao ?? '',
    sex: member.sex, gen: String(member.gen), branch: member.branch ?? '',
    birth: member.birth ?? '', birthLunar: member.birthLunar ?? '',
    death: member.death ?? '', deathLunar: member.deathLunar ?? '',
    lifespan: member.lifespan ?? '', title: member.title ?? '', bio: member.bio ?? '',
    burial: member.burial ?? '', address: member.address ?? '', phone: member.phone ?? '',
    deceased: member.deceased,
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const canDelete = role === 'owner' || role === 'admin'

  function set<K extends keyof EditForm>(k: K, v: EditForm[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  const genOptions = zibei.length > 0
    ? zibei.map((c, i) => ({ value: i + 1, label: `第${cnNum(i + 1)}世${c ? ` · ${c}字辈` : ''}` }))
    : Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: `第${cnNum(i + 1)}世` }))

  async function save() {
    if (!form.name.trim()) { setError('姓名不能为空'); return }
    setSaving(true); setError('')
    const body = {
      name: form.name, zi: form.zi || undefined, hao: form.hao || undefined,
      sex: form.sex, gen: +form.gen, branch: form.branch || undefined,
      birth: form.birth || undefined, birthLunar: form.birthLunar || undefined,
      death: form.death || undefined, deathLunar: form.deathLunar || undefined,
      lifespan: form.lifespan || undefined, title: form.title || undefined,
      bio: form.bio || undefined, burial: form.burial || undefined,
      address: form.address || undefined, phone: form.phone || undefined,
      deceased: form.deceased,
    }
    const res = await fetch(`/api/families/${familyId}/members/${member.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (!res.ok) { setError('保存失败，请重试'); return }
    const saved = await res.json()
    onSaved({ ...member, ...saved })
  }

  async function deleteMember() {
    if (!confirm(`确认删除「${member.name}」？\n此操作不可撤销，该族人所有信息将被永久删除。`)) return
    setDeleting(true); setError('')
    const res = await fetch(`/api/families/${familyId}/members/${member.id}`, { method: 'DELETE' })
    setDeleting(false)
    if (!res.ok) { setError('删除失败，请重试'); return }
    onDeleted(member.id)
  }

  return (
    <>
      <div className="invite-banner" style={{ marginBottom: 16 }}>
        <span>正在编辑 <b>{member.name}</b> 的档案</span>
      </div>

      <SectionTitle>基本信息</SectionTitle>
      <div className="form-grid">
        <div className="field-input" style={{ gridColumn: '1 / -1' }}>
          <label>姓名 <span className="req">*</span></label>
          <input value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div className="field-input">
          <label>字</label>
          <input value={form.zi} onChange={e => set('zi', e.target.value)} />
        </div>
        <div className="field-input">
          <label>号</label>
          <input value={form.hao} onChange={e => set('hao', e.target.value)} />
        </div>
        <div className="field-input">
          <label>性别</label>
          <select value={form.sex} onChange={e => set('sex', e.target.value)}>
            <option value="M">男</option>
            <option value="F">女</option>
          </select>
        </div>
        <div className="field-input">
          <label>世次 / 字辈</label>
          <select value={form.gen} onChange={e => set('gen', e.target.value)}>
            {genOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="field-input">
          <label>房支</label>
          <input value={form.branch} onChange={e => set('branch', e.target.value)} placeholder="如「长房」" />
        </div>
        <div className="field-input">
          <label>头衔</label>
          <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="如「进士」「翰林」" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
          <input
            type="checkbox" id="tree-deceased"
            checked={form.deceased}
            onChange={e => set('deceased', e.target.checked)}
            style={{ width: 15, height: 15 }}
          />
          <label htmlFor="tree-deceased" style={{ fontSize: 13, cursor: 'pointer' }}>已殁</label>
        </div>
      </div>

      <SectionTitle>生卒信息</SectionTitle>
      <div className="form-grid">
        <div className="field-input">
          <label>生辰（公历）</label>
          <input value={form.birth} onChange={e => set('birth', e.target.value)} placeholder="如：1479-03-12" />
        </div>
        <div className="field-input">
          <label>生辰（农历 / 干支）</label>
          <input value={form.birthLunar} onChange={e => set('birthLunar', e.target.value)} placeholder="如：明成化十五年己亥二月" />
        </div>
        <div className="field-input">
          <label>殁期（公历）</label>
          <input value={form.death} onChange={e => set('death', e.target.value)} placeholder="如：1551-09-21" />
        </div>
        <div className="field-input">
          <label>殁期（农历）</label>
          <input value={form.deathLunar} onChange={e => set('deathLunar', e.target.value)} placeholder="如：明嘉靖三十年八月廿一" />
        </div>
        <div className="field-input">
          <label>寿</label>
          <input value={form.lifespan} onChange={e => set('lifespan', e.target.value)} placeholder="如：七十二岁" />
        </div>
      </div>

      <SectionTitle>生平传略</SectionTitle>
      <div className="form-grid wide">
        <div className="field-input">
          <label>传略正文</label>
          <textarea
            rows={5}
            value={form.bio}
            onChange={e => set('bio', e.target.value)}
            placeholder="请录入此人生平…"
            style={{ minHeight: 100 }}
          />
          <span className="hint">建议简述：少颖悟、入庠、登第、宦游、晚年归里…</span>
        </div>
      </div>

      <SectionTitle>配偶</SectionTitle>
      <SpouseEditor
        memberId={member.id}
        initialSpouses={member.spouses}
        allMembers={allMembers}
      />

      <SectionTitle>私隐字段</SectionTitle>
      <div className="form-grid">
        <div className="field-input" style={{ gridColumn: '1 / -1' }}>
          <label>
            墓葬地
            <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--ink-4)', border: '1px solid var(--line)', borderRadius: 2, padding: '0 4px' }}>仅谱主可见</span>
          </label>
          <input value={form.burial} onChange={e => set('burial', e.target.value)} />
        </div>
        <div className="field-input">
          <label>现住址</label>
          <input value={form.address} onChange={e => set('address', e.target.value)} />
        </div>
        <div className="field-input">
          <label>联系电话</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)} />
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 12, padding: '8px 12px', background: '#fff0f0', border: '1px solid #fecaca', borderRadius: 6, color: 'var(--accent)', fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {canDelete ? (
          <button
            type="button"
            className="btn ghost"
            onClick={deleteMember}
            disabled={deleting}
            style={{ color: '#c0392b', borderColor: '#fecaca' }}
          >
            {deleting ? '删除中…' : '移除此人'}
          </button>
        ) : <span />}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn ghost" onClick={onCancel}>取消</button>
          <button type="button" className="btn primary" onClick={save} disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </>
  )
}

/* ── member drawer (view/edit wrapper) ───────────────────── */

function MemberDrawer({
  member, family, allMembers, role, canSeeSensitive,
  onClose, onNavigate, onMemberUpdated, onMemberDeleted,
}: {
  member: Person; family: Family; allMembers: Person[];
  role: Role; canSeeSensitive: boolean;
  onClose: () => void
  onNavigate: (id: string) => void
  onMemberUpdated: (m: Person) => void
  onMemberDeleted: (id: string) => void
}) {
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const canEdit = role === 'owner' || role === 'admin' || role === 'editor'
  const zibei = family.zibei ? [...family.zibei].filter(c => c.trim()) : []

  useEffect(() => setMode('view'), [member.id])

  return (
    <>
      <div className="drawer-mask open" onClick={onClose} />
      <div className="drawer open">
        <div className="head">
          <button type="button" className="btn ghost sm" onClick={onClose}>← 返回</button>
          <div style={{ flex: 1, fontSize: 12, color: 'var(--ink-3)', letterSpacing: 1, paddingLeft: 10 }}>
            族谱 · 第{cnNum(member.gen)}世{member.branch ? ` · ${member.branch}` : ''}
          </div>
          {mode === 'view'
            ? canEdit && <button type="button" className="btn primary sm" onClick={() => setMode('edit')}>编辑</button>
            : <button type="button" className="btn ghost sm" onClick={() => setMode('view')}>← 查看</button>
          }
        </div>
        <div className="body">
          {mode === 'view' ? (
            <MemberViewPanel
              member={member}
              family={family}
              allMembers={allMembers}
              onNavigate={onNavigate}
              canSeeSensitive={canSeeSensitive}
            />
          ) : (
            <MemberEditPanel
              member={member}
              familyId={family.id}
              zibei={zibei}
              allMembers={allMembers}
              role={role}
              onSaved={updated => { onMemberUpdated(updated); setMode('view') }}
              onCancel={() => setMode('view')}
              onDeleted={onMemberDeleted}
            />
          )}
        </div>
      </div>
    </>
  )
}

/* ── branch table (房支总表) ─────────────────────────────── */

function BranchTable({
  members, family, onOpen,
}: {
  members: Person[]; family: Family; onOpen: (m: Person) => void
}) {
  const byGen: Record<number, Person[]> = {}
  for (const m of members) {
    if (!byGen[m.gen]) byGen[m.gen] = []
    byGen[m.gen].push(m)
  }

  return (
    <div className="book-page">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18, paddingBottom: 12, borderBottom: '2px double var(--line-strong)' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600, letterSpacing: 4 }}>
            {family.surname}氏宗谱 · 世系总表
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4, letterSpacing: 2 }}>{family.tang}</div>
        </div>
      </div>
      {Object.entries(byGen).sort((a, b) => +a[0] - +b[0]).map(([gen, persons]) => (
        <div key={gen} className="gen-row">
          <div className="gen-label">第{cnNum(+gen)}世</div>
          <div className="gen-members">
            {persons.map(m => (
              <div key={m.id} className="gen-mini" onClick={() => onOpen(m)}>
                {m.branch && <span className="branch">{m.branch}</span>}
                <span className="nm">{m.name}</span>
                {m.zi && <span style={{ fontSize: 10, color: 'var(--ink-4)' }}>字{m.zi}</span>}
                {m.title && (
                  <span className="chip" style={{ padding: '0 5px', fontSize: 10, background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-soft)' }}>
                    {m.title}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── main component ──────────────────────────────────────── */

export default function TreeClient({
  members: initialMembers, relationships, family, role, canSeeSensitive,
}: {
  members: Person[]; relationships: Rel[]; family: Family; role: Role; canSeeSensitive: boolean
}) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [genFilter, setGenFilter] = useState<'all' | number>('all')
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree')
  const [scale, setScale] = useState(0.78)
  const [pan, setPan] = useState({ x: 60, y: 40 })
  const dragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  const zibei = family.zibei ? [...family.zibei].filter(c => c.trim()) : []
  const gens = [...new Set(members.map(m => m.gen))].sort((a, b) => a - b)
  const selectedMember = selectedId ? members.find(m => m.id === selectedId) ?? null : null

  const { positions, bounds } = computeLayout(members, relationships)
  const edgePaths = buildEdgePaths(members, relationships, positions)
  const svgW = bounds.w + 60
  const svgH = bounds.h + 60

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as Element).closest('.t-node')) return
    dragging.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    setPan(prev => ({
      x: prev.x + e.clientX - lastPos.current.x,
      y: prev.y + e.clientY - lastPos.current.y,
    }))
    lastPos.current = { x: e.clientX, y: e.clientY }
  }, [])

  const onMouseUp = useCallback(() => { dragging.current = false }, [])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.08 : 0.92
    setScale(s => Math.min(2.4, Math.max(0.3, s * factor)))
  }, [])

  function handleMemberUpdated(updated: Person) {
    setMembers(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m))
    router.refresh()
  }

  function handleMemberDeleted(id: string) {
    setMembers(prev => prev.filter(m => m.id !== id))
    setSelectedId(null)
    router.refresh()
  }

  return (
    <div className="page" style={{ paddingBottom: 24 }}>

      {/* ── toolbar ── */}
      <div className="tree-toolbar">
        {/* view mode toggle */}
        <div style={{ display: 'flex', background: 'var(--line-2)', borderRadius: 6, padding: 2 }}>
          {(['tree', 'table'] as const).map(m => (
            <button
              key={m} type="button"
              style={{
                border: 0, padding: '4px 12px', borderRadius: 5, fontSize: 12, cursor: 'pointer',
                background: viewMode === m ? 'var(--surface-hi)' : 'transparent',
                color: viewMode === m ? 'var(--ink)' : 'var(--ink-3)',
              }}
              onClick={() => setViewMode(m)}
            >
              {m === 'tree' ? '族谱树' : '房支总表'}
            </button>
          ))}
        </div>

        {/* generation filter */}
        {viewMode === 'tree' && gens.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: 1 }}>世系</span>
            <select
              value={genFilter}
              onChange={e => setGenFilter(e.target.value === 'all' ? 'all' : +e.target.value)}
              style={{ fontSize: 12, border: '1px solid var(--line)', borderRadius: 4, padding: '2px 6px', background: 'var(--surface)', color: 'var(--ink)' }}
            >
              <option value="all">全部</option>
              {gens.map(g => <option key={g} value={g}>第{cnNum(g)}世</option>)}
            </select>
          </div>
        )}

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: 11, color: 'var(--ink-4)', background: 'var(--line-2)', borderRadius: 4, padding: '2px 8px' }}>
          {members.length} 人在册
        </span>

        {/* zoom controls */}
        {viewMode === 'tree' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button type="button" className="btn ghost sm" onClick={() => setScale(s => Math.max(0.3, s * 0.85))}>−</button>
            <span style={{ minWidth: 44, textAlign: 'center', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)' }}>
              {Math.round(scale * 100)}%
            </span>
            <button type="button" className="btn ghost sm" onClick={() => setScale(s => Math.min(2.4, s * 1.18))}>+</button>
            <button type="button" className="btn ghost sm" onClick={() => { setScale(0.78); setPan({ x: 60, y: 40 }) }}>复位</button>
          </div>
        )}
      </div>

      {/* ── tree canvas ── */}
      {viewMode === 'tree' ? (
        <div
          className="tree-canvas"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
        >
          <div
            className="tree-stage"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              width: svgW, height: svgH,
            }}
          >
            {/* edges */}
            <svg className="tree-svg" width={svgW} height={svgH} style={{ width: svgW, height: svgH }}>
              {edgePaths.map((d, i) => (
                <path key={i} d={d} fill="none" stroke="var(--line-strong)" strokeWidth="1.4" />
              ))}
            </svg>

            {/* nodes */}
            {members.map(m => {
              const p = positions.get(m.id)
              if (!p) return null
              const dimmed = genFilter !== 'all' && m.gen !== genFilter
              const birthY = m.birth ? (m.birth.match(/\d{4}/) || [''])[0] : ''
              const deathY = m.death ? (m.death.match(/\d{4}/) || [''])[0] : ''
              const isFounder = m.gen === gens[0]

              return (
                <div
                  key={m.id}
                  className={[
                    't-node',
                    m.sex === 'F' ? 'female' : '',
                    m.deceased ? 'deceased' : '',
                    isFounder ? 'founder' : '',
                    selectedId === m.id ? 'selected' : '',
                  ].filter(Boolean).join(' ')}
                  style={{ left: p.x, top: p.y, opacity: dimmed ? 0.22 : 1, transition: 'opacity .2s' }}
                  onClick={e => { e.stopPropagation(); setSelectedId(m.id) }}
                >
                  <div className="gen-tag">第{cnNum(m.gen)}世</div>
                  <div className="nm">{m.name}</div>
                  <div className="zi">
                    {m.zi ? `字 ${m.zi}` : (m.title ? (m.title.length > 6 ? m.title.slice(0, 6) + '…' : m.title) : '')}
                  </div>
                  <div className="yrs">
                    {birthY}{deathY ? ` – ${deathY}` : m.deceased ? ' – †' : ''}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 世系标尺 */}
          {gens.length > 0 && (
            <div style={{
              position: 'absolute', left: 18, top: 18,
              display: 'flex', flexDirection: 'column', gap: 5,
              background: 'rgba(251,247,235,.94)', border: '1px solid var(--line)',
              borderRadius: 'var(--radius)', padding: '10px 14px',
              fontSize: 12, zIndex: 10, pointerEvents: 'none',
            }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: 'var(--ink-3)', marginBottom: 3, fontFamily: 'var(--font-serif)' }}>
                世系标尺
              </div>
              {gens.map(g => (
                <div key={g} style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  color: genFilter !== 'all' && genFilter === g ? 'var(--accent)' : 'var(--ink-2)',
                  fontFamily: 'var(--font-serif)', fontSize: 12,
                }}>
                  <span style={{ display: 'inline-block', width: 3, height: 10, background: 'var(--accent)', opacity: 0.3 + g * 0.1, borderRadius: 1, flexShrink: 0 }} />
                  第{cnNum(g)}世{zibei[g - 1] ? ` · ${zibei[g - 1]}` : ''}
                </div>
              ))}
            </div>
          )}

          {/* hint */}
          <div style={{ position: 'absolute', right: 18, bottom: 18, display: 'flex', gap: 8, fontSize: 11, color: 'var(--ink-4)', pointerEvents: 'none' }}>
            <span className="chip">○ 拖拽平移</span>
            <span className="chip">滚轮缩放</span>
          </div>
        </div>
      ) : (
        <BranchTable members={members} family={family} onOpen={m => setSelectedId(m.id)} />
      )}

      {members.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-3)' }}>
          族谱暂无成员，请先在族人页面添加成员
        </div>
      )}

      {/* ── member drawer ── */}
      {selectedMember && (
        <MemberDrawer
          member={selectedMember}
          family={family}
          allMembers={members}
          role={role}
          canSeeSensitive={canSeeSensitive}
          onClose={() => setSelectedId(null)}
          onNavigate={id => setSelectedId(id)}
          onMemberUpdated={handleMemberUpdated}
          onMemberDeleted={handleMemberDeleted}
        />
      )}
    </div>
  )
}

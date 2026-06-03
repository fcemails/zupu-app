'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Role } from '@/lib/permissions'
import { usePins } from '@/hooks/usePins'

function PhotoUpload({ familyId, value, onChange }: { familyId: string; value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('familyId', familyId)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    setUploading(false)
    const body = await res.json().catch(() => null)
    console.debug('upload response', res.status, body)
    if (res.ok && body) {
      const { url } = body
      onChange(url)
    } else {
      console.error('Upload failed', res.status, body)
      alert((body && (body.error?.message || body.message)) || '上传失败')
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div
        style={{
          width: 64, height: 80, borderRadius: 4, overflow: 'hidden', flexShrink: 0,
          border: '1px dashed var(--line-strong)', background: 'var(--line-2)',
          display: 'grid', placeItems: 'center', cursor: 'pointer',
        }}
        onClick={() => inputRef.current?.click()}
      >
        {value ? (
          <img src={value} alt="画像" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 11, color: 'var(--ink-4)', textAlign: 'center', lineHeight: 1.4, padding: 4 }}>
            {uploading ? '上传中…' : '点击上传'}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button type="button" className="btn ghost sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? '上传中…' : value ? '更换画像' : '选择图片'}
        </button>
        {value && (
          <button type="button" className="btn ghost sm" style={{ color: 'var(--ink-4)' }} onClick={() => onChange('')}>
            移除画像
          </button>
        )}
        <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>JPG / PNG / WebP，4 MB 以内</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label="上传族人画像"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}

type Person = {
  id: string; name: string; zi?: string | null; hao?: string | null; sex: string;
  gen: number; branch?: string | null; birth?: string | null; death?: string | null;
  lifespan?: string | null; title?: string | null; bio?: string | null;
  burial?: string | null; address?: string | null; phone?: string | null;
  photo?: string | null; deceased: boolean;
  parentRels: { parent: { id: string; name: string } }[];
  childRels: { child: { id: string; name: string } }[];
}
type Family = { id: string; surname: string; tang: string }

type MemberFormData = {
  name: string; zi: string; hao: string; sex: string; gen: string; branch: string;
  birth: string; death: string; lifespan: string; title: string; bio: string;
  burial: string; address: string; phone: string; photo: string; deceased: boolean;
}

const EMPTY_FORM: MemberFormData = {
  name: '', zi: '', hao: '', sex: 'M', gen: '', branch: '',
  birth: '', death: '', lifespan: '', title: '', bio: '',
  burial: '', address: '', phone: '', photo: '', deceased: false,
}

function MemberForm({
  familyId, initial, onClose, onSaved, members,
}: {
  familyId: string; initial?: Person; onClose: () => void;
  onSaved: (p: Person) => void; members: Person[];
}) {
  const [data, setData] = useState<MemberFormData>(
    initial ? {
      name: initial.name, zi: initial.zi ?? '', hao: initial.hao ?? '',
      sex: initial.sex, gen: String(initial.gen), branch: initial.branch ?? '',
      birth: initial.birth ?? '', death: initial.death ?? '', lifespan: initial.lifespan ?? '',
      title: initial.title ?? '', bio: initial.bio ?? '',
      burial: initial.burial ?? '', address: initial.address ?? '', phone: initial.phone ?? '',
      photo: initial.photo ?? '', deceased: initial.deceased,
    } : EMPTY_FORM,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set<K extends keyof MemberFormData>(k: K, v: MemberFormData[K]) {
    setData(prev => ({ ...prev, [k]: v }))
  }

  async function submit() {
    if (!data.name.trim()) { setError('姓名不能为空'); return }
    if (!data.gen || isNaN(+data.gen)) { setError('请输入有效世次'); return }
    setSaving(true); setError('')
    const body = {
      ...data, gen: +data.gen,
      zi: data.zi || undefined, hao: data.hao || undefined,
      branch: data.branch || undefined, birth: data.birth || undefined,
      death: data.death || undefined, lifespan: data.lifespan || undefined,
      title: data.title || undefined, bio: data.bio || undefined,
      burial: data.burial || undefined, address: data.address || undefined,
      phone: data.phone || undefined, photo: data.photo || undefined,
    }
    const url = initial
      ? `/api/families/${familyId}/members/${initial.id}`
      : `/api/families/${familyId}/members`
    const res = await fetch(url, {
      method: initial ? 'PUT' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (!res.ok) { setError('保存失败，请重试'); return }
    const saved = await res.json()
    onSaved({ ...saved, parentRels: initial?.parentRels ?? [], childRels: initial?.childRels ?? [] })
  }

  return (
    <>
      <div className="drawer-mask open" onClick={onClose} />
      <div className="drawer open" style={{ width: 460 }}>
        <div className="head">
          <button type="button" className="btn ghost sm" onClick={onClose}>← 取消</button>
          <span style={{ flex: 1, fontWeight: 600, color: 'var(--ink)', paddingLeft: 12 }}>
            {initial ? '编辑族人' : '添加族人'}
          </span>
          <button type="button" className="btn sm primary" onClick={submit} disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
        <div className="body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{ padding: '8px 12px', background: '#fff0f0', border: '1px solid #fecaca', borderRadius: 6, color: 'var(--accent)', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 8 }}>画像</div>
            <PhotoUpload familyId={familyId} value={data.photo} onChange={url => set('photo', url)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field-input" style={{ gridColumn: '1 / -1' }}>
              <label>姓名 <span className="req">*</span></label>
              <input value={data.name} onChange={e => set('name', e.target.value)} placeholder="请输入姓名" />
            </div>
            <div className="field-input">
              <label>字</label>
              <input value={data.zi} onChange={e => set('zi', e.target.value)} placeholder="字" />
            </div>
            <div className="field-input">
              <label>号</label>
              <input value={data.hao} onChange={e => set('hao', e.target.value)} placeholder="号" />
            </div>
            <div className="field-input">
              <label>世次 <span className="req">*</span></label>
              <input type="number" min="1" value={data.gen} onChange={e => set('gen', e.target.value)} placeholder="如 1" />
            </div>
            <div className="field-input">
              <label>性别</label>
              <select value={data.sex} onChange={e => set('sex', e.target.value)}>
                <option value="M">男</option>
                <option value="F">女</option>
              </select>
            </div>
            <div className="field-input">
              <label>房支</label>
              <input value={data.branch} onChange={e => set('branch', e.target.value)} placeholder="如「长房」" />
            </div>
            <div className="field-input">
              <label>头衔</label>
              <input value={data.title} onChange={e => set('title', e.target.value)} placeholder="如「进士」" />
            </div>
            <div className="field-input">
              <label>生辰</label>
              <input value={data.birth} onChange={e => set('birth', e.target.value)} placeholder="如「明洪武三年」" />
            </div>
            <div className="field-input">
              <label>殁年</label>
              <input value={data.death} onChange={e => set('death', e.target.value)} placeholder="如「明永乐十年」" />
            </div>
            <div className="field-input">
              <label>寿</label>
              <input value={data.lifespan} onChange={e => set('lifespan', e.target.value)} placeholder="如「七十二岁」" />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                id="deceased-check"
                checked={data.deceased}
                onChange={e => set('deceased', e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              <label htmlFor="deceased-check" style={{ fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer' }}>已殁</label>
            </div>
          </div>

          <div className="field-input">
            <label>生平传略</label>
            <textarea
              value={data.bio}
              onChange={e => set('bio', e.target.value)}
              style={{ minHeight: 80 }}
              placeholder="简要记述生平事迹…"
            />
          </div>

          <div style={{ paddingTop: 8, borderTop: '1px solid var(--line)' }}>
            <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 8 }}>敏感字段（仅成员可见）</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field-input" style={{ gridColumn: '1 / -1' }}>
                <label>墓葬地</label>
                <input value={data.burial} onChange={e => set('burial', e.target.value)} />
              </div>
              <div className="field-input">
                <label>现住址</label>
                <input value={data.address} onChange={e => set('address', e.target.value)} />
              </div>
              <div className="field-input">
                <label>联系电话</label>
                <input value={data.phone} onChange={e => set('phone', e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function MemberDrawer({
  member, onClose, role, familyId, onEdit,
}: {
  member: Person; onClose: () => void; role: Role; familyId: string; onEdit: (p: Person) => void;
}) {
  const canEdit = role === 'owner' || role === 'admin' || role === 'editor'
  const canSeeSensitive = role === 'owner' || role === 'admin' || role === 'editor'
  const { isPinned, pin, unpin } = usePins(familyId)
  const pinned = isPinned(member.id)

  return (
    <>
      <div className="drawer-mask open" onClick={onClose} />
      <div className="drawer open">
        <div className="head">
          <button type="button" className="btn ghost sm" onClick={onClose}>← 返回</button>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            className="btn ghost sm"
            title={pinned ? '取消收藏' : '收藏此人'}
            onClick={() => pinned
              ? unpin(member.id)
              : pin({ id: member.id, name: member.name, gen: member.gen, branch: member.branch })
            }
            style={{ color: pinned ? 'var(--accent)' : 'var(--ink-4)' }}
          >
            {pinned ? '★' : '☆'}
          </button>
          {canEdit && (
            <button type="button" className="btn sm primary" onClick={() => onEdit(member)}>编辑</button>
          )}
        </div>
        <div className="body">
          <div className="member-hero">
            <div className="portrait">
              {member.photo ? (
                <img src={member.photo} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
              ) : (
                <span>{member.sex === 'F' ? '女' : member.name[0]}</span>
              )}
            </div>
            <div>
              <div className="ttl">{member.name}</div>
              <div className="sub">
                {member.zi && `字 ${member.zi}`}{member.hao && `　号 ${member.hao}`}
              </div>
              <div className="sub" style={{ marginTop: 4 }}>第 {member.gen} 世{member.branch ? `　${member.branch}` : ''}</div>
              <div className="tags">
                {member.title && <span className="chip accent">{member.title}</span>}
                {member.deceased && <span className="chip">殁</span>}
                {member.sex === 'F' && <span className="chip" style={{ background: '#fce7f3', color: '#9d174d', borderColor: '#fbcfe8' }}>女</span>}
              </div>
            </div>
          </div>

          <div className="field-grid">
            {member.birth && <div className="field"><div className="k">生辰</div><div className="v">{member.birth}</div></div>}
            {member.death && <div className="field"><div className="k">殁年</div><div className="v">{member.death}</div></div>}
            {member.lifespan && <div className="field"><div className="k">寿</div><div className="v">{member.lifespan}</div></div>}
            {member.burial && (
              <div className="field">
                <div className="k">墓葬</div>
                <div className={`v${canSeeSensitive ? '' : ' masked'}`}>
                  {canSeeSensitive ? member.burial : '••• 仅成员可见'}
                </div>
              </div>
            )}
            {member.address && (
              <div className="field">
                <div className="k">现住址</div>
                <div className={`v${canSeeSensitive ? '' : ' masked'}`}>
                  {canSeeSensitive ? member.address : '••• 仅成员可见'}
                </div>
              </div>
            )}
            {member.phone && (
              <div className="field">
                <div className="k">电话</div>
                <div className={`v${canSeeSensitive ? '' : ' masked'}`}>
                  {canSeeSensitive ? member.phone : '••• 仅成员可见'}
                </div>
              </div>
            )}
          </div>

          {member.bio && (
            <div className="bio" style={{ marginBottom: 22 }}>{member.bio}</div>
          )}

          <div className="rel-block">
            {member.parentRels.length > 0 && (
              <div>
                <h4>父辈</h4>
                <div className="rel-list">
                  {member.parentRels.map(r => (
                    <div key={r.parent.id} className="r">
                      <span>{r.parent.name}</span>
                      <span className="role">父</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {member.childRels.length > 0 && (
              <div>
                <h4>子嗣</h4>
                <div className="rel-list">
                  {member.childRels.map(r => (
                    <div key={r.child.id} className="r">
                      <span>{r.child.name}</span>
                      <span className="role">子</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function MembersClient({ members: initial, family, role }: { members: Person[]; family: Family; role: Role }) {
  const router = useRouter()
  const [members, setMembers] = useState(initial)
  const [selected, setSelected] = useState<Person | null>(null)
  const [editing, setEditing] = useState<Person | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [genFilter, setGenFilter] = useState(0)

  const canEdit = role === 'owner' || role === 'admin' || role === 'editor'

  const maxGen = members.reduce((m, p) => Math.max(m, p.gen), 0)
  const filtered = members.filter(m => {
    if (search && !m.name.includes(search) && !(m.zi ?? '').includes(search)) return false
    if (genFilter && m.gen !== genFilter) return false
    return true
  })

  const byGen: Record<number, Person[]> = {}
  for (const m of filtered) {
    if (!byGen[m.gen]) byGen[m.gen] = []
    byGen[m.gen].push(m)
  }

  function openAdd() { setEditing(null); setShowForm(true) }
  function openEdit(p: Person) { setSelected(null); setEditing(p); setShowForm(true) }
  function closeForm() { setShowForm(false); setEditing(null) }

  function onSaved(p: Person) {
    setMembers(prev => {
      const idx = prev.findIndex(m => m.id === p.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = p
        return next
      }
      return [...prev, p]
    })
    closeForm()
    router.refresh()
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div className="search" style={{ minWidth: 280 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            placeholder="搜索姓名 / 字号…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className={`chip${genFilter === 0 ? ' accent' : ''}`}
            onClick={() => setGenFilter(0)}
            style={{ cursor: 'pointer', border: 0 }}
          >全部</button>
          {Array.from({ length: maxGen }, (_, i) => i + 1).map(g => (
            <button
              key={g}
              type="button"
              className={`chip${genFilter === g ? ' accent' : ''}`}
              onClick={() => setGenFilter(g)}
              style={{ cursor: 'pointer', border: 0 }}
            >第{g}世</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{filtered.length} 人</span>
        {canEdit && (
          <button type="button" className="btn primary sm" onClick={openAdd}>
            + 添加族人
          </button>
        )}
      </div>

      <div className="book-page">
        {Object.entries(byGen).sort((a, b) => +a[0] - +b[0]).map(([gen, persons]) => (
          <div key={gen} className="gen-row">
            <div className="gen-label">第{gen}世</div>
            <div className="gen-members">
              {persons.map(p => (
                <div
                  key={p.id}
                  className="gen-mini"
                  onClick={() => setSelected(p)}
                >
                  <div className="nm">{p.name}</div>
                  {p.zi && <div className="branch">字{p.zi}</div>}
                  {p.branch && <div className="branch">{p.branch}</div>}
                  {p.deceased && <span style={{ fontSize: 10, color: 'var(--ink-4)' }}>†</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)' }}>
            {members.length === 0 ? '族谱暂无成员，点击右上角添加' : '未找到匹配族人'}
          </div>
        )}
      </div>

      {selected && !showForm && (
        <MemberDrawer
          member={selected}
          onClose={() => setSelected(null)}
          role={role}
          familyId={family.id}
          onEdit={openEdit}
        />
      )}

      {showForm && (
        <MemberForm
          familyId={family.id}
          initial={editing ?? undefined}
          onClose={closeForm}
          onSaved={onSaved}
          members={members}
        />
      )}
    </div>
  )
}

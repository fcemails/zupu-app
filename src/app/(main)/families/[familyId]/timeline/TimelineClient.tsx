'use client'

import { useState } from 'react'
import type { Role } from '@/lib/permissions'

type FamilyEvent = {
  id: string; year?: number | null; yearText?: string | null;
  title: string; desc?: string | null; actors?: string | null; major: boolean;
}
type Family = { id: string; surname: string; tang: string }

function EventForm({ familyId, onClose, onSaved }: { familyId: string; onClose: () => void; onSaved: (ev: FamilyEvent) => void }) {
  const [data, setData] = useState({ year: '', title: '', desc: '', actors: '', major: false })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/families/${familyId}/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        year: data.year ? parseInt(data.year) : undefined,
        title: data.title,
        desc: data.desc,
        actors: data.actors ? data.actors.split(/[，,、]/).map(s => s.trim()).filter(Boolean) : [],
        major: data.major,
      }),
    })
    if (res.ok) {
      onSaved(await res.json())
      onClose()
    }
    setSaving(false)
  }

  return (
    <>
      <div className="drawer-mask open" onClick={onClose} />
      <div className="drawer open">
        <div className="head">
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600, letterSpacing: 2 }}>添加大事记</span>
          <span style={{ flex: 1 }} />
          <button type="button" className="btn ghost sm" onClick={onClose}>取消</button>
        </div>
        <div className="body">
          <div className="form-grid">
            <div className="field-input">
              <label>年份</label>
              <input value={data.year} onChange={e => setData(p => ({ ...p, year: e.target.value }))} placeholder="如 1368" type="number" />
            </div>
            <div className="field-input">
              <label>相关人物</label>
              <input value={data.actors} onChange={e => setData(p => ({ ...p, actors: e.target.value }))} placeholder="多人用逗号分隔" />
            </div>
            <div className="field-input" style={{ gridColumn: '1 / -1' }}>
              <label>标题 <span className="req">*</span></label>
              <input value={data.title} onChange={e => setData(p => ({ ...p, title: e.target.value }))} placeholder="大事记标题" />
            </div>
            <div className="field-input" style={{ gridColumn: '1 / -1' }}>
              <label>详细描述</label>
              <textarea value={data.desc} onChange={e => setData(p => ({ ...p, desc: e.target.value }))} placeholder="事件详情…" />
            </div>
            <div className="field-input" style={{ gridColumn: '1 / -1', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" id="major" checked={data.major} onChange={e => setData(p => ({ ...p, major: e.target.checked }))} style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
              <label htmlFor="major" style={{ letterSpacing: 0 }}>标记为重大事件</label>
            </div>
          </div>
          <button
            type="button"
            className="btn primary"
            style={{ width: '100%', marginTop: 16 }}
            onClick={save}
            disabled={saving || !data.title}
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </>
  )
}

export default function TimelineClient({ events: initialEvents, family, role }: {
  events: FamilyEvent[]; family: Family; role: Role
}) {
  const [events, setEvents] = useState(initialEvents)
  const [filter, setFilter] = useState<'all' | 'major'>('all')
  const [adding, setAdding] = useState(false)

  const canEdit = role === 'owner' || role === 'admin' || role === 'editor'
  const displayed = filter === 'major' ? events.filter(e => e.major) : events

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ display: 'flex', background: 'var(--line-2)', borderRadius: 8, padding: 2, gap: 0 }}>
          {[{ v: 'all', l: '全部' }, { v: 'major', l: '大事' }].map(({ v, l }) => (
            <button
              key={v}
              type="button"
              className={filter === v ? 'on' : ''}
              style={{
                border: 0, padding: '6px 16px', borderRadius: 6, fontSize: 12,
                background: filter === v ? 'var(--surface-hi)' : 'transparent',
                color: filter === v ? 'var(--ink)' : 'var(--ink-3)',
                fontWeight: filter === v ? 500 : 400,
                boxShadow: filter === v ? 'var(--shadow-sm)' : 'none',
              }}
              onClick={() => setFilter(v as 'all' | 'major')}
            >{l}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {canEdit && (
          <button type="button" className="btn primary sm" onClick={() => setAdding(true)}>
            + 添加大事记
          </button>
        )}
      </div>

      <div className="timeline">
        {displayed.map(ev => {
          const actors = ev.actors ? JSON.parse(ev.actors) as string[] : []
          return (
            <div key={ev.id} className={`tl-row${ev.major ? ' major' : ''}`}>
              <div className="yr">
                {ev.year ?? ''}
                {ev.yearText && <small>{ev.yearText}</small>}
              </div>
              <div className="node"><div className="pt" /></div>
              <div className="content">
                <div className="ttl">{ev.title}</div>
                {ev.desc && <div className="desc">{ev.desc}</div>}
                {actors.length > 0 && (
                  <div className="actors">
                    {actors.map((a, i) => <span key={i} className="chip">{a}</span>)}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {displayed.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-3)' }}>
            暂无大事记录{canEdit && <>，<button type="button" style={{ background: 0, border: 0, color: 'var(--accent)', cursor: 'pointer', padding: 0, font: 'inherit' }} onClick={() => setAdding(true)}>立即添加</button></>}
          </div>
        )}
      </div>

      {adding && (
        <EventForm
          familyId={family.id}
          onClose={() => setAdding(false)}
          onSaved={ev => setEvents(prev => [...prev, ev].sort((a, b) => (a.year ?? 0) - (b.year ?? 0)))}
        />
      )}
    </div>
  )
}

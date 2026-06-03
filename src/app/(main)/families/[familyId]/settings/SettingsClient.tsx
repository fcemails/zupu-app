'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Role } from '@/lib/permissions'

type Family = {
  id: string; surname: string; tang: string; region?: string | null;
  era?: string | null; motto?: string | null; zibei?: string | null; access: string;
}

export default function SettingsClient({ family, role }: { family: Family; role: Role }) {
  const router = useRouter()
  const [data, setData] = useState({
    surname: family.surname,
    tang: family.tang,
    region: family.region ?? '',
    era: family.era ?? '',
    motto: family.motto ?? '',
    zibei: family.zibei ?? '',
    access: family.access,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function set(k: keyof typeof data, v: string) {
    setData(prev => ({ ...prev, [k]: v }))
  }

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/families/${family.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      router.refresh()
    }
    setSaving(false)
  }

  async function deleteFamily() {
    if (!confirm('确认删除该族谱？此操作不可撤销，所有数据将被永久删除。')) return
    const res = await fetch(`/api/families/${family.id}`, { method: 'DELETE' })
    if (res.ok) router.push('/families')
  }

  return (
    <div className="page">
      <div style={{ maxWidth: 640 }}>
        <div style={{ marginBottom: 28 }}>
          <div className="section-title">族谱设置</div>
        </div>

        <div className="card" style={{ marginBottom: 22 }}>
          <div className="card-hd"><h2>基本信息</h2></div>
          <div className="form-grid">
            <div className="field-input">
              <label>姓氏 <span className="req">*</span></label>
              <input value={data.surname} onChange={e => set('surname', e.target.value)} />
            </div>
            <div className="field-input">
              <label>堂号 <span className="req">*</span></label>
              <input value={data.tang} onChange={e => set('tang', e.target.value)} />
            </div>
            <div className="field-input">
              <label>始迁地</label>
              <input value={data.region} onChange={e => set('region', e.target.value)} placeholder="如「蜀眉柳溪」" />
            </div>
            <div className="field-input">
              <label>始迁朝代</label>
              <input value={data.era} onChange={e => set('era', e.target.value)} placeholder="如「元末明初」" />
            </div>
            <div className="field-input" style={{ gridColumn: '1 / -1' }}>
              <label>族训</label>
              <textarea value={data.motto} onChange={e => set('motto', e.target.value)} style={{ minHeight: 80 }} />
            </div>
            <div className="field-input" style={{ gridColumn: '1 / -1' }}>
              <label>字辈</label>
              <input value={data.zibei} onChange={e => set('zibei', e.target.value)} placeholder="如「永世昌隆显文运振家声」" />
              <div className="hint">按顺序输入字辈字，连续输入无需分隔符</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 22 }}>
          <div className="card-hd"><h2>隐私设置</h2></div>
          {[
            { value: 'public', label: '完全公开', desc: '任何人都可以浏览族谱全部内容', icon: '🌐' },
            { value: 'semi', label: '半公开', desc: '基本信息公开，敏感字段仅成员可见', icon: '🔓' },
            { value: 'private', label: '仅受邀成员', desc: '族谱完全私密，仅受邀族人可以查看', icon: '🔒' },
          ].map(opt => (
            <div
              key={opt.value}
              className={`access-toggle-card${data.access === opt.value ? ' active' : ''}`}
              onClick={() => set('access', opt.value)}
            >
              <div className="ico-wrap" style={{ fontSize: 20 }}>{opt.icon}</div>
              <div>
                <div className="ttl">{opt.label}</div>
                <div className="desc">{opt.desc}</div>
              </div>
              <div className="radio" />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginBottom: 40 }}>
          <a
            href={`/families/${family.id}/print`}
            target="_blank"
            rel="noreferrer"
            className="btn ghost"
            style={{ textDecoration: 'none' }}
          >
            印谱 / 打印
          </a>
          <button
            type="button"
            className="btn ghost"
            onClick={() => window.open(`/api/families/${family.id}/export`, '_blank')}
          >
            导出 JSON
          </button>
          <button type="button" className="btn primary" onClick={save} disabled={saving}>
            {saving ? '保存中…' : saved ? '✓ 已保存' : '保存设置'}
          </button>
        </div>

        {role === 'owner' && (
          <div className="card" style={{ borderColor: 'var(--accent)', background: '#fff9f9' }}>
            <div className="card-hd"><h2 style={{ color: 'var(--accent)' }}>危险操作</h2></div>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>
              删除族谱将永久删除所有成员资料、大事记和邀请链接，无法恢复。
            </p>
            <button type="button" className="btn danger" onClick={deleteFamily}>删除族谱</button>
          </div>
        )}
      </div>
    </div>
  )
}

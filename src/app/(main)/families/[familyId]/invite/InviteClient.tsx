'use client'

import { useState } from 'react'
import type { Role } from '@/lib/permissions'

type Collaborator = { id: string; role: string; user: { id: string; name: string; email?: string | null } }
type Invitation = { id: string; email?: string | null; role: string; token: string; expiresAt: string; message?: string | null }
type Family = { id: string; surname: string; tang: string; access: string }

const ROLE_LABELS: Record<string, string> = { owner: '谱主', admin: '管理员', editor: '编辑', viewer: '查看' }

export default function InviteClient({ family, role, collaborators: initial, invitations: initialInvites }: {
  family: Family; role: Role;
  collaborators: Collaborator[]; invitations: Invitation[]
}) {
  const [collaborators, setCollaborators] = useState(initial)
  const [invitations, setInvitations] = useState(initialInvites)
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer' | 'admin'>('editor')
  const [inviteEmail, setInviteEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [inviteLink, setInviteLink] = useState('')

  async function createInvite() {
    setCreating(true)
    const res = await fetch(`/api/families/${family.id}/invite`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: inviteRole, email: inviteEmail || undefined }),
    })
    if (res.ok) {
      const inv = await res.json()
      setInvitations(prev => [inv, ...prev])
      setInviteLink(`${window.location.origin}/invite/${inv.token}`)
    }
    setCreating(false)
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 28 }}>
        <div className="section-title">协作成员管理</div>
      </div>

      {/* Current collaborators */}
      <div className="perm-table" style={{ marginBottom: 28 }}>
        <div className="perm-row head">
          <div />
          <div>姓名</div>
          <div>邮箱</div>
          <div>加入时间</div>
          <div>权限</div>
          <div>操作</div>
        </div>
        {collaborators.map(c => (
          <div key={c.id} className="perm-row">
            <div className="avatar" style={{ width: 28, height: 28, fontSize: 12 }}>{c.user.name[0]}</div>
            <div className="nm">{c.user.name}</div>
            <div className="em">{c.user.email ?? '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>—</div>
            <span className={`role-pill ${c.role}`}>{ROLE_LABELS[c.role] ?? c.role}</span>
            <div>
              {c.role !== 'owner' && role === 'owner' && (
                <button
                  type="button"
                  className="btn ghost sm"
                  style={{ color: 'var(--accent)', borderColor: 'var(--accent-soft)' }}
                  onClick={async () => {
                    await fetch(`/api/families/${family.id}/access/${c.id}`, { method: 'DELETE' })
                    setCollaborators(prev => prev.filter(x => x.id !== c.id))
                  }}
                >移除</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Invite form */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div className="card-hd"><h2>生成邀请链接</h2></div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field-input" style={{ flex: '1 1 220px' }}>
            <label>邀请邮箱（选填）</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="可留空，任何人均可使用"
            />
          </div>
          <div className="field-input">
            <label>授予权限</label>
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value as typeof inviteRole)}>
              {role === 'owner' && <option value="admin">管理员</option>}
              <option value="editor">编辑</option>
              <option value="viewer">仅查看</option>
            </select>
          </div>
          <button type="button" className="btn primary" onClick={createInvite} disabled={creating}>
            {creating ? '生成中…' : '生成邀请链接'}
          </button>
        </div>

        {inviteLink && (
          <div style={{ marginTop: 18, padding: '12px 14px', background: 'var(--surface)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <code style={{ flex: 1, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink-2)', wordBreak: 'break-all' }}>
              {inviteLink}
            </code>
            <button
              type="button"
              className="btn sm ghost"
              onClick={() => navigator.clipboard.writeText(inviteLink)}
            >复制</button>
          </div>
        )}
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="card">
          <div className="card-hd"><h2>待使用邀请</h2></div>
          {invitations.map(inv => (
            <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{inv.token}</span>
                {inv.email && <span style={{ marginLeft: 10, color: 'var(--ink-2)' }}>→ {inv.email}</span>}
              </div>
              <span className={`role-pill ${inv.role}`}>{ROLE_LABELS[inv.role]}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                {new Date(inv.expiresAt).toLocaleDateString('zh-CN')} 到期
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

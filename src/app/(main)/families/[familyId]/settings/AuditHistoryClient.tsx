'use client'

import { useEffect, useState } from 'react'

type User = {
  id: string
  name: string | null
  email: string
  avatar?: string | null
}

type AuditLog = {
  id: string
  createdAt: string
  userId: string
  action: string
  target?: string | null
  details?: Record<string, any> | null
  user: User
}

type AuditResponse = {
  page: number
  limit: number
  total: number
  logs: AuditLog[]
}

export default function AuditHistoryClient({ familyId }: { familyId: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const limit = 50

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/api/families/${familyId}/audit?page=${page}&limit=${limit}`)
        const body = await res.json().catch(() => null)
        if (!res.ok) {
          const message = body?.error?.message || res.statusText || 'Failed to fetch audit logs'
          throw new Error(message)
        }
        const data: AuditResponse = body
        setLogs(data.logs)
        setTotal(data.total)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [familyId, page])

  const actionLabels: Record<string, string> = {
    'family.create': '创建族谱',
    'family.update': '修改族谱信息',
    'family.delete': '删除族谱',
    'member.create': '添加成员',
    'member.update': '修改成员信息',
    'member.delete': '删除成员',
    'spouse.create': '添加配偶关系',
    'spouse.update': '修改配偶关系',
    'spouse.delete': '删除配偶关系',
    'access.delete': '撤销成员权限',
    'invite.create': '发送邀请',
    'event.create': '创建大事记',
  }

  const actionLabel = (action: string) => actionLabels[action] || action
  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <div className="card" style={{ marginBottom: 22 }}>
        <div className="card-hd"><h2>审计历史</h2></div>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>
          查看所有对族谱的修改操作记录，包括谁在何时做了什么改动。
        </p>

        {error && (
          <div style={{ padding: 12, background: '#fff0f0', border: '1px solid #ffc0c0', borderRadius: 4, marginBottom: 16, color: '#d32f2f', fontSize: 13 }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--ink-2)' }}>
            加载中…
          </div>
        )}

        {!loading && logs.length === 0 && (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--ink-2)' }}>
            暂无操作记录
          </div>
        )}

        {!loading && logs.length > 0 && (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 500, color: 'var(--ink-2)' }}>时间</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 500, color: 'var(--ink-2)' }}>操作者</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 500, color: 'var(--ink-2)' }}>操作</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 500, color: 'var(--ink-2)' }}>详情</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '12px 8px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: 12 }}>
                          {new Date(log.createdAt).toLocaleString('zh-CN')}
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {log.user.avatar && (
                            <img
                              src={log.user.avatar}
                              alt={log.user.name || 'user'}
                              style={{ width: 24, height: 24, borderRadius: '50%' }}
                            />
                          )}
                          <span>{log.user.name || log.user.email}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ background: 'var(--bg-2)', padding: '4px 8px', borderRadius: 3, fontSize: 12 }}>
                          {actionLabel(log.action)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', color: 'var(--ink-2)', fontSize: 12 }}>
                        {log.target && <span>{log.target}</span>}
                        {log.details && (
                          <details style={{ cursor: 'pointer', marginTop: log.target ? 4 : 0 }}>
                            <summary style={{ fontStyle: 'italic', userSelect: 'none' }}>查看详情</summary>
                            <pre
                              style={{
                                background: 'var(--bg-2)',
                                padding: 8,
                                borderRadius: 3,
                                overflow: 'auto',
                                marginTop: 4,
                                fontSize: 11,
                                fontFamily: 'monospace',
                              }}
                            >
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
                <button
                  className="btn ghost"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ padding: '6px 12px', fontSize: 12 }}
                >
                  ← 上一页
                </button>
                <span style={{ display: 'flex', alignItems: 'center', color: 'var(--ink-2)', fontSize: 12 }}>
                  第 {page} / {totalPages} 页
                </span>
                <button
                  className="btn ghost"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{ padding: '6px 12px', fontSize: 12 }}
                >
                  下一页 →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

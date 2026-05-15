'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { Role } from '@/lib/permissions'
import { GEN_COLORS } from './MapView'
import type { MapMember } from './MapView'

const MapView = dynamic(() => import('./MapView'), { ssr: false })

type Family = { id: string; surname: string; tang: string }

export default function MigrationClient({ family, role }: { family: Family; role: Role }) {
  const [members, setMembers] = useState<MapMember[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [placing, setPlacing] = useState(false)
  const [genFilter, setGenFilter] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [listOpen, setListOpen] = useState(false)

  useEffect(() => {
    fetch(`/api/families/${family.id}/migration`)
      .then(r => r.json())
      .then(data => { setMembers(data.members ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [family.id])

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    if (!selectedId || !placing) return
    setPlacing(false)
    const res = await fetch(`/api/families/${family.id}/members/${selectedId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lat, lng }),
    })
    if (res.ok) {
      const updated = await res.json()
      setMembers(prev => prev.map(m =>
        m.id === selectedId ? { ...m, lat: updated.lat, lng: updated.lng } : m
      ))
    }
  }, [selectedId, placing, family.id])

  const clearLocation = useCallback(async (id: string) => {
    const res = await fetch(`/api/families/${family.id}/members/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lat: null, lng: null }),
    })
    if (res.ok) {
      setMembers(prev => prev.map(m => m.id === id ? { ...m, lat: null, lng: null } : m))
    }
  }, [family.id])

  const canEdit = role === 'editor' || role === 'admin' || role === 'owner'
  const selected = members.find(m => m.id === selectedId) ?? null
  const gens = [...new Set(members.map(m => m.gen))].sort((a, b) => a - b)
  const filtered = genFilter != null ? members.filter(m => m.gen === genFilter) : members
  const locatedCount = members.filter(m => m.lat != null).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>

      {/* ── 页头 ── */}
      <div style={{
        padding: '14px 22px', borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0, background: 'var(--surface)',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 700, letterSpacing: 4, color: 'var(--ink)' }}>
            族 裔 迁 徙 图
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3, letterSpacing: 1 }}>
            {loading ? '加 载 中…' : `已标记 ${locatedCount} 人 · 共 ${members.length} 位族人`}
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => { setListOpen(v => !v); setPlacing(false) }}
            style={{
              padding: '6px 16px', fontSize: 12, borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line)', background: listOpen ? 'var(--accent)' : 'transparent',
              color: listOpen ? '#fff' : 'var(--ink-2)', cursor: 'pointer',
              fontFamily: 'var(--font-serif)', letterSpacing: 1,
            }}
          >
            {listOpen ? '收 起' : '族 人 列 表'}
          </button>
        )}
      </div>

      {/* ── 主体 ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* 族人列表抽屉（可收起）*/}
        {listOpen && (
          <div style={{
            width: 210, flexShrink: 0,
            borderRight: '1px solid var(--line)',
            display: 'flex', flexDirection: 'column',
            background: 'var(--surface)', overflow: 'hidden',
          }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', fontSize: 11, color: 'var(--ink-4)', letterSpacing: 1 }}>
              {genFilter != null ? `第${genFilter}世 · ` : ''}{filtered.length} 人
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filtered.map(m => {
                const isSelected = m.id === selectedId
                const hasLoc = m.lat != null
                const color = GEN_COLORS[(m.gen - 1) % GEN_COLORS.length]
                return (
                  <div
                    key={m.id}
                    onClick={() => { setSelectedId(isSelected ? null : m.id); setPlacing(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: '7px 14px', cursor: 'pointer',
                      background: isSelected ? 'var(--accent-soft)' : 'transparent',
                      borderLeft: isSelected ? `3px solid ${color}` : '3px solid transparent',
                    }}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: hasLoc ? color : 'transparent',
                      border: `2px solid ${hasLoc ? color : 'var(--line-strong)'}`,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.name}
                        {m.deceased && <span style={{ fontSize: 10, color: 'var(--ink-4)', marginLeft: 4 }}>†</span>}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--ink-4)' }}>
                        第{m.gen}世{m.branch ? ` · ${m.branch}` : ''}
                      </div>
                    </div>
                    {hasLoc && (
                      <svg width="8" height="10" viewBox="0 0 24 30" fill={color}>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 18 12 18S24 21 24 12C24 5.373 18.627 0 12 0zm0 17a5 5 0 110-10 5 5 0 010 10z" />
                      </svg>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── 地图卡片 ── */}
        <div style={{
          flex: 1, position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(180deg, #fbf3df 0%, #f0e3c2 100%)',
        }}>
          {/* 置入模式横幅 */}
          {placing && selected && (
            <div style={{
              position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
              background: 'var(--accent)', color: '#fff',
              padding: '8px 20px', borderRadius: 'var(--radius)',
              zIndex: 1000, pointerEvents: 'none', boxShadow: 'var(--shadow)',
              whiteSpace: 'nowrap', fontFamily: 'var(--font-serif)',
              fontSize: 13, letterSpacing: 2,
            }}>
              点击地图，为「{selected.name}」标记位置
            </div>
          )}

          <MapView
            members={filtered}
            selectedId={selectedId}
            placing={placing}
            onMarkerClick={id => { setSelectedId(id); setPlacing(false) }}
            onMapClick={handleMapClick}
          />

          {/* ── 图例 · 右上 ── */}
          <div style={{
            position: 'absolute', right: 18, top: 18, zIndex: 500,
            background: 'rgba(251,247,235,.93)',
            backdropFilter: 'blur(6px)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
            padding: '12px 14px',
            minWidth: 148,
          }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 12, fontWeight: 600, letterSpacing: 3, color: 'var(--ink)', marginBottom: 8 }}>图 例</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--ink-3)', padding: '3px 0' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
              已 标 记 位 置
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--ink-3)', padding: '3px 0' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--line-strong)', flexShrink: 0 }} />
              尚 未 标 记
            </div>
            {gens.length > 1 && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                <div style={{ fontSize: 10, color: 'var(--ink-4)', marginBottom: 4, letterSpacing: 1 }}>世 代 色</div>
                {gens.map(g => (
                  <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: GEN_COLORS[(g - 1) % GEN_COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: 'var(--ink-4)' }}>第 {g} 世</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── 选中族人信息卡 · 左下 ── */}
          {selected && (
            <div style={{
              position: 'absolute', left: 18, bottom: 18, zIndex: 500,
              background: 'rgba(251,247,235,.95)',
              backdropFilter: 'blur(6px)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              padding: '14px 18px',
              maxWidth: 300,
            }}>
              <div style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: 2, fontFamily: 'var(--font-serif)' }}>
                第 {selected.gen} 世{selected.branch ? ` · ${selected.branch} 支` : ''}
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 700, margin: '4px 0 2px', letterSpacing: 1, color: 'var(--ink)' }}>
                {selected.name}
                {selected.zi && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--ink-3)', marginLeft: 8 }}>字 {selected.zi}</span>}
                {selected.deceased && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink-4)', marginLeft: 8 }}>† 已故</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.6 }}>
                {selected.birth && <span>生于 {selected.birth}</span>}
                {selected.birth && selected.death && <span style={{ margin: '0 4px' }}>·</span>}
                {selected.death && <span>殁于 {selected.death}</span>}
                {!selected.birth && !selected.death && (
                  <span style={{ color: selected.lat != null ? '#4a6741' : 'var(--ink-4)' }}>
                    {selected.lat != null ? '✓ 已标记位置' : '○ 尚未标记位置'}
                  </span>
                )}
              </div>
              {canEdit && (
                <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                  {placing ? (
                    <button onClick={() => setPlacing(false)} style={{
                      flex: 1, padding: '5px 0', fontSize: 12,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--accent)', background: 'transparent',
                      color: 'var(--accent)', cursor: 'pointer',
                      fontFamily: 'var(--font-serif)', letterSpacing: 1,
                    }}>取 消</button>
                  ) : (
                    <button onClick={() => setPlacing(true)} style={{
                      flex: 1, padding: '5px 0', fontSize: 12,
                      borderRadius: 'var(--radius-sm)',
                      border: 'none', background: 'var(--accent)',
                      color: '#fff', cursor: 'pointer',
                      fontFamily: 'var(--font-serif)', letterSpacing: 1,
                    }}>{selected.lat != null ? '重 新 标 记' : '标 记 位 置'}</button>
                  )}
                  {selected.lat != null && !placing && (
                    <button onClick={() => clearLocation(selected.id)} style={{
                      padding: '5px 10px', fontSize: 12,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--line)', background: 'transparent',
                      color: 'var(--ink-3)', cursor: 'pointer',
                    }}>清除</button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 空状态提示 */}
          {!loading && members.length > 0 && locatedCount === 0 && !selected && (
            <div style={{
              position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(251,247,235,.95)', color: 'var(--ink-3)',
              padding: '10px 20px', borderRadius: 'var(--radius)',
              zIndex: 500, fontSize: 12, boxShadow: 'var(--shadow)',
              border: '1px solid var(--line)', whiteSpace: 'nowrap',
              fontFamily: 'var(--font-serif)', letterSpacing: 1,
            }}>
              {canEdit ? '打开族人列表，选中族人后点击地图标记居住地' : '暂无已标记位置的族人'}
            </div>
          )}
        </div>
      </div>

      {/* ── 世代轨道 ── */}
      {gens.length > 0 && (
        <div style={{
          display: 'flex', gap: 8, padding: '12px 22px',
          background: 'var(--surface)', borderTop: '1px solid var(--line)',
          flexShrink: 0, overflowX: 'auto',
        }}>
          <button
            onClick={() => setGenFilter(null)}
            style={{
              flex: '1 1 0', minWidth: 72, padding: '10px 8px',
              fontFamily: 'var(--font-serif)', fontSize: 13, letterSpacing: 2,
              color: genFilter == null ? '#fff' : 'var(--ink-2)',
              background: genFilter == null ? 'var(--accent)' : 'transparent',
              border: `1px solid ${genFilter == null ? 'var(--accent)' : 'var(--line)'}`,
              borderRadius: 6, cursor: 'pointer',
            }}
          >全 部</button>
          {gens.map(g => (
            <button
              key={g}
              onClick={() => setGenFilter(genFilter === g ? null : g)}
              style={{
                flex: '1 1 0', minWidth: 72, padding: '10px 8px',
                fontFamily: 'var(--font-serif)', fontSize: 13, letterSpacing: 2,
                color: genFilter === g ? '#fff' : 'var(--ink-2)',
                background: genFilter === g ? GEN_COLORS[(g - 1) % GEN_COLORS.length] : 'transparent',
                border: `1px solid ${genFilter === g ? GEN_COLORS[(g - 1) % GEN_COLORS.length] : 'var(--line)'}`,
                borderRadius: 6, cursor: 'pointer',
              }}
            >第 {g} 世</button>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import type { SessionPayload } from '@/lib/session'
import { usePins } from '@/hooks/usePins'

type Family = { id: string; surname: string; tang: string; role: string }

type SearchResult = {
  members: { id: string; name: string; zi?: string | null; gen: number; branch?: string | null; sex: string; deceased: boolean }[]
  events: { id: string; title: string; yearText?: string | null; year?: number | null; major: boolean }[]
}

function SearchModal({ familyId, onClose }: { familyId: string; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!q.trim()) { setResults(null); return }
    const t = setTimeout(async () => {
      setLoading(true)
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&familyId=${familyId}`)
      if (res.ok) setResults(await res.json())
      setLoading(false)
    }, 250)
    return () => clearTimeout(t)
  }, [q, familyId])

  const total = (results?.members.length ?? 0) + (results?.events.length ?? 0)

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(28,24,20,.5)', zIndex: 200, backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', top: '12vh', left: '50%', transform: 'translateX(-50%)',
        width: '90vw', maxWidth: 560, background: 'var(--surface-hi)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--line)', zIndex: 201, overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="搜索族人、字号、大事记…"
            style={{
              flex: 1, border: 0, background: 'transparent', fontSize: 15,
              color: 'var(--ink)', outline: 'none', fontFamily: 'var(--font-sans)',
            }}
            onKeyDown={e => e.key === 'Escape' && onClose()}
          />
          {loading && (
            <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>搜索中…</span>
          )}
          <kbd style={{ fontSize: 11, color: 'var(--ink-4)', background: 'var(--line-2)', borderRadius: 4, padding: '2px 6px' }}>Esc</kbd>
        </div>

        {results && (
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {total === 0 && (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>未找到匹配结果</div>
            )}

            {results.members.length > 0 && (
              <div>
                <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 600, color: 'var(--ink-4)', letterSpacing: 1 }}>族人</div>
                {results.members.map(m => (
                  <div
                    key={m.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'pointer', borderRadius: 4 }}
                    className="search-result-row"
                    onClick={() => { router.push(`/families/${familyId}/members`); onClose() }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600,
                      background: m.sex === 'F' ? '#fce7f3' : 'var(--line-2)',
                      color: m.sex === 'F' ? '#9d174d' : 'var(--ink-2)',
                      flexShrink: 0,
                    }}>
                      {m.name[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{m.name}</span>
                      {m.zi && <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--ink-3)' }}>字 {m.zi}</span>}
                      {m.deceased && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--ink-4)' }}>†</span>}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>第{m.gen}世{m.branch ? ` ${m.branch}` : ''}</span>
                  </div>
                ))}
              </div>
            )}

            {results.events.length > 0 && (
              <div style={{ borderTop: results.members.length > 0 ? '1px solid var(--line)' : 'none' }}>
                <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 600, color: 'var(--ink-4)', letterSpacing: 1 }}>大事记</div>
                {results.events.map(ev => (
                  <div
                    key={ev.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'pointer' }}
                    className="search-result-row"
                    onClick={() => { router.push(`/families/${familyId}/timeline`); onClose() }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 12, background: 'var(--line-2)', color: 'var(--ink-3)', flexShrink: 0 }}>
                      {ev.major ? '★' : '○'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{ev.title}</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{ev.yearText ?? ev.year ?? ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!results && !loading && (
          <div style={{ padding: '20px 16px', fontSize: 12, color: 'var(--ink-4)' }}>
            输入关键字搜索族人姓名、字号或大事记…
          </div>
        )}
      </div>
    </>
  )
}

export default function AppShell({
  session,
  families,
  children,
}: {
  session: SessionPayload
  families: Family[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const familyIdMatch = pathname.match(/\/families\/([^/]+)/)
  const currentFamilyId = familyIdMatch?.[1]
  const currentFamily = families.find(f => f.id === currentFamilyId) ?? families[0]

  const { pins, unpin } = usePins(currentFamily?.id ?? '')

  const navItems = currentFamily ? [
    { href: `/families/${currentFamily.id}/dashboard`, label: '概览', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href: `/families/${currentFamily.id}/tree`, label: '族谱树', icon: 'M4 6a2 2 0 014 0v1H4V6zm8 0a2 2 0 014 0v1h-4V6zM4 11h16M12 11v10M8 16h8' },
    { href: `/families/${currentFamily.id}/members`, label: '族人', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { href: `/families/${currentFamily.id}/timeline`, label: '大事记', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { href: `/families/${currentFamily.id}/migration`, label: '迁徙地图', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
    { href: `/families/${currentFamily.id}/invite`, label: '协作', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197' },
    { href: `/families/${currentFamily.id}/settings`, label: '设置', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  ] : []

  const pageTitle = navItems.find(n => pathname.startsWith(n.href))?.label ?? '族谱'

  useEffect(() => { setSidebarOpen(false) }, [pathname])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      if (currentFamily) setSearchOpen(v => !v)
    }
    if (e.key === 'Escape') setSearchOpen(false)
  }, [currentFamily])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="app">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(28,24,20,.4)', zIndex: 99 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="brand">
          <div className="seal">谱</div>
          <div className="name">
            族谱
            <small>GENEALOGY</small>
          </div>
        </div>

        {currentFamily && (
          <div className="family-switcher" onClick={() => setSwitcherOpen(v => !v)}>
            <div style={{ width: 22, height: 22, background: 'var(--accent)', color: '#f6e9d3', display: 'grid', placeItems: 'center', borderRadius: 3, fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
              {currentFamily.surname}
            </div>
            <div className="tang">{currentFamily.tang}</div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
            {switcherOpen && (
              <div className="fam-switch-pop" onClick={e => e.stopPropagation()}>
                {families.map(f => (
                  <div
                    key={f.id}
                    className={`item${f.id === currentFamily.id ? ' on' : ''}`}
                    onClick={() => { router.push(`/families/${f.id}/dashboard`); setSwitcherOpen(false) }}
                  >
                    <div className="mini-stamp">{f.surname}</div>
                    <span>{f.tang}</span>
                  </div>
                ))}
                <div className="divider" />
                <div className="add" onClick={() => { router.push('/families/new'); setSwitcherOpen(false) }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                  创建新族谱
                </div>
              </div>
            )}
          </div>
        )}

        <div className="nav-group">主要功能</div>
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item${pathname.startsWith(item.href) ? ' active' : ''}`}
          >
            <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
            </svg>
            {item.label}
          </Link>
        ))}

        {currentFamily && pins.length > 0 && (
          <>
            <div className="nav-group" style={{ marginTop: 8 }}>收藏</div>
            {pins.map(p => (
              <div
                key={p.id}
                className="nav-item"
                style={{ cursor: 'pointer' }}
                onClick={() => router.push(`/families/${currentFamily.id}/tree?open=${p.id}`)}
              >
                {/* pin icon */}
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-7 7-11a7 7 0 10-14 0c0 4 7 11 7 11z M12 10a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                  {p.branch && <span style={{ fontSize: 11, color: 'var(--ink-4)', marginLeft: 4 }}>{p.branch}</span>}
                </span>
                <span style={{ fontSize: 10, color: 'var(--ink-4)', flexShrink: 0 }}>第{p.gen}世</span>
                <button
                  type="button"
                  title="取消收藏"
                  onClick={e => { e.stopPropagation(); unpin(p.id) }}
                  style={{
                    background: 'transparent', border: 0, padding: '0 2px',
                    cursor: 'pointer', color: 'var(--ink-4)', fontSize: 14, lineHeight: 1,
                    flexShrink: 0,
                  }}
                >×</button>
              </div>
            ))}
          </>
        )}

        <div className="nav-group" style={{ marginTop: 8 }}>其他</div>
        <Link href="/explore" className={`nav-item${pathname === '/explore' ? ' active' : ''}`}>
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
          </svg>
          族谱广场
        </Link>

        <div className="sidebar-foot">
          <div className="avatar">{session.name[0]}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500, color: 'var(--ink)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.name}</div>
          </div>
          <form action={logout}>
            <button type="submit" style={{ background: 'transparent', border: 0, padding: 4, cursor: 'pointer', color: 'var(--ink-4)' }} title="退出登录">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </form>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)} type="button" aria-label="打开侧边栏">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <h1>{pageTitle}</h1>
          <div className="spacer" />
          {currentFamily && (
            <div className="search" style={{ cursor: 'text' }} onClick={() => setSearchOpen(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--ink-4)' }}>搜索族人 / 事件…</span>
              <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>⌘K</span>
            </div>
          )}
        </div>
        {children}
      </div>

      {searchOpen && currentFamily && (
        <SearchModal familyId={currentFamily.id} onClose={() => setSearchOpen(false)} />
      )}
    </div>
  )
}

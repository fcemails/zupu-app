'use client'

import { useEffect } from 'react'

// Catches errors that escape the root layout, including failed Server Action
// calls caused by a stale browser bundle after a new deployment.
export default function GlobalError({ reset }: { reset: () => void }) {
  useEffect(() => {
    // Reload once to fetch fresh JS bundles. sessionStorage prevents loops.
    const key = 'global_err_reloaded'
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1')
      window.location.reload()
    }
  }, [])

  return (
    <html lang="zh">
      <body style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', fontFamily: 'sans-serif', background: '#faf8f4',
      }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <p style={{ marginBottom: 16 }}>页面检测到更新，正在刷新…</p>
          <button
            onClick={() => { sessionStorage.removeItem('global_err_reloaded'); reset() }}
            style={{ padding: '8px 20px', cursor: 'pointer', borderRadius: 6, border: '1px solid #ccc', background: '#fff' }}
          >
            手动重试
          </button>
        </div>
      </body>
    </html>
  )
}

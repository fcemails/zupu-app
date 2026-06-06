'use client'

import { useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { login, register } from '@/app/actions/auth'
import type { AuthState } from '@/app/actions/auth'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loginState, loginAction, loginPending] = useActionState<AuthState, FormData>(login, undefined)
  const [regState, regAction, regPending] = useActionState<AuthState, FormData>(register, undefined)

  useEffect(() => {
    const dest = loginState?.redirectTo ?? regState?.redirectTo
    if (dest) router.push(dest)
  }, [loginState, regState, router])

  return (
    <div className="auth-shell">
      <aside className="auth-left">
        <div className="auth-vert">族 谱 · 系 出 同 源 · 木 本 水 源</div>
        <div className="auth-brand">
          <div className="stamp lg" style={{ transform: 'rotate(-3deg)' }}>
            <span>族</span><span>谱</span><span>数</span><span>字</span>
          </div>
          <div>
            <div className="auth-clan">族 谱</div>
            <div className="auth-tang">GENEALOGY</div>
          </div>
        </div>
        <div className="auth-tagline">
          为 万 千 中 国 家 庭<br />
          重 修 一 部 数 字 宗 谱
        </div>
        <ul className="auth-bullets">
          <li><span className="dot" />自 行 创 建 · 邀 请 族 人 共 同 维 护</li>
          <li><span className="dot" />字 辈 · 房 支 · 大 事 记 · 完 整 中 式 族 谱 结 构</li>
          <li><span className="dot" />三 档 隐 私 · 公 开 / 半 公 开 / 仅 邀 请</li>
          <li><span className="dot" />族 谱 树 可 视 化 · 迁 徙 轨 迹 追 溯</li>
        </ul>
        <div className="auth-foot">
          <span className="chip">数 字 族 谱</span>
          <span className="chip">传 承 家 风</span>
        </div>
        <svg className="auth-tree-deco" viewBox="0 0 200 240" aria-hidden="true">
          <g fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1">
            <rect x="86" y="10" width="28" height="20" /><line x1="100" y1="30" x2="100" y2="50" />
            <line x1="40" y1="50" x2="160" y2="50" />
            <line x1="40" y1="50" x2="40" y2="70" /><line x1="100" y1="50" x2="100" y2="70" /><line x1="160" y1="50" x2="160" y2="70" />
            <rect x="26" y="70" width="28" height="20" /><rect x="86" y="70" width="28" height="20" /><rect x="146" y="70" width="28" height="20" />
            <line x1="40" y1="90" x2="40" y2="110" /><line x1="100" y1="90" x2="100" y2="110" />
            <line x1="20" y1="110" x2="60" y2="110" /><line x1="80" y1="110" x2="120" y2="110" />
            <line x1="20" y1="110" x2="20" y2="130" /><line x1="60" y1="110" x2="60" y2="130" />
            <line x1="80" y1="110" x2="80" y2="130" /><line x1="120" y1="110" x2="120" y2="130" />
            <line x1="160" y1="90" x2="160" y2="130" />
            <rect x="8" y="130" width="24" height="18" /><rect x="48" y="130" width="24" height="18" />
            <rect x="68" y="130" width="24" height="18" /><rect x="108" y="130" width="24" height="18" />
            <rect x="148" y="130" width="24" height="18" />
          </g>
        </svg>
      </aside>

      <main className="auth-right">
        <div style={{ position: 'absolute', top: 24, right: 28, display: 'flex', gap: 14, alignItems: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
          <Link href="/explore" style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}>
            访 客 浏 览 公 开 族 谱 →
          </Link>
        </div>

        <div className="auth-card">
          <div className="auth-tabs">
            <button className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')} type="button">登 录</button>
            <button className={mode === 'register' ? 'on' : ''} onClick={() => setMode('register')} type="button">注 册</button>
            <div className="auth-tabs-thumb" style={{ left: mode === 'login' ? 4 : '50%' }} />
          </div>

          {mode === 'login' ? (
            <>
              <h2 className="auth-h2">欢 迎 回 来</h2>
              <div className="auth-sub">请使用邮箱登录账户</div>
              <form action={loginAction}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="auth-input">
                    <input name="email" type="email" placeholder="邮箱地址" autoComplete="email" required />
                  </div>
                  <div className="auth-input">
                    <input name="password" type="password" placeholder="密码" autoComplete="current-password" required />
                  </div>
                </div>
                {loginState?.error && <div className="auth-err">{loginState.error}</div>}
                <button type="submit" className="auth-submit" disabled={loginPending}>
                  {loginPending ? '登 录 中…' : '登 录'}
                </button>
              </form>
              <div className="auth-terms">
                还没有账号？<span onClick={() => setMode('register')}>立即注册</span>
              </div>
            </>
          ) : (
            <>
              <h2 className="auth-h2">开 启 您 的 族 谱</h2>
              <div className="auth-sub">注册后即可创建您自己的家族族谱</div>
              <form action={regAction}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="auth-input">
                    <input name="name" type="text" placeholder="您的姓名" autoComplete="name" required />
                  </div>
                  <div className="auth-input">
                    <input name="email" type="email" placeholder="邮箱地址" autoComplete="email" required />
                  </div>
                  <div className="auth-input">
                    <input name="password" type="password" placeholder="密码（至少8位）" autoComplete="new-password" required />
                  </div>
                </div>
                {regState?.error && <div className="auth-err">{regState.error}</div>}
                <button type="submit" className="auth-submit" disabled={regPending}>
                  {regPending ? '注 册 中…' : '注 册'}
                </button>
              </form>
              <div className="auth-terms">
                已有账号？<span onClick={() => setMode('login')}>立即登录</span>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

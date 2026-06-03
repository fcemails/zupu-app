'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const SURNAMES = ['李', '王', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴',
  '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗']

const STEPS = ['姓氏', '基本信息', '字辈', '始祖', '隐私']

export default function NewFamilyPage() {
  const router = useRouter()
  const submittingRef = useRef(false)
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null)
  const [data, setData] = useState({
    surname: '', tang: '', region: '', era: '', motto: '', zibei: '',
    access: 'semi' as 'public' | 'semi' | 'private',
    founderName: '', founderZi: '', founderBirth: '', founderDeath: '', founderBio: '',
  })

  function set(k: keyof typeof data, v: string) {
    setData(prev => ({ ...prev, [k]: v }))
  }

  const zibeiChars = data.zibei ? [...data.zibei].filter(c => c.trim()) : []

  async function submit() {
    if (submittingRef.current) return
    submittingRef.current = true
    setSaving(true)
    setStatus({ type: 'info', text: '正在创建族谱，请稍候…' })

    try {
      const res = await fetch('/api/families', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          surname: data.surname,
          tang: data.tang || `${data.surname}氏族谱`,
          region: data.region,
          era: data.era,
          motto: data.motto,
          zibei: data.zibei,
          access: data.access,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error?.message || '创建族谱失败，请重试')
      }
      const family = await res.json()
      setStatus({ type: 'success', text: '创建成功，正在跳转…' })

      if (data.founderName) {
        await fetch(`/api/families/${family.id}/members`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name: data.founderName,
            zi: data.founderZi,
            gen: 1,
            sex: 'M',
            birth: data.founderBirth,
            death: data.founderDeath,
            bio: data.founderBio,
            title: '始迁祖',
            deceased: true,
          }),
        }).catch(err => {
          console.error('Founder create failed:', err)
        })
      }

      router.push(`/families/${family.id}/dashboard`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '创建失败，请重试'
      setStatus({ type: 'error', text: message })
      setSaving(false)
      submittingRef.current = false
    }
  }

  return (
    <div className="cw-shell">
      <div className="cw-head">
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 600, letterSpacing: 2 }}>创建族谱</div>
        <div className="cw-stepper">
          {STEPS.map((s, i) => (
            <div key={i} className={`cw-st${i === step ? ' on' : i < step ? ' done' : ''}`}>
              <div className="num">{i < step ? '✓' : i + 1}</div>
              <div className="lbl">{s}</div>
            </div>
          ))}
        </div>
        <button className="btn ghost sm" onClick={() => router.back()} type="button">取消</button>
      </div>

      <div className="cw-body">
        {step === 0 && (
          <div>
            <div className="cw-step-h">
              <div className="cw-step-sub">第一步 · STEP 01</div>
              <div className="cw-step-t">选择姓氏</div>
              <div className="cw-step-line" />
            </div>
            <div className="cw-grid-2">
              <div>
                <div className="surname-grid">
                  {SURNAMES.map(s => (
                    <button
                      key={s}
                      type="button"
                      className={data.surname === s ? 'on' : ''}
                      onClick={() => set('surname', s)}
                    >{s}</button>
                  ))}
                  <button
                    type="button"
                    className={`custom${!SURNAMES.includes(data.surname) && data.surname ? ' on' : ''}`}
                    onClick={() => {
                      const v = prompt('请输入姓氏')
                      if (v) set('surname', v)
                    }}
                  >其他姓氏</button>
                </div>
                {data.surname && !SURNAMES.includes(data.surname) && (
                  <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-3)' }}>已选：{data.surname}</div>
                )}
              </div>
              {data.surname && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                  <div className="stamp lg">
                    <span>{data.surname}</span><span>氏</span><span>族</span><span>谱</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, letterSpacing: 6, color: 'var(--ink)' }}>{data.surname}氏</div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <div className="cw-step-h">
              <div className="cw-step-sub">第二步 · STEP 02</div>
              <div className="cw-step-t">基本信息</div>
              <div className="cw-step-line" />
            </div>
            <div className="form-grid">
              <div className="field-input">
                <label>堂号 <span className="req">*</span></label>
                <input value={data.tang} onChange={e => set('tang', e.target.value)} placeholder={`${data.surname}氏堂号，如「陇西堂」`} />
              </div>
              <div className="field-input">
                <label>始迁地 / 发源地</label>
                <input value={data.region} onChange={e => set('region', e.target.value)} placeholder="如「蜀眉柳溪」" />
              </div>
              <div className="field-input">
                <label>始迁朝代 / 年代</label>
                <input value={data.era} onChange={e => set('era', e.target.value)} placeholder="如「元末明初」" />
              </div>
              <div className="field-input" style={{ gridColumn: '1 / -1' }}>
                <label>族训 / 堂训</label>
                <textarea
                  value={data.motto}
                  onChange={e => set('motto', e.target.value)}
                  placeholder="如「明德惟馨，积善余庆，耕读传家，忠孝为本」"
                  style={{ minHeight: 80 }}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="cw-step-h">
              <div className="cw-step-sub">第三步 · STEP 03</div>
              <div className="cw-step-t">字辈排行</div>
              <div className="cw-step-line" />
            </div>
            <div className="cw-grid-2">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="zibei-input">
                  <input
                    value={data.zibei}
                    onChange={e => set('zibei', e.target.value)}
                    placeholder="输入字辈，如：永世昌隆显文运振家声"
                  />
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>按顺序输入字辈字，可连续输入不用空格。跳过此步也可稍后在设置中填写。</div>
              </div>
              {zibeiChars.length > 0 && (
                <div className="zibei-preview">
                  {zibeiChars.map((c, i) => (
                    <div key={i} className="zb-c">
                      <div className="zb-num">第{i + 1}辈</div>
                      <div className="zb-ch">{c}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="cw-step-h">
              <div className="cw-step-sub">第四步 · STEP 04</div>
              <div className="cw-step-t">添加始祖</div>
              <div className="cw-step-line" />
            </div>
            <div className="cw-grid-2">
              <div className="form-grid">
                <div className="field-input">
                  <label>始祖姓名 <span className="req">*</span></label>
                  <input value={data.founderName} onChange={e => set('founderName', e.target.value)} placeholder={`${data.surname}…`} />
                </div>
                <div className="field-input">
                  <label>字</label>
                  <input value={data.founderZi} onChange={e => set('founderZi', e.target.value)} placeholder="始祖的字" />
                </div>
                <div className="field-input">
                  <label>生辰</label>
                  <input value={data.founderBirth} onChange={e => set('founderBirth', e.target.value)} placeholder="如「明洪武四年(1371)」" />
                </div>
                <div className="field-input">
                  <label>卒年</label>
                  <input value={data.founderDeath} onChange={e => set('founderDeath', e.target.value)} placeholder="如「明宣德元年(1426)」" />
                </div>
                <div className="field-input" style={{ gridColumn: '1 / -1' }}>
                  <label>生平简介</label>
                  <textarea value={data.founderBio} onChange={e => set('founderBio', e.target.value)} placeholder="始祖生平事迹…" />
                </div>
              </div>
              {data.founderName && (
                <div className="founder-preview">
                  <div className="fp-stamp">
                    <div className="stamp">
                      <span>{data.surname}</span><span>氏</span><span>始</span><span>祖</span>
                    </div>
                  </div>
                  <div className="fp-name">{data.founderName}</div>
                  {data.founderZi && <div className="fp-zi">字 {data.founderZi}</div>}
                  {(data.founderBirth || data.founderDeath) && (
                    <div className="fp-yrs">{data.founderBirth}{data.founderBirth && data.founderDeath ? ' — ' : ''}{data.founderDeath}</div>
                  )}
                  {data.founderBio && <div className="fp-bio" style={{ marginTop: 16 }}>{data.founderBio}</div>}
                  <div className="fp-tag">一世始祖</div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <div className="cw-step-h">
              <div className="cw-step-sub">第五步 · STEP 05</div>
              <div className="cw-step-t">隐私设置</div>
              <div className="cw-step-line" />
            </div>
            <div style={{ maxWidth: 560 }}>
              {[
                { value: 'public', label: '完全公开', desc: '任何人都可以浏览族谱全部内容，无需登录', icon: '🌐' },
                { value: 'semi', label: '半公开', desc: '公开族谱基本信息，敏感字段（住址、电话）仅成员可见', icon: '🔓' },
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
          </div>
        )}
      </div>

      {status && (
        <div
          style={{
            margin: '18px 0',
            padding: '12px 16px',
            borderRadius: 12,
            background: status.type === 'error' ? '#ffe5e5' : status.type === 'success' ? '#e6ffed' : '#f0f6ff',
            color: status.type === 'error' ? '#9b1c1c' : status.type === 'success' ? '#1f5d2b' : '#1d4f91',
            border: status.type === 'error' ? '1px solid #f0c6c6' : status.type === 'success' ? '1px solid #b7deb8' : '1px solid #c8d9f5',
          }}
        >
          {status.text}
        </div>
      )}

      <div className="cw-foot">
        <button
          type="button"
          className="btn ghost"
          onClick={() => step > 0 ? setStep(s => s - 1) : router.back()}
        >
          {step > 0 ? '上一步' : '取消'}
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            className="btn primary"
            disabled={step === 0 && !data.surname}
            onClick={() => setStep(s => s + 1)}
          >
            下一步
          </button>
        ) : (
          <button
            type="button"
            className="btn primary"
            onClick={submit}
            disabled={saving || !data.surname}
          >
            {saving ? '创建中…' : '完成创建'}
          </button>
        )}
      </div>
    </div>
  )
}

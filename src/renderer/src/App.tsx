import { useEffect, useMemo, useRef, useState } from 'react'

/* ---------------- 类型 ---------------- */
type Friend = {
  id: string
  name: string
  streakText: string
  streakDays: number | null
  convId: string | null
  participantCount: number | null
  isGroup: boolean
  groupReason: string
  selected: boolean
  lastSentAt: string | null
  lastOk: boolean | null
  lastError: string | null
}
type Rec = { at: string; name: string; ok: boolean; message: string; error: string | null }
type LogLine = { at: string; level: 'info' | 'warn' | 'error'; text: string }
type AiSettings = { enabled: boolean; baseUrl: string; apiKey: string; model: string; prompt: string }
type Settings = {
  enabled: boolean
  scheduleTimes: string[]
  jitterMinutes: number
  headless: boolean
  minIntervalSec: number
  maxIntervalSec: number
  maxPerRun: number
  retryEnabled: boolean
  retryDelayMin: number
  templates: string[]
  ai: AiSettings
  chromePath: string
}
type Snapshot = {
  settings: Settings
  friends: Friend[]
  history: Rec[]
  login: { status: string; nickname: string | null; userId: string | null; checkedAt: string | null; message: string | null }
  status: { session: string; running: boolean; lastRunAt: string | null; nextRunAt: string | null; lastSummary: string | null }
  logs: LogLine[]
}

const api = (window as unknown as { api: Record<string, (p?: unknown) => Promise<unknown>> }).api

/* ---------------- 图标 ---------------- */
function Icon({ name, size = 17 }: { name: string; size?: number }): JSX.Element {
  const p: Record<string, JSX.Element> = {
    overview: (<><rect x="3" y="3" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="2" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" /></>),
    friends: (<><circle cx="9" cy="8" r="3.4" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M17 11.2a3 3 0 100-6" /><path d="M18 20c0-2.4-.7-4.2-2-5.3" /></>),
    history: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5.3l3.4 2" /></>),
    settings: (<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1V21a2 2 0 11-4 0v-.1A1.6 1.6 0 007.5 19.4l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.6 1.6 0 003.6 14H3a2 2 0 110-4h.1A1.6 1.6 0 004.6 7.5l-.1-.1a2 2 0 112.8-2.8l.1.1A1.6 1.6 0 0010 3.6V3a2 2 0 114 0v.1a1.6 1.6 0 002.7 1.1l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 001.1 2.7H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z" /></>),
    flame: (<path d="M12 2.7c.4 3 3.4 4.2 4.6 6.7 1.5 3.1.1 7.1-3.2 8.9-3.3 1.8-7.3.4-8.8-2.7-1.3-2.7-.5-5.6 1.3-7.6.2 1 .9 1.8 1.7 2 .1-3.4 1.9-5.6 4.4-7.3z" />),
    check: (<path d="M20 6L9 17l-5-5" />),
    x: (<><path d="M18 6L6 18" /><path d="M6 6l12 12" /></>),
    play: (<path d="M6 3.8l13 8.2-13 8.2z" />),
    clock: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5.3l3.4 2" /></>),
    users: (<><circle cx="9" cy="8" r="3.4" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M17 11.2a3 3 0 100-6" /></>),
    key: (<><circle cx="8" cy="15" r="4" /><path d="M11 12l8-8 3 3-2 2-2-2-2 2 2 2-3 3" /></>),
    server: (<><rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="13" width="18" height="7" rx="2" /><path d="M7 7.5h.01M7 16.5h.01" /></>),
    retry: (<><path d="M21 12a9 9 0 11-3.2-6.9" /><path d="M21 4v5h-5" /></>),
    search: (<><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>),
    refresh: (<><path d="M21 12a9 9 0 11-3.2-6.9" /><path d="M21 4v5h-5" /></>),
    trash: (<><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" /></>),
    folder: (<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" />),
    inbox: (<><path d="M3 12h5l1.5 3h5L16 12h5" /><path d="M5 5h14l2 7v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5z" /></>)
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {p[name] || null}
    </svg>
  )
}

/* ---------------- 交互组件 ---------------- */
function Switch({
  checked,
  onChange,
  disabled
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={'switch' + (checked ? ' on' : '')}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="knob" />
    </button>
  )
}

/** 数字缓动：值变化时滚动到新值，而不是直接跳变。 */
function AnimatedNumber({ value, className, suffix }: { value: number; className?: string; suffix?: string }): JSX.Element {
  const [shown, setShown] = useState(value)
  const shownRef = useRef(value)
  useEffect(() => {
    const from = shownRef.current
    const to = value
    if (from === to) return
    const t0 = performance.now()
    const dur = 560
    let raf = 0
    const step = (t: number): void => {
      const p = Math.min(1, (t - t0) / dur)
      const e = 1 - Math.pow(1 - p, 3)
      const v = Math.round(from + (to - from) * e)
      shownRef.current = v
      setShown(v)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return (
    <div className={className}>
      {shown}
      {suffix || ''}
    </div>
  )
}

/* ---------------- 品牌标记 ---------------- */
// 与桌面图标同一套火焰轮廓（尖顶 + 左侧内凹），保证图标与界面内标识一致
const FLAME_D =
  'M16.9 3.4C18.2 7.8 20.7 13.8 21.5 19.5C22.2 25.2 19.6 28.3 16 28.4C12.4 28.3 9.8 25.2 10.5 19.5C11.2 16 12.5 15.2 13.2 13.4C14.2 10.7 16.1 6.6 16.9 3.4Z'

function FlameMark({ size = 22 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="dyFlame" x1="0.15" y1="1" x2="0.35" y2="0">
          <stop offset="0" stopColor="#FFE7A6" />
          <stop offset="0.42" stopColor="#FFA02C" />
          <stop offset="1" stopColor="#FF6A08" />
        </linearGradient>
      </defs>
      {/* 侧焰 */}
      <g transform="translate(15.5,26) scale(0.58) translate(-15.5,-26) translate(-7.5,1.2)" opacity="0.95">
        <path d={FLAME_D} fill="#F0520A" />
      </g>
      {/* 主焰 */}
      <path d={FLAME_D} fill="url(#dyFlame)" />
      {/* 内焰芯 */}
      <ellipse cx="16" cy="23.2" rx="3.3" ry="3.9" fill="#FFF6D8" opacity="0.92" />
    </svg>
  )
}

/* ---------------- 工具 ---------------- */
/** 洗掉 Electron IPC 包装与 Error 前缀，只留下人能看懂的原因。 */
function cleanErr(e: unknown): string {
  return String(e)
    .replace(/^Error:\s*/, '')
    .replace(/Error invoking remote method '[^']*':\s*/, '')
    .replace(/^Error:\s*/, '')
    .trim()
    .slice(0, 200)
}

function hueOf(s: string): number {
  let h = 7
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360
  return h
}
function Avatar({ name }: { name: string }): JSX.Element {
  const h = hueOf(name)
  return (
    <div
      className="avatar"
      style={{ background: 'linear-gradient(135deg, hsl(' + h + ' 62% 52%), hsl(' + ((h + 30) % 360) + ' 62% 40%))' }}
    >
      {name.slice(0, 1)}
    </div>
  )
}
function fmt(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('zh-CN', { hour12: false })
}
function clock(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '--:--:--' : d.toLocaleTimeString('zh-CN', { hour12: false })
}
function todayKey(): string {
  const d = new Date()
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()
}
function dayKey(iso: string): string {
  const d = new Date(iso)
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()
}
function countdown(iso: string | null): string {
  if (!iso) return '未安排'
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return '即将执行'
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return h + ' 小时 ' + m + ' 分后'
  if (m > 0) return m + ' 分 ' + (s % 60) + ' 秒后'
  return (s % 60) + ' 秒后'
}

const TABS = [
  { id: 'overview', label: '概览', icon: 'overview' },
  { id: 'friends', label: '好友', icon: 'friends' },
  { id: 'history', label: '记录', icon: 'history' },
  { id: 'settings', label: '设置', icon: 'settings' }
]

export default function App(): JSX.Element {
  const [state, setState] = useState<Snapshot | null>(null)
  const [tab, setTab] = useState('overview')
  const [keyword, setKeyword] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState('')
  const [draft, setDraft] = useState<Settings | null>(null)
  const [, setTick] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const dirty = useRef(false)
  const logRef = useRef<HTMLDivElement | null>(null)
  const refreshingRef = useRef(false)
  const runningRef = useRef(false)
  const lastTab = useRef('')

  useEffect(() => {
    void api.snapshot().then((s) => setState(s as Snapshot))
    const off = api.onUpdate
      ? (api.onUpdate as unknown as (cb: (s: unknown) => void) => () => void)((s) => setState(s as Snapshot))
      : undefined
    return () => { if (off) off() }
  }, [])

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (state && !dirty.current) setDraft(JSON.parse(JSON.stringify(state.settings)))
  }, [state])

  useEffect(() => {
    if (logRef.current && tab === 'overview') logRef.current.scrollTop = logRef.current.scrollHeight
  }, [state, tab])

  // 液态玻璃的指向性高光：把指针位置写进最近的 .glass 元素的 --mx/--my
  useEffect(() => {
    const onMove = (e: PointerEvent): void => {
      const t = e.target as HTMLElement | null
      const el = t && t.closest ? (t.closest('.glass') as HTMLElement | null) : null
      if (!el) return
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) return
      el.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%')
      el.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%')
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  const flash = (msg: string): void => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 3800)
  }

  const call = async (name: string, payload?: unknown, okMsg?: string): Promise<void> => {
    setBusy(name)
    try {
      const next = await api[name](payload)
      if (next) setState(next as Snapshot)
      if (okMsg) flash(okMsg)
    } catch (e) {
      flash('操作失败：' + cleanErr(e))
    } finally {
      setBusy('')
    }
  }

  /** 拉取好友列表。silent=true 时不弹成功提示（用于进入页面时的自动刷新）。 */
  const refreshFriends = async (silent: boolean): Promise<void> => {
    if (refreshingRef.current) return
    refreshingRef.current = true
    setRefreshing(true)
    try {
      const next = await api.refreshFriends()
      if (next) setState(next as Snapshot)
      if (!silent) flash('好友列表已刷新')
    } catch (e) {
      flash('刷新好友失败：' + cleanErr(e))
    } finally {
      refreshingRef.current = false
      setRefreshing(false)
    }
  }

  // 每次进入「好友」页自动刷新一次。
  // 渲染期同步 runningRef，避免把 running 放进依赖里导致重复触发。
  runningRef.current = state ? state.status.running : false
  useEffect(() => {
    if (tab !== 'friends') {
      lastTab.current = tab
      return
    }
    if (lastTab.current === 'friends') return
    lastTab.current = 'friends'
    if (runningRef.current) {
      flash('正在执行任务，已跳过自动刷新')
      return
    }
    void refreshFriends(true)
  }, [tab])

  const friends = state ? state.friends : []
  const history = state ? state.history : []

  const stats = useMemo(() => {
    const tk = todayKey()
    const today = history.filter((h) => dayKey(h.at) === tk)
    const okToday = today.filter((h) => h.ok).length
    const failToday = today.filter((h) => !h.ok).length
    const selected = friends.filter((f) => f.selected && !f.isGroup)
    const total = okToday + failToday
    return {
      okToday,
      failToday,
      selected: selected.length,
      streakCount: friends.filter((f) => !f.isGroup && f.streakDays).length,
      rate: total ? Math.round((okToday / total) * 100) : 0
    }
  }, [history, friends])

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase()
    const list = k ? friends.filter((f) => f.name.toLowerCase().indexOf(k) >= 0) : friends
    return list.slice().sort((a, b) => (b.streakDays || 0) - (a.streakDays || 0))
  }, [friends, keyword])

  if (!state || !draft) {
    return (
      <div className="app">
        <div className="empty" style={{ margin: 'auto' }}><span className="spin" /><span className="t">正在加载…</span></div>
      </div>
    )
  }

  const running = state.status.running
  const loggedIn = state.login.status === 'logged_in'
  const dotCls = loggedIn ? 'ok' : state.login.status === 'expired' || state.login.status === 'logged_out' ? 'err' : 'warn'
  const loginText = loggedIn
    ? '已登录' + (state.login.nickname ? ' · ' + state.login.nickname : '')
    : state.login.status === 'working' ? '等待扫码…'
    : state.login.status === 'expired' ? '登录态已失效'
    : state.login.status === 'logged_out' ? '未登录' : '登录态未知'

  const patchDraft = (patch: Partial<Settings>): void => {
    dirty.current = true
    setDraft({ ...draft, ...patch })
  }
  const patchAi = (patch: Partial<AiSettings>): void => {
    dirty.current = true
    setDraft({ ...draft, ai: { ...draft.ai, ...patch } })
  }
  const saveSettings = async (): Promise<void> => {
    dirty.current = false
    const cleaned = { ...draft, templates: draft.templates.map((s) => s.trim()).filter(Boolean) }
    setDraft(cleaned)
    await call('setSettings', cleaned, '设置已保存')
  }
  const setTemplate = (i: number, v: string): void => {
    const next = draft.templates.slice()
    next[i] = v
    patchDraft({ templates: next })
  }
  const removeTemplate = (i: number): void => {
    patchDraft({ templates: draft.templates.filter((_, idx) => idx !== i) })
  }
  const addTemplate = (): void => {
    patchDraft({ templates: [...draft.templates, ''] })
  }
  const testAi = async (): Promise<void> => {
    setBusy('ai')
    try {
      const r = (await api.testAi(draft.ai)) as { text: string }
      flash('AI 生成成功：' + r.text)
    } catch (e) {
      flash('AI 测试失败：' + cleanErr(e))
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="app">
      <div className="backdrop" aria-hidden="true">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
      </div>
      <div className="veil" aria-hidden="true" />
      <aside className="sidebar glass">
        <div className="brand">
          <div className="brand-mark">
            <FlameMark size={22} />
          </div>
          <div className="brand-text">
            续火花助手
            <small>DOUYIN SPARK</small>
          </div>
        </div>
        <nav className="nav">
          {TABS.map((t) => (
            <button key={t.id} className={'nav-item' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
              <Icon name={t.icon} />
              <span>{t.label}</span>
              {t.id === 'friends' && friends.length > 0 ? (
                <span className="badge-count">{friends.filter((f) => !f.isGroup).length}</span>
              ) : null}
              {t.id === 'history' && history.length > 0 ? <span className="badge-count">{history.length}</span> : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="conn">
            <span className={'dot ' + dotCls} />
            <span>{loginText}</span>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar glass">
          <div className="page-title">{(TABS.find((t) => t.id === tab) || TABS[0]).label}</div>
          {running ? (
            <span className="badge warn"><span className="spin" />执行中</span>
          ) : null}
          {draft.enabled ? <span className="badge ok">定时已开启</span> : <span className="badge dim">定时未开启</span>}
          <span className="badge dim">下次 {countdown(state.status.nextRunAt)}</span>
          <div className="spacer" />
          <button className="ghost sm" disabled={busy === 'startLogin'} onClick={() => call('startLogin', undefined, '已打开登录窗口，请扫码')}>扫码登录</button>
          <button className="ghost sm" disabled={busy === 'checkLogin'} onClick={() => call('checkLogin', undefined, '登录态已刷新')}>检查登录</button>
          <button className="sm" disabled={running} onClick={() => call('runNow', { dryRun: true }, '试运行已开始')}>试运行</button>
          <button className="primary sm" disabled={running} onClick={() => call('runNow', { dryRun: false }, '已开始续火花')}>立即续火</button>
        </header>

        <main className="content">
          <div className="tabpane" key={tab}>
          {tab === 'overview' ? (
            <div className="overview">
              <div className="grid">
                <div className="stat glass ok">
                  <div className="head"><Icon name="check" size={15} />今日成功</div>
                  <AnimatedNumber value={stats.okToday} className="num ok" />
                  <div className="sub">失败 {stats.failToday} 人</div>
                </div>
                <div className="stat glass">
                  <div className="head"><Icon name="overview" size={15} />今日成功率</div>
                  <AnimatedNumber value={stats.rate} className="num" suffix="%" />
                  <div className="progress" style={{ marginTop: 8 }}><i style={{ width: stats.rate + '%' }} /></div>
                </div>
                <div className="stat glass">
                  <div className="head"><Icon name="users" size={15} />已勾选好友</div>
                  <AnimatedNumber value={stats.selected} className="num" />
                  <div className="sub">好友总数 {friends.filter((f) => !f.isGroup).length}</div>
                </div>
                <div className="stat glass flame">
                  <div className="head"><Icon name="flame" size={15} />有火花的好友</div>
                  <AnimatedNumber value={stats.streakCount} className="num flame" />
                  <div className="sub">按火花天数自动识别</div>
                </div>
                <div className="stat glass">
                  <div className="head"><Icon name="clock" size={15} />上次执行</div>
                  <div className="num" style={{ fontSize: 15, fontWeight: 600 }}>{fmt(state.status.lastRunAt)}</div>
                  <div className="sub">{state.status.lastSummary || '尚未执行'}</div>
                </div>
              </div>

              {!loggedIn ? (
                <div className="panel glass" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--warn)', marginTop: 2 }}><Icon name="key" size={18} /></span>
                  <div>
                    <h3 className="section-title" style={{ marginBottom: 6 }}>需要登录</h3>
                    <div className="hint">
                      {state.login.message || '点击右上角「扫码登录」，在弹出的浏览器窗口里用手机抖音扫码。登录态保存在本机，之后无需重复登录。'}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="panel glass grow">
                <div className="panel-head">
                  <h3>运行日志</h3>
                  <span className="hint">共 {state.logs.length} 条</span>
                  <div className="spacer" />
                  <button className="tiny ghost" onClick={() => call('clearLogs')}>清空</button>
                </div>
                <div className="logs" ref={logRef}>
                  {state.logs.length === 0 ? (
                    <div className="info">暂无日志</div>
                  ) : (
                    state.logs.map((l, i) => (
                      <div className="row" key={i}>
                        <span className="ts">{clock(l.at)}</span>
                        <span className={l.level}>{l.text}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {tab === 'friends' ? (
            <div style={{ display: 'grid', gap: 14 }}>
              <div className="row">
                <div style={{ position: 'relative', width: 250 }}>
                  <input placeholder="搜索好友备注名…" value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ paddingLeft: 34 }} />
                  <span style={{ position: 'absolute', left: 11, top: 9, color: 'var(--text-faint)' }}><Icon name="search" size={15} /></span>
                </div>
                <button onClick={() => refreshFriends(false)} disabled={refreshing}>
                  {refreshing ? <span className="row" style={{ gap: 6 }}><span className="spin" />读取中</span> : <span className="row" style={{ gap: 6 }}><Icon name="refresh" size={14} />刷新好友列表</span>}
                </button>
                <div className="spacer" />
                <button className="sm" onClick={() => call('selectAll', { selected: true, onlyWithStreak: true }, '已选中所有有火花的好友')}>选中有火的</button>
                <button className="sm" onClick={() => call('selectAll', { selected: true, onlyWithStreak: false }, '已全选')}>全选</button>
                <button className="sm" onClick={() => call('selectAll', { selected: false, onlyWithStreak: false }, '已全部取消')}>全不选</button>
              </div>
              {refreshing ? <div className="progress thin"><i className="indet" /></div> : null}
              <div className="hint">
                勾选要自动续火花的好友。带 🔥 的数字是当前连续天数；标了「群聊」的只是提示，悬停可看判定依据，「选中有火的」会自动跳过它们。
                <span className="auto-tag">进入本页会自动刷新一次</span>
              </div>
              <div className="table-wrap glass">
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 44 }} />
                        <th>好友</th>
                        <th style={{ width: 130 }}>火花</th>
                        <th style={{ width: 170 }}>上次发送</th>
                        <th style={{ width: 100 }}>结果</th>
                        <th>备注 / 错误</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={6}>
                            <div className="empty">
                              <Icon name="inbox" size={34} />
                              <div className="t">{friends.length === 0 ? '还没有好友数据' : '没有匹配的好友'}</div>
                              <div className="d">{friends.length === 0 ? '先登录，再点「刷新好友列表」' : '换个关键词试试'}</div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filtered.map((f) => (
                          <tr key={f.id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={f.selected}
                                title={f.groupReason}
                                onChange={(e) => call('patchFriend', { id: f.id, patch: { selected: e.target.checked } })}
                              />
                            </td>
                            <td>
                              <div className="friend-cell">
                                <Avatar name={f.name} />
                                <span className="friend-name">{f.name}</span>
                                {f.isGroup ? <span className="badge dim" title={f.groupReason}>群聊</span> : null}
                              </div>
                            </td>
                            <td>
                              {f.streakDays ? (
                                <span className="spark"><span className="ico">🔥</span>{f.streakDays} 天</span>
                              ) : f.streakText ? (
                                <span style={{ color: 'var(--text-faint)' }}>{f.streakText}</span>
                              ) : (
                                <span style={{ color: 'var(--text-faint)' }}>—</span>
                              )}
                            </td>
                            <td style={{ color: 'var(--text-faint)' }}>{fmt(f.lastSentAt)}</td>
                            <td>
                              {f.lastOk === null ? <span style={{ color: 'var(--text-faint)' }}>—</span> : f.lastOk ? <span className="badge ok">成功</span> : <span className="badge err">失败</span>}
                            </td>
                            <td style={{ color: 'var(--text-faint)', fontSize: 12 }} title={f.lastError || ''}>{f.lastError || '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {tab === 'history' ? (
            <div style={{ display: 'grid', gap: 14 }}>
              <div className="row">
                <h3 className="section-title" style={{ margin: 0 }}><Icon name="history" size={15} />发送记录</h3>
                <span className="hint">共 {history.length} 条</span>
                <div className="spacer" />
                <button className="sm ghost" onClick={() => call('clearHistory', undefined, '记录已清空')}><span className="row" style={{ gap: 6 }}><Icon name="trash" size={14} />清空记录</span></button>
              </div>
              <div className="table-wrap glass">
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 180 }}>时间</th>
                        <th style={{ width: 200 }}>好友</th>
                        <th style={{ width: 90 }}>结果</th>
                        <th>内容 / 错误</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.length === 0 ? (
                        <tr><td colSpan={4}><div className="empty"><Icon name="inbox" size={34} /><div className="t">还没有发送记录</div><div className="d">执行一次续火花后，这里会留下每一条的明细</div></div></td></tr>
                      ) : (
                        history.map((h, i) => (
                          <tr key={i}>
                            <td style={{ color: 'var(--text-faint)' }}>{fmt(h.at)}</td>
                            <td><div className="friend-cell"><Avatar name={h.name} /><span>{h.name}</span></div></td>
                            <td>{h.ok ? <span className="badge ok">成功</span> : <span className="badge err">失败</span>}</td>
                            <td style={{ color: h.ok ? 'var(--text)' : 'var(--err)' }}>{h.ok ? h.message : h.error}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {tab === 'settings' ? (
            <div className="form">
              <div className="panel glass">
                <h3 className="section-title"><Icon name="clock" size={15} />定时与节奏</h3>
                <div className="check">
                  <Switch checked={draft.enabled} onChange={(v) => patchDraft({ enabled: v })} />
                  <span>开启定时任务（到点自动续火花）</span>
                </div>
                <div className="row" style={{ marginTop: 16 }}>
                  <div className="field" style={{ flex: 1, minWidth: 260 }}>
                    <label>执行时间（24 小时制，逗号分隔）</label>
                    <input value={draft.scheduleTimes.join(', ')} onChange={(e) => patchDraft({ scheduleTimes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="09:05, 21:05" />
                  </div>
                  <div className="field" style={{ width: 160 }}>
                    <label>随机浮动（分钟）</label>
                    <input type="number" value={draft.jitterMinutes} onChange={(e) => patchDraft({ jitterMinutes: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="row" style={{ marginTop: 14 }}>
                  <div className="field" style={{ width: 170 }}>
                    <label>好友间隔最小（秒）</label>
                    <input type="number" value={draft.minIntervalSec} onChange={(e) => patchDraft({ minIntervalSec: Number(e.target.value) })} />
                  </div>
                  <div className="field" style={{ width: 170 }}>
                    <label>好友间隔最大（秒）</label>
                    <input type="number" value={draft.maxIntervalSec} onChange={(e) => patchDraft({ maxIntervalSec: Number(e.target.value) })} />
                  </div>
                  <div className="field" style={{ width: 170 }}>
                    <label>单轮最多发送（人）</label>
                    <input type="number" value={draft.maxPerRun} onChange={(e) => patchDraft({ maxPerRun: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="check" style={{ marginTop: 16 }}>
                  <Switch checked={draft.headless} onChange={(v) => patchDraft({ headless: v })} />
                  <span>无头模式（后台静默运行，不弹出浏览器窗口）</span>
                </div>
              </div>

              <div className="panel glass">
                <h3 className="section-title"><Icon name="retry" size={15} />失败补发</h3>
                <div className="check">
                  <Switch checked={draft.retryEnabled} onChange={(v) => patchDraft({ retryEnabled: v })} />
                  <span>本轮有失败时，自动补发一次</span>
                </div>
                <div className="field" style={{ width: 200, marginTop: 14 }}>
                  <label>补发延迟（分钟）</label>
                  <input type="number" value={draft.retryDelayMin} onChange={(e) => patchDraft({ retryDelayMin: Number(e.target.value) })} />
                </div>
              </div>

              <div className="panel glass">
                <h3 className="section-title"><Icon name="inbox" size={15} />本地文案库</h3>
                <div className="tpl-meta">
                  <span className="badge dim">共 {draft.templates.length} 条</span>
                  <span className="hint">发送时从中随机挑一条（AI 关闭或调用失败时使用）</span>
                </div>
                {draft.templates.map((tpl, i) => (
                  <div className="tpl-row" key={i}>
                    <input value={tpl} onChange={(e) => setTemplate(i, e.target.value)} placeholder="例如：续火花来啦 🔥" />
                    <button className="tiny ghost" title="删除这一条" onClick={() => removeTemplate(i)}>
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                ))}
                {draft.templates.length === 0 ? <div className="hint" style={{ marginBottom: 8 }}>还没有文案，添加一条吧（留空则使用内置默认文案）。</div> : null}
                <button className="sm ghost" onClick={addTemplate}>+ 添加一条</button>
              </div>

              <div className="panel glass">
                <h3 className="section-title"><Icon name="server" size={15} />AI 自动生成消息</h3>
                <div className="check">
                  <Switch checked={draft.ai.enabled} onChange={(v) => patchAi({ enabled: v })} />
                  <span>用大模型为每个好友生成不重复的问候语</span>
                </div>
                <div className="hint" style={{ margin: '10px 0 14px' }}>
                  需要你自己的 API Key，程序不内置。任何 OpenAI 兼容接口都可以用；未配置或调用失败时会自动回退到本地文案库。
                </div>
                <div className="row">
                  <div className="field" style={{ flex: 2, minWidth: 280 }}>
                    <label>接口地址（OpenAI 兼容）</label>
                    <input value={draft.ai.baseUrl} onChange={(e) => patchAi({ baseUrl: e.target.value })} placeholder="https://api.deepseek.com/v1" />
                  </div>
                  <div className="field" style={{ flex: 1, minWidth: 180 }}>
                    <label>模型</label>
                    <input value={draft.ai.model} onChange={(e) => patchAi({ model: e.target.value })} placeholder="deepseek-chat" />
                  </div>
                </div>
                <div className="field" style={{ marginTop: 14 }}>
                  <label>API Key（仅保存在本机）</label>
                  <input type="password" value={draft.ai.apiKey} onChange={(e) => patchAi({ apiKey: e.target.value })} placeholder="sk-..." />
                </div>
                <div className="field" style={{ marginTop: 14 }}>
                  <label>提示词</label>
                  <textarea rows={3} value={draft.ai.prompt} onChange={(e) => patchAi({ prompt: e.target.value })} />
                </div>
                <div className="row" style={{ marginTop: 14 }}>
                  <button onClick={testAi} disabled={busy === 'ai'}>
                    {busy === 'ai' ? <span className="row" style={{ gap: 6 }}><span className="spin" />测试中</span> : '测试生成'}
                  </button>
                  <span className="hint">用的是上面当前填写的内容，不必先保存。</span>
                </div>
              </div>

              <div className="panel glass">
                <h3 className="section-title"><Icon name="settings" size={15} />高级</h3>
                <div className="field" style={{ marginBottom: 14 }}>
                  <label>Chrome 可执行文件路径（留空则自动使用系统 Chrome）</label>
                  <input value={draft.chromePath} onChange={(e) => patchDraft({ chromePath: e.target.value })} placeholder="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" />
                </div>
                <div className="row">
                  <button className="sm" onClick={() => call('openDataDir')}><span className="row" style={{ gap: 6 }}><Icon name="folder" size={14} />打开数据目录</span></button>
                  <button className="sm" onClick={() => call('logout', undefined, '已退出登录并清除本机登录态')}><span className="row" style={{ gap: 6 }}><Icon name="x" size={14} />退出登录</span></button>
                  <button className="sm" onClick={() => call('clearLogs')}>清空日志</button>
                </div>
              </div>

              <div className="row">
                <button className="primary" onClick={saveSettings}>保存设置</button>
                <span className="hint">修改后需点保存才会生效。</span>
              </div>
            </div>
          ) : null}
          </div>
        </main>
      </div>

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}

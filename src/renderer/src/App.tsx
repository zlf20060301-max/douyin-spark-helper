import { useEffect, useMemo, useRef, useState } from 'react'

type Friend = {
  id: string
  name: string
  streakText: string
  streakDays: number | null
  isGroup: boolean
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

const TABS = [
  { id: 'overview', label: '概览' },
  { id: 'friends', label: '好友' },
  { id: 'history', label: '记录' },
  { id: 'settings', label: '设置' }
]

function fmt(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('zh-CN', { hour12: false })
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
  const sec = s % 60
  if (h > 0) return h + ' 小时 ' + m + ' 分后'
  if (m > 0) return m + ' 分 ' + sec + ' 秒后'
  return sec + ' 秒后'
}

function loginBadge(login: Snapshot['login']): { cls: string; text: string } {
  const s = login.status
  if (s === 'logged_in') return { cls: 'badge ok', text: '已登录' + (login.nickname ? ' · ' + login.nickname : '') }
  if (s === 'expired') return { cls: 'badge err', text: '登录态已失效' }
  if (s === 'logged_out') return { cls: 'badge warn', text: '未登录' }
  if (s === 'working') return { cls: 'badge warn', text: '等待扫码…' }
  return { cls: 'badge dim', text: '登录态未知' }
}

export default function App(): JSX.Element {
  const [state, setState] = useState<Snapshot | null>(null)
  const [tab, setTab] = useState('overview')
  const [keyword, setKeyword] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState('')
  const [draft, setDraft] = useState<Settings | null>(null)
  const [, setTick] = useState(0)
  const dirty = useRef(false)

  useEffect(() => {
    void api.snapshot().then((s) => setState(s as Snapshot))
    const off = api.onUpdate
      ? (api.onUpdate as unknown as (cb: (s: unknown) => void) => () => void)((s) => setState(s as Snapshot))
      : undefined
    return () => {
      if (off) off()
    }
  }, [])

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (state && !dirty.current) setDraft(JSON.parse(JSON.stringify(state.settings)))
  }, [state])

  const flash = (msg: string): void => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 3600)
  }

  const call = async (name: string, payload?: unknown, okMsg?: string): Promise<void> => {
    setBusy(name)
    try {
      const next = await api[name](payload)
      if (next) setState(next as Snapshot)
      if (okMsg) flash(okMsg)
    } catch (e) {
      flash('操作失败：' + String(e).replace(/^Error:\s*/, '').slice(0, 200))
    } finally {
      setBusy('')
    }
  }

  const friends = state ? state.friends : []
  const history = state ? state.history : []
  const settings = state ? state.settings : null

  const stats = useMemo(() => {
    const tk = todayKey()
    const today = history.filter((h) => dayKey(h.at) === tk)
    const okToday = today.filter((h) => h.ok).length
    const selected = friends.filter((f) => f.selected && !f.isGroup)
    const withStreak = friends.filter((f) => !f.isGroup && f.streakDays)
    const total = okToday + today.filter((h) => !h.ok).length
    return {
      okToday,
      failToday: today.filter((h) => !h.ok).length,
      selected: selected.length,
      streakCount: withStreak.length,
      rate: total ? Math.round((okToday / total) * 100) : 0
    }
  }, [history, friends])

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase()
    const list = k ? friends.filter((f) => f.name.toLowerCase().indexOf(k) >= 0) : friends
    return list.slice().sort((a, b) => (b.streakDays || 0) - (a.streakDays || 0))
  }, [friends, keyword])

  if (!state || !draft) {
    return <div className="empty">正在加载…</div>
  }

  const lb = loginBadge(state.login)
  const running = state.status.running

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
    await call('setSettings', draft, '设置已保存')
  }

  const testAi = async (): Promise<void> => {
    setBusy('ai')
    try {
      const r = (await api.testAi()) as { text: string }
      flash('AI 生成示例：' + r.text)
    } catch (e) {
      flash('AI 测试失败：' + String(e).slice(0, 200))
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          抖音<span>续火花</span>助手
        </div>
        <span className={lb.cls}>{lb.text}</span>
        {settings && settings.enabled ? <span className="badge ok">定时已开启</span> : <span className="badge dim">定时未开启</span>}
        <span className="badge dim">下次：{countdown(state.status.nextRunAt)}</span>
        <div className="grow" />
        {running ? <span className="badge warn">正在执行…</span> : null}
        <button className="small ghost" disabled={busy === 'login'} onClick={() => call('startLogin', undefined, '已打开登录窗口，请扫码')}>
          扫码登录
        </button>
        <button className="small ghost" disabled={busy === 'checkLogin'} onClick={() => call('checkLogin', undefined, '登录态已刷新')}>
          检查登录
        </button>
        <button className="small" disabled={running || busy === 'runNow'} onClick={() => call('runNow', { dryRun: true }, '试运行已开始')}>
          试运行
        </button>
        <button className="small primary" disabled={running || busy === 'runNow'} onClick={() => call('runNow', { dryRun: false }, '已开始续火花')}>
          立即续火
        </button>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="content">
        {tab === 'overview' ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <div className="grid">
              <div className="card">
                <div className="label">今日成功</div>
                <div className="value" style={{ color: 'var(--ok)' }}>{stats.okToday}</div>
                <div className="sub">失败 {stats.failToday} 人</div>
              </div>
              <div className="card">
                <div className="label">今日成功率</div>
                <div className="value">{stats.rate}%</div>
                <div className="sub">共 {stats.okToday + stats.failToday} 次尝试</div>
              </div>
              <div className="card">
                <div className="label">已勾选好友</div>
                <div className="value">{stats.selected}</div>
                <div className="sub">好友总数 {friends.filter((f) => !f.isGroup).length}</div>
              </div>
              <div className="card">
                <div className="label">有火花的好友</div>
                <div className="value streak">{stats.streakCount}</div>
                <div className="sub">按火花天数自动识别</div>
              </div>
              <div className="card">
                <div className="label">上次执行</div>
                <div className="value" style={{ fontSize: 15 }}>{fmt(state.status.lastRunAt)}</div>
                <div className="sub">{state.status.lastSummary || '尚未执行'}</div>
              </div>
            </div>

            {state.login.status !== 'logged_in' ? (
              <div className="section">
                <h3>需要登录</h3>
                <p className="hint">
                  {state.login.message || '请点击右上角「扫码登录」，在弹出的浏览器窗口里用手机抖音扫码。登录态会保存在本机，之后无需重复登录。'}
                </p>
              </div>
            ) : null}

            <div className="section">
              <h3>运行日志</h3>
              <div className="logs">
                {state.logs.length === 0 ? (
                  <div className="muted">暂无日志</div>
                ) : (
                  state.logs
                    .slice()
                    .reverse()
                    .map((l, i) => (
                      <div key={i} className={l.level}>
                        [{new Date(l.at).toLocaleTimeString('zh-CN', { hour12: false })}] {l.text}
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        ) : null}

        {tab === 'friends' ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="row">
              <input
                placeholder="搜索好友备注名…"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                style={{ width: 240 }}
              />
              <button onClick={() => call('refreshFriends', undefined, '好友列表已刷新')} disabled={busy === 'refreshFriends'}>
                {busy === 'refreshFriends' ? '读取中…' : '刷新好友列表'}
              </button>
              <div className="grow" />
              <button className="small" onClick={() => call('selectAll', { selected: true, onlyWithStreak: true }, '已选中所有有火花的好友')}>
                选中有火的
              </button>
              <button className="small" onClick={() => call('selectAll', { selected: true, onlyWithStreak: false }, '已全选')}>
                全选
              </button>
              <button className="small" onClick={() => call('selectAll', { selected: false, onlyWithStreak: false }, '已全部取消')}>
                全不选
              </button>
            </div>
            <div className="hint">
              勾选要自动续火花的好友。带 🔥 的是当前有火花的好友，数字为连续天数；群聊会被自动排除。
            </div>
            <div className="scroll">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>选</th>
                    <th>好友</th>
                    <th style={{ width: 130 }}>火花</th>
                    <th style={{ width: 170 }}>上次发送</th>
                    <th style={{ width: 110 }}>上次结果</th>
                    <th>上次文案</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty">
                          {friends.length === 0 ? '还没有好友数据，先登录后点「刷新好友列表」' : '没有匹配的好友'}
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
                            disabled={f.isGroup}
                            onChange={(e) => call('patchFriend', { id: f.id, patch: { selected: e.target.checked } })}
                          />
                        </td>
                        <td>
                          {f.name}
                          {f.isGroup ? <span className="badge dim" style={{ marginLeft: 8 }}>群聊</span> : null}
                        </td>
                        <td>{f.streakDays ? <span className="streak">🔥 {f.streakDays} 天</span> : f.streakText ? <span className="muted">{f.streakText}</span> : <span className="muted">—</span>}</td>
                        <td className="muted">{fmt(f.lastSentAt)}</td>
                        <td>
                          {f.lastOk === null ? (
                            <span className="muted">—</span>
                          ) : f.lastOk ? (
                            <span className="badge ok">成功</span>
                          ) : (
                            <span className="badge err">失败</span>
                          )}
                        </td>
                        <td className="muted" title={f.lastError || ''}>
                          {f.lastError ? f.lastError : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tab === 'history' ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="row">
              <strong>发送记录</strong>
              <span className="hint">共 {history.length} 条</span>
              <div className="grow" />
              <button className="small" onClick={() => call('clearHistory', undefined, '记录已清空')}>
                清空记录
              </button>
            </div>
            <div className="scroll">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 180 }}>时间</th>
                    <th style={{ width: 160 }}>好友</th>
                    <th style={{ width: 90 }}>结果</th>
                    <th>内容 / 错误</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <div className="empty">还没有发送记录</div>
                      </td>
                    </tr>
                  ) : (
                    history.map((h, i) => (
                      <tr key={i}>
                        <td className="muted">{fmt(h.at)}</td>
                        <td>{h.name}</td>
                        <td>{h.ok ? <span className="badge ok">成功</span> : <span className="badge err">失败</span>}</td>
                        <td>{h.ok ? h.message : h.error}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tab === 'settings' ? (
          <div className="form">
            <div className="section">
              <h3>定时与节奏</h3>
              <div className="field">
                <label>定时执行（启用后到点自动续火花）</label>
                <label className="row" style={{ gap: 8 }}>
                  <input type="checkbox" checked={draft.enabled} onChange={(e) => patchDraft({ enabled: e.target.checked })} />
                  <span>开启定时任务</span>
                </label>
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                <div className="field" style={{ flex: 1, minWidth: 260 }}>
                  <label>执行时间（24 小时制，逗号分隔）</label>
                  <input
                    value={draft.scheduleTimes.join(', ')}
                    onChange={(e) => patchDraft({ scheduleTimes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                    placeholder="09:05, 21:05"
                  />
                </div>
                <div className="field" style={{ width: 160 }}>
                  <label>随机浮动（分钟）</label>
                  <input
                    type="number"
                    value={draft.jitterMinutes}
                    onChange={(e) => patchDraft({ jitterMinutes: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                <div className="field" style={{ width: 170 }}>
                  <label>好友间隔最小（秒）</label>
                  <input
                    type="number"
                    value={draft.minIntervalSec}
                    onChange={(e) => patchDraft({ minIntervalSec: Number(e.target.value) })}
                  />
                </div>
                <div className="field" style={{ width: 170 }}>
                  <label>好友间隔最大（秒）</label>
                  <input
                    type="number"
                    value={draft.maxIntervalSec}
                    onChange={(e) => patchDraft({ maxIntervalSec: Number(e.target.value) })}
                  />
                </div>
                <div className="field" style={{ width: 170 }}>
                  <label>单轮最多发送（人）</label>
                  <input
                    type="number"
                    value={draft.maxPerRun}
                    onChange={(e) => patchDraft({ maxPerRun: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                <label className="row" style={{ gap: 8 }}>
                  <input type="checkbox" checked={draft.headless} onChange={(e) => patchDraft({ headless: e.target.checked })} />
                  <span>无头模式（后台静默运行，不显示浏览器窗口）</span>
                </label>
              </div>
            </div>

            <div className="section">
              <h3>失败补发</h3>
              <label className="row" style={{ gap: 8 }}>
                <input type="checkbox" checked={draft.retryEnabled} onChange={(e) => patchDraft({ retryEnabled: e.target.checked })} />
                <span>本轮有失败时，自动补发一次</span>
              </label>
              <div className="field" style={{ width: 200, marginTop: 10 }}>
                <label>补发延迟（分钟）</label>
                <input
                  type="number"
                  value={draft.retryDelayMin}
                  onChange={(e) => patchDraft({ retryDelayMin: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="section">
              <h3>本地文案库（每行一条，随机挑选）</h3>
              <textarea
                rows={6}
                value={draft.templates.join('\n')}
                onChange={(e) => patchDraft({ templates: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
              />
            </div>

            <div className="section">
              <h3>AI 自动生成消息</h3>
              <label className="row" style={{ gap: 8 }}>
                <input type="checkbox" checked={draft.ai.enabled} onChange={(e) => patchAi({ enabled: e.target.checked })} />
                <span>用大模型为每个好友生成不重复的问候语（失败时自动回退到本地文案库）</span>
              </label>
              <div className="row" style={{ marginTop: 12 }}>
                <div className="field" style={{ flex: 2, minWidth: 280 }}>
                  <label>接口地址（OpenAI 兼容）</label>
                  <input value={draft.ai.baseUrl} onChange={(e) => patchAi({ baseUrl: e.target.value })} placeholder="https://api.deepseek.com/v1" />
                </div>
                <div className="field" style={{ flex: 1, minWidth: 180 }}>
                  <label>模型</label>
                  <input value={draft.ai.model} onChange={(e) => patchAi({ model: e.target.value })} placeholder="deepseek-chat" />
                </div>
              </div>
              <div className="field" style={{ marginTop: 12 }}>
                <label>API Key（仅保存在本机）</label>
                <input type="password" value={draft.ai.apiKey} onChange={(e) => patchAi({ apiKey: e.target.value })} placeholder="sk-..." />
              </div>
              <div className="field" style={{ marginTop: 12 }}>
                <label>提示词</label>
                <textarea rows={3} value={draft.ai.prompt} onChange={(e) => patchAi({ prompt: e.target.value })} />
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                <button onClick={testAi} disabled={busy === 'ai'}>
                  {busy === 'ai' ? '测试中…' : '测试生成'}
                </button>
              </div>
            </div>

            <div className="section">
              <h3>高级</h3>
              <div className="field">
                <label>Chrome 可执行文件路径（留空则自动使用系统 Chrome）</label>
                <input value={draft.chromePath} onChange={(e) => patchDraft({ chromePath: e.target.value })} placeholder="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" />
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                <button className="small" onClick={() => call('openDataDir')}>
                  打开数据目录
                </button>
                <button className="small" onClick={() => call('logout', undefined, '已退出登录并清除本机登录态')}>
                  退出登录（清除本机登录态）
                </button>
                <button className="small" onClick={() => call('clearLogs')}>
                  清空日志
                </button>
              </div>
            </div>

            <div className="row">
              <button className="primary" onClick={saveSettings}>
                保存设置
              </button>
              <span className="hint">设置修改后需要点击保存才会生效。</span>
            </div>
          </div>
        ) : null}
      </div>

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}

import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { Store } from './store'
import { logbus } from './logbus'
import { engine } from './automation/douyin'
import { generateMessage, callAi } from './ai'
import { Scheduler } from './scheduler'
import type { Friend, LoginState, RuntimeStatus, SendRecord, Settings } from '../shared/types'

let win: BrowserWindow | null = null
let store: Store
let scheduler: Scheduler
let running = false
let lastRunAt: string | null = null
let lastSummary: string | null = null
let retryTimer: ReturnType<typeof setTimeout> | null = null

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function status(): RuntimeStatus {
  return {
    session: engine.isOpen ? 'ready' : 'idle',
    running,
    lastRunAt,
    nextRunAt: scheduler && scheduler.nextRunAt ? new Date(scheduler.nextRunAt).toISOString() : null,
    lastSummary
  }
}

function snapshot(): Record<string, unknown> {
  return {
    settings: store.settings,
    friends: store.friends,
    history: store.history,
    login: store.login,
    status: status(),
    logs: logbus.lines.slice(-200)
  }
}

function push(): void {
  if (win && !win.isDestroyed()) win.webContents.send('state:update', snapshot())
}

async function runAll(reason: string, opts: { dryRun?: boolean } = {}): Promise<void> {
  if (running) {
    logbus.warn('已有任务正在执行，忽略本次触发')
    return
  }
  const settings = store.settings
  const dryRun = opts.dryRun === true
  const now0 = new Date()
  const todayK = now0.getFullYear() + '-' + (now0.getMonth() + 1) + '-' + now0.getDate()
  const sameDay = (iso: string | null): boolean => {
    if (!iso) return false
    const d = new Date(iso)
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate() === todayK
  }
  const picked = store.friends.filter((f) => f.selected && !f.isGroup)
  const ordered = picked.slice().sort((a, b) => {
    const av = a.lastOk === true && sameDay(a.lastSentAt) ? 1 : 0
    const bv = b.lastOk === true && sameDay(b.lastSentAt) ? 1 : 0
    return av - bv
  })
  const targets = settings.maxPerRun > 0 ? ordered.slice(0, settings.maxPerRun) : ordered
  if (targets.length === 0) {
    logbus.warn('没有勾选任何好友，任务结束')
    return
  }
  running = true
  push()
  logbus.info('开始执行：' + reason + '（目标 ' + targets.length + ' 人' + (dryRun ? '，试运行' : '') + '）')
  let ok = 0
  let fail = 0
  const failures: Friend[] = []
  try {
    const prep = await engine.prepare(settings)
    if (!prep.login.ok) {
      store.setLogin({ status: prep.login.status === 'logged_in' ? 'logged_in' : prep.login.status, message: prep.login.reason, checkedAt: new Date().toISOString() })
      logbus.error('登录态不可用：' + prep.login.reason)
      lastSummary = '中止：' + prep.login.reason
      push()
      return
    }
    store.setLogin({ status: 'logged_in', nickname: prep.login.nickname, message: 'ok', checkedAt: new Date().toISOString() })

    for (const friend of targets) {
      const message = await generateMessage(settings, friend.name)
      const res = await engine.sendTo(friend.name, message, dryRun)
      const at = new Date().toISOString()
      const rec: SendRecord = { at, name: friend.name, ok: res.ok, message, error: res.error }
      store.addHistory(rec)
      store.patchFriend(friend.id, { lastSentAt: at, lastOk: res.ok, lastError: res.error })
      if (res.ok) {
        ok++
        logbus.info('✅ ' + friend.name + ' ← ' + message)
      } else {
        fail++
        failures.push(friend)
        logbus.error('❌ ' + friend.name + '：' + res.error)
        if (res.error && res.error.indexOf('风控') >= 0) {
          logbus.error('命中风控，提前结束本轮')
          break
        }
      }
      const gap = Math.floor(settings.minIntervalSec + Math.random() * Math.max(1, settings.maxIntervalSec - settings.minIntervalSec))
      await sleep(gap * 1000)
    }
  } catch (e) {
    logbus.error('执行异常：' + String(e))
    lastSummary = '异常：' + String(e).slice(0, 120)
  } finally {
    running = false
    lastRunAt = new Date().toISOString()
    if (!lastSummary || lastSummary.indexOf('异常') !== 0) {
      lastSummary = '成功 ' + ok + ' 人，失败 ' + fail + ' 人'
    }
    logbus.info('本轮结束：' + lastSummary)
    push()
    const s = store.settings
    if (!dryRun && s.retryEnabled && failures.length > 0) {
      if (retryTimer) clearTimeout(retryTimer)
      const delay = Math.max(1, s.retryDelayMin) * 60 * 1000
      retryTimer = setTimeout(() => {
        void runAll('失败补发（' + failures.length + ' 人）')
      }, delay)
      logbus.info('已安排 ' + s.retryDelayMin + ' 分钟后对失败好友补发一次')
    }
  }
}

function startLoginFlow(): void {
  void (async () => {
    store.setLogin({ status: 'working', message: '正在打开登录窗口，请用抖音 App 扫码…' })
    push()
    try {
      await engine.close()
      const page = await engine.ensure(false, store.settings.chromePath)
      await engine.gotoChatUrl(page)
      logbus.info('请在弹出的浏览器窗口中用手机抖音扫码登录')
      for (let i = 0; i < 180; i++) {
        await sleep(2000)
        const login = await engine.checkLogin(page)
        if (login.ok) {
          store.setLogin({ status: 'logged_in', nickname: login.nickname, userId: null, checkedAt: new Date().toISOString(), message: '登录成功' })
          logbus.info('登录成功，登录态已保存到本地浏览器配置目录')
          push()
          await sleep(1500)
          await engine.close()
          return
        }
      }
      store.setLogin({ status: 'logged_out', message: '等待扫码超时，请重试', checkedAt: new Date().toISOString() })
      logbus.warn('等待扫码超时')
      push()
    } catch (e) {
      store.setLogin({ status: 'unknown', message: '打开浏览器失败：' + String(e).slice(0, 120), checkedAt: new Date().toISOString() })
      logbus.error('打开登录窗口失败：' + String(e))
      push()
    }
  })()
}

function registerIpc(): void {
  ipcMain.handle('app:snapshot', () => snapshot())

  ipcMain.handle('settings:set', (_e, patch: Partial<Settings>) => {
    const next = store.updateSettings(patch)
    logbus.info('设置已更新')
    if (next.enabled) scheduler.start()
    else scheduler.stop()
    push()
    return snapshot()
  })

  ipcMain.handle('friends:refresh', async () => {
    push()
    const prep = await engine.prepare(store.settings)
    if (!prep.login.ok) {
      store.setLogin({ status: prep.login.status, message: prep.login.reason, checkedAt: new Date().toISOString() })
      push()
      throw new Error(prep.login.reason)
    }
    store.setLogin({ status: 'logged_in', nickname: prep.login.nickname, message: 'ok', checkedAt: new Date().toISOString() })
    const list = await engine.collectFriends()
    store.setFriends(list)
    push()
    return snapshot()
  })

  ipcMain.handle('friends:patch', (_e, payload: { id: string; patch: Partial<Friend> }) => {
    store.patchFriend(payload.id, payload.patch)
    push()
    return snapshot()
  })

  ipcMain.handle('friends:selectAll', (_e, payload: { selected: boolean; onlyWithStreak: boolean }) => {
    for (const f of store.friends) {
      if (payload.onlyWithStreak && (f.isGroup || !f.streakDays)) {
        f.selected = false
        continue
      }
      f.selected = payload.selected
    }
    store.save()
    push()
    return snapshot()
  })

  ipcMain.handle('login:start', () => {
    startLoginFlow()
    return snapshot()
  })

  ipcMain.handle('login:check', async () => {
    const prep = await engine.prepare(store.settings)
    store.setLogin({
      status: prep.login.status,
      nickname: prep.login.nickname,
      message: prep.login.reason,
      checkedAt: new Date().toISOString()
    })
    push()
    return snapshot()
  })

  ipcMain.handle('login:logout', async () => {
    await engine.close()
    try {
      fs.rmSync(engine.profileDir, { recursive: true, force: true })
      fs.mkdirSync(engine.profileDir, { recursive: true })
      logbus.info('已清除本机登录态')
    } catch (e) {
      logbus.warn('清除登录态失败：' + String(e))
    }
    store.setLogin({ status: 'logged_out', nickname: null, userId: null, message: '已退出登录', checkedAt: new Date().toISOString() })
    push()
    return snapshot()
  })

  ipcMain.handle('run:now', async (_e, payload: { dryRun?: boolean } = {}) => {
    void runAll(payload && payload.dryRun ? '手动试运行' : '手动执行', { dryRun: !!(payload && payload.dryRun) })
    return snapshot()
  })

  ipcMain.handle('history:clear', () => {
    store.clearHistory()
    push()
    return snapshot()
  })

  ipcMain.handle('ai:test', async () => {
    const text = await callAi(store.settings, '测试好友')
    return { ok: true, text }
  })

  ipcMain.handle('shell:dataDir', () => {
    shell.openPath(path.join(app.getPath('userData'), 'data'))
    return true
  })

  ipcMain.handle('logs:clear', () => {
    logbus.lines.length = 0
    push()
    return true
  })

  logbus.subscribe(() => push())
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 1000,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    title: '抖音续火花助手',
    backgroundColor: '#0f1115',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  win.on('ready-to-show', () => win && win.show())
  win.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: 'deny' }
  })
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) win.loadURL(devUrl)
  else win.loadFile(path.join(__dirname, '../renderer/index.html'))
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  void app.whenReady().then(() => {
    store = new Store()
    logbus.attachFile()
    logbus.info('抖音续火花助手已启动')
    scheduler = new Scheduler(() => store.settings, (reason) => runAll(reason))
    if (store.settings.enabled) scheduler.start()
    registerIpc()
    createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', () => {
    void engine.close()
  })
}

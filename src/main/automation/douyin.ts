import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { chromium, type BrowserContext, type Page } from 'playwright-core'
import {
  CHAT_URL, SEL, EDITOR_CANDIDATES, RATE_LIMIT_KEYWORDS, LOGIN_TEXTS,
  JS_LOGIN_DOM, JS_LIST_READY, JS_COLLECT, JS_SCROLL_PROBE, JS_SCROLL_TO,
  JS_CLICK_BY_NAME, JS_CURRENT_CONV, JS_EDITOR_EMPTY, JS_EDITOR_CLEAR,
  JS_MSG_STATE, JS_SCREEN_TEXT, parseStreakDays, isGroupTitle
} from './selectors'
import { logbus } from '../logbus'
import type { Friend, Settings } from '../../shared/types'

export interface LoginCheck {
  ok: boolean
  status: 'logged_in' | 'logged_out' | 'expired' | 'unknown'
  reason: string
  nickname: string | null
}

export interface SendResult {
  ok: boolean
  error: string | null
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a)
}

export class DouyinEngine {
  private ctx: BrowserContext | null = null
  private page: Page | null = null
  private launching: Promise<unknown> | null = null
  readonly profileDir: string
  readonly screenshotDir: string

  constructor() {
    const base = path.join(app.getPath('userData'), 'data')
    this.profileDir = path.join(base, 'chrome-profile')
    this.screenshotDir = path.join(base, 'screenshots')
    fs.mkdirSync(this.profileDir, { recursive: true })
    fs.mkdirSync(this.screenshotDir, { recursive: true })
  }

  get isOpen(): boolean {
    return !!this.ctx
  }

  async ensure(headless: boolean, chromePath: string): Promise<Page> {
    if (this.ctx && this.page && !this.page.isClosed()) return this.page
    if (this.launching) {
      await this.launching
      if (this.ctx && this.page && !this.page.isClosed()) return this.page
    }
    this.launching = (async () => {
      const opts: Record<string, unknown> = {
        headless,
        viewport: { width: 1366, height: 860 },
        locale: 'zh-CN',
        timezoneId: 'Asia/Shanghai',
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-first-run',
          '--no-default-browser-check'
        ]
      }
      if (chromePath && fs.existsSync(chromePath)) opts.executablePath = chromePath
      else opts.channel = 'chrome'
      logbus.info('正在启动浏览器…')
      this.ctx = await chromium.launchPersistentContext(this.profileDir, opts as never)
      await this.ctx.addInitScript(() => {
        try {
          Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
        } catch (e) {
          void e
        }
      })
      const pages = this.ctx.pages()
      this.page = pages.length ? pages[0] : await this.ctx.newPage()
      this.page.setDefaultTimeout(30000)
      logbus.info('浏览器已启动（' + (headless ? '无头' : '有头') + '模式）')
    })()
    try {
      await this.launching
    } finally {
      this.launching = null
    }
    return this.page as Page
  }

  async close(): Promise<void> {
    const ctx = this.ctx
    this.ctx = null
    this.page = null
    if (ctx) {
      try {
        await ctx.close()
      } catch (e) {
        void e
      }
      logbus.info('浏览器已关闭')
    }
  }

  async prepare(settings: Settings, forceHeaded = false): Promise<{ page: Page; login: LoginCheck }> {
    const headless = forceHeaded ? false : settings.headless
    const page = await this.ensure(headless, settings.chromePath)
    await this.gotoChat(page)
    const login = await this.checkLogin(page)
    return { page, login }
  }

  async gotoChatUrl(page: Page): Promise<void> {
    return this.gotoChat(page)
  }

  private async gotoChat(page: Page): Promise<void> {
    if (page.url().indexOf('douyin.com/chat') >= 0) return
    let lastErr: unknown = null
    for (let i = 0; i < 3; i++) {
      try {
        await page.goto(CHAT_URL, { timeout: 90000, waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(2500)
        return
      } catch (e) {
        lastErr = e
        logbus.warn('打开私信页失败，第 ' + (i + 1) + ' 次重试')
        await sleep(4000)
      }
    }
    throw new Error('无法打开抖音私信页面：' + String(lastErr))
  }

  async checkLogin(page: Page): Promise<LoginCheck> {
    let dom: Record<string, unknown> = {}
    try {
      dom = (await page.evaluate(JS_LOGIN_DOM)) as Record<string, unknown>
    } catch (e) {
      void e
    }
    if (/login|passport/i.test(page.url())) {
      return { ok: false, status: 'logged_out', reason: '页面已跳转到登录页', nickname: null }
    }
    let cookies: Array<{ name: string }> = []
    try {
      cookies = await page.context().cookies()
    } catch (e) {
      void e
    }
    const hasSession = cookies.some((c) => c.name.indexOf('sessionid') === 0)
    if (dom.loginVisible || dom.qrcode) {
      return {
        ok: false,
        status: hasSession ? 'expired' : 'logged_out',
        reason: hasSession ? '登录态已失效，需要重新扫码' : '尚未登录，请扫码登录',
        nickname: null
      }
    }
    if (!hasSession) {
      return { ok: false, status: 'logged_out', reason: '未检测到 sessionid Cookie', nickname: null }
    }
    if (!dom.hasChatRoot && !dom.avatarCard) {
      return { ok: false, status: 'unknown', reason: '聊天界面尚未就绪', nickname: (dom.nickname as string) || null }
    }
    return { ok: true, status: 'logged_in', reason: 'ok', nickname: (dom.nickname as string) || null }
  }

  async screenText(page: Page): Promise<string> {
    try {
      return (await page.evaluate(JS_SCREEN_TEXT)) as string
    } catch (e) {
      return ''
    }
  }

  async detectRateLimit(page: Page): Promise<string | null> {
    const text = await this.screenText(page)
    for (const kw of RATE_LIMIT_KEYWORDS) {
      if (text.indexOf(kw) >= 0) return kw
    }
    for (const t of LOGIN_TEXTS) {
      if (text.indexOf(t) >= 0) return t
    }
    return null
  }

  async screenshot(page: Page, tag: string): Promise<string | null> {
    try {
      const name = new Date().toISOString().replace(/[:.]/g, '-') + '-' + tag + '.png'
      const p = path.join(this.screenshotDir, name)
      await page.screenshot({ path: p, timeout: 8000 })
      return p
    } catch (e) {
      return null
    }
  }

  private async waitListReady(page: Page, timeoutMs: number): Promise<boolean> {
    const t0 = Date.now()
    let last: { count: number; at: number } | null = null
    while (Date.now() - t0 < timeoutMs) {
      let dom: Record<string, unknown> = {}
      try {
        dom = (await page.evaluate(JS_LIST_READY)) as Record<string, unknown>
      } catch (e) {
        void e
      }
      if (dom.ready) {
        const now = Date.now()
        const count = Number(dom.count) || 0
        if (last && last.count === count && now - last.at >= 1200) return true
        if (!last || last.count !== count) last = { count, at: now }
      }
      await sleep(300)
    }
    return false
  }

  private async scrollTop(page: Page): Promise<void> {
    try {
      await page.evaluate(JS_SCROLL_TO, 0)
      await page.waitForTimeout(400)
    } catch (e) {
      void e
    }
  }

  async collectFriends(): Promise<Friend[]> {
    const page = this.page as Page
    await this.waitListReady(page, 45000)
    await this.scrollTop(page)

    const seen = new Map<string, Friend>()
    let stable = 0

    for (let step = 0; step < 150; step++) {
      let items: Array<Record<string, unknown>> = []
      try {
        items = (await page.evaluate(JS_COLLECT)) as Array<Record<string, unknown>>
      } catch (e) {
        void e
      }
      let added = 0
      for (const it of items) {
        const name = String(it.name || '').trim()
        if (!name) continue
        const id = String(it.convId || it.uid || ('name:' + name))
        if (seen.has(id)) continue
        const streakText = (it.streakText as string) || ''
        const participantCount = it.participantCount == null ? null : Number(it.participantCount)
        seen.set(id, {
          id,
          name,
          streakText,
          streakDays: parseStreakDays(streakText),
          isGroup: isGroupTitle(name, participantCount),
          selected: false,
          lastSentAt: null,
          lastOk: null,
          lastError: null
        })
        added++
      }
      stable = added === 0 ? stable + 1 : 0

      let probe: Record<string, unknown> = {}
      try {
        probe = (await page.evaluate(JS_SCROLL_PROBE)) as Record<string, unknown>
      } catch (e) {
        void e
      }
      if (!probe.found) break
      if (probe.atBottom) {
        if (stable >= 2) break
        await page.waitForTimeout(700)
        continue
      }
      if (stable >= 4) break
      const nextTop = Number(probe.scrollTop) + Math.floor(Number(probe.clientHeight) * 0.85)
      try {
        await page.evaluate(JS_SCROLL_TO, nextTop)
      } catch (e) {
        void e
      }
      await page.waitForTimeout(550)
    }

    const list = [...seen.values()].sort((a, b) => (b.streakDays || 0) - (a.streakDays || 0))
    logbus.info('已读取会话 ' + list.length + ' 个（含群聊 ' + list.filter((f) => f.isGroup).length + ' 个）')
    return list
  }

  private async locateAndClick(page: Page, name: string): Promise<number | null> {
    await this.scrollTop(page)
    for (let step = 0; step < 200; step++) {
      let hit: { x: number; y: number } | null = null
      try {
        hit = (await page.evaluate(JS_CLICK_BY_NAME, name)) as { x: number; y: number } | null
      } catch (e) {
        void e
      }
      if (hit) {
        await page.mouse.click(hit.x, hit.y)
        return step
      }
      let probe: Record<string, unknown> = {}
      try {
        probe = (await page.evaluate(JS_SCROLL_PROBE)) as Record<string, unknown>
      } catch (e) {
        void e
      }
      if (!probe.found || probe.atBottom) return null
      const nextTop = Number(probe.scrollTop) + Math.floor(Number(probe.clientHeight) * 0.8)
      try {
        await page.evaluate(JS_SCROLL_TO, nextTop)
      } catch (e) {
        void e
      }
      await page.waitForTimeout(400)
    }
    return null
  }

  private async verifyInConversation(page: Page, name: string): Promise<boolean> {
    try {
      const cur = (await page.evaluate(JS_CURRENT_CONV)) as { title: string | null } | null
      if (!cur || !cur.title) return false
      const norm = (s: string): string => s.split(String.fromCharCode(160)).join(' ').replace(/s+/g, ' ').trim()
      return norm(cur.title) === norm(name)
    } catch (e) {
      return false
    }
  }

  private async clearEditor(page: Page): Promise<void> {
    try {
      await page.evaluate(JS_EDITOR_CLEAR)
    } catch (e) {
      void e
    }
  }

  private async editorEmpty(page: Page): Promise<boolean | null> {
    try {
      return (await page.evaluate(JS_EDITOR_EMPTY)) as boolean | null
    } catch (e) {
      return null
    }
  }

  private async findEditor(page: Page): Promise<boolean> {
    for (const sel of EDITOR_CANDIDATES) {
      try {
        const loc = page.locator(sel).first()
        if ((await loc.count()) > 0 && (await loc.isVisible())) return true
      } catch (e) {
        continue
      }
    }
    return false
  }

  private async typeMessage(page: Page, text: string): Promise<boolean> {
    try {
      const loc = page.locator(EDITOR_CANDIDATES[0]).first()
      const target = (await loc.count()) > 0 ? loc : page.locator(EDITOR_CANDIDATES[1]).first()
      await target.click()
      await page.waitForTimeout(300)
      await this.clearEditor(page)
      await page.waitForTimeout(200)
      await page.keyboard.type(text, { delay: Math.floor(rand(60, 140)) })
      await page.waitForTimeout(600)
      const empty = await this.editorEmpty(page)
      if (empty === true) {
        logbus.warn('文字未进入输入框')
        return false
      }
      await page.keyboard.press('Enter')
      return true
    } catch (e) {
      logbus.warn('输入异常：' + String(e).slice(0, 120))
      return false
    }
  }

  private async waitCleared(page: Page, waitMs: number): Promise<boolean> {
    const t0 = Date.now()
    while (Date.now() - t0 < waitMs) {
      await sleep(800)
      const empty = await this.editorEmpty(page)
      if (empty === true) return true
    }
    return false
  }

  async sendTo(name: string, message: string, dryRun: boolean): Promise<SendResult> {
    const page = this.page
    if (!page) return { ok: false, error: '浏览器未启动' }
    try {
      await page.bringToFront()
    } catch (e) {
      void e
    }

    const limited = await this.detectRateLimit(page)
    if (limited) {
      await this.screenshot(page, 'rate-limit')
      return { ok: false, error: '检测到风控提示「' + limited + '」，本轮停止' }
    }

    let switched = false
    for (let attempt = 0; attempt < 3 && !switched; attempt++) {
      await this.locateAndClick(page, name)
      await page.waitForTimeout(Math.floor(rand(1600, 3200)))
      switched = await this.verifyInConversation(page, name)
      if (!switched) await page.waitForTimeout(900)
    }
    if (!switched) {
      await this.screenshot(page, 'switch-failed')
      return { ok: false, error: '未能切换到该好友会话（可能已不在列表或页面结构变化）' }
    }

    if (!(await this.findEditor(page))) {
      await this.screenshot(page, 'no-editor')
      return { ok: false, error: '找不到聊天输入框' }
    }

    if (dryRun) return { ok: true, error: null }

    const limited2 = await this.detectRateLimit(page)
    if (limited2) {
      await this.screenshot(page, 'rate-limit')
      return { ok: false, error: '发送前检测到风控提示「' + limited2 + '」' }
    }

    if (!(await this.typeMessage(page, message))) {
      return { ok: false, error: '文字未能输入到输入框' }
    }
    if (await this.waitCleared(page, 9000)) return { ok: true, error: null }

    logbus.warn('未检测到消息发出，重试一次：' + name)
    if (!(await this.typeMessage(page, message))) {
      return { ok: false, error: '重试时文字未能输入' }
    }
    if (await this.waitCleared(page, 9000)) return { ok: true, error: null }

    await this.screenshot(page, 'send-unconfirmed')
    return { ok: false, error: '发送后输入框未清空，消息可能未发出' }
  }
}

export const engine = new DouyinEngine()

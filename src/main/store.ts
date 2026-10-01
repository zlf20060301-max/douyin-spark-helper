import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { AppData, Settings, Friend, SendRecord, LoginState } from '../shared/types'

export const DEFAULT_SETTINGS: Settings = {
  enabled: false,
  scheduleTimes: ['09:05', '21:05'],
  jitterMinutes: 25,
  headless: true,
  minIntervalSec: 8,
  maxIntervalSec: 25,
  maxPerRun: 50,
  retryEnabled: true,
  retryDelayMin: 45,
  templates: [
    '续火花来啦 🔥',
    '今天也要续上～',
    '来打个卡，火花不能断',
    '如约而至 ✨',
    '在吗？续个火花 😄'
  ],
  ai: {
    enabled: false,
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: '',
    model: 'deepseek-chat',
    prompt: '你是我的抖音好友。请用一句自然、口语化、不超过20字的中文短句跟我打招呼或聊一句日常，用来维持聊天火花。不要加引号，不要用markdown。'
  },
  chromePath: ''
}

export const DEFAULT_LOGIN: LoginState = {
  status: 'unknown',
  nickname: null,
  userId: null,
  checkedAt: null,
  message: null
}

export class Store {
  private file: string
  data: AppData

  constructor() {
    const dir = path.join(app.getPath('userData'), 'data')
    fs.mkdirSync(dir, { recursive: true })
    this.file = path.join(dir, 'app-data.json')
    this.data = this.load()
  }

  private load(): AppData {
    const fallback: AppData = {
      settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
      friends: [],
      history: [],
      login: { ...DEFAULT_LOGIN }
    }
    try {
      if (!fs.existsSync(this.file)) return fallback
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'))
      return {
        settings: { ...fallback.settings, ...(raw.settings || {}), ai: { ...fallback.settings.ai, ...((raw.settings || {}).ai || {}) } },
        friends: Array.isArray(raw.friends) ? raw.friends : [],
        history: Array.isArray(raw.history) ? raw.history : [],
        login: { ...fallback.login, ...(raw.login || {}) }
      }
    } catch {
      return fallback
    }
  }

  save(): void {
    const tmp = this.file + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8')
    fs.renameSync(tmp, this.file)
  }

  get settings(): Settings { return this.data.settings }
  get friends(): Friend[] { return this.data.friends }
  get history(): SendRecord[] { return this.data.history }
  get login(): LoginState { return this.data.login }

  updateSettings(patch: Partial<Settings>): Settings {
    this.data.settings = { ...this.data.settings, ...patch, ai: { ...this.data.settings.ai, ...(patch.ai || {}) } }
    this.save()
    return this.data.settings
  }

  setLogin(login: Partial<LoginState>): LoginState {
    this.data.login = { ...this.data.login, ...login }
    this.save()
    return this.data.login
  }

  setFriends(list: Friend[]): Friend[] {
    const prev = new Map(this.data.friends.map(f => [f.id, f]))
    this.data.friends = list.map(f => {
      const old = prev.get(f.id)
      return old ? { ...f, selected: old.selected, lastSentAt: old.lastSentAt, lastOk: old.lastOk, lastError: old.lastError } : f
    })
    this.save()
    return this.data.friends
  }

  patchFriend(id: string, patch: Partial<Friend>): Friend | null {
    const f = this.data.friends.find(x => x.id === id)
    if (!f) return null
    Object.assign(f, patch)
    this.save()
    return f
  }

  addHistory(rec: SendRecord): void {
    this.data.history.unshift(rec)
    if (this.data.history.length > 2000) this.data.history.length = 2000
    this.save()
  }

  clearHistory(): void {
    this.data.history = []
    this.save()
  }
}

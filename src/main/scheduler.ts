import { logbus } from './logbus'
import type { Settings } from '../shared/types'

export type RunFn = (reason: string) => Promise<void>

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + day
}

function seedOffset(dateKey: string, time: string, jitterMin: number): number {
  const span = Math.max(0, jitterMin) * 60 * 1000
  if (span <= 0) return 0
  const s = dateKey + '|' + time
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % span
}

function plannedAt(dateKey: string, time: string, jitterMin: number): number {
  const parts = time.split(':')
  const hh = Number(parts[0]) || 0
  const mm = Number(parts[1]) || 0
  const d = new Date(dateKey + 'T00:00:00')
  d.setHours(hh, mm, 0, 0)
  return d.getTime() + seedOffset(dateKey, time, jitterMin)
}

export class Scheduler {
  private timer: NodeJS.Timeout | null = null
  private fired = new Set<string>()
  private getSettings: () => Settings
  private runFn: RunFn
  private busy = false
  nextRunAt: number | null = null

  constructor(getSettings: () => Settings, runFn: RunFn) {
    this.getSettings = getSettings
    this.runFn = runFn
  }

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => {
      void this.tick()
    }, 20000)
    logbus.info('定时调度已启动')
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.nextRunAt = null
    logbus.info('定时调度已停止')
  }

  private computeNext(now: Date): number | null {
    const s = this.getSettings()
    if (!s.enabled || !s.scheduleTimes.length) return null
    const today = localDateKey(now)
    let best: number | null = null
    for (const t of s.scheduleTimes) {
      const key = today + '|' + t
      let at = plannedAt(today, t, s.jitterMinutes)
      if (this.fired.has(key) || at <= now.getTime()) {
        const tomorrow = new Date(now.getTime() + 86400000)
        const tk = localDateKey(tomorrow)
        at = plannedAt(tk, t, s.jitterMinutes)
      }
      if (best === null || at < best) best = at
    }
    return best
  }

  private async tick(): Promise<void> {
    const now = new Date()
    const s = this.getSettings()
    if (!s.enabled) {
      this.nextRunAt = null
      return
    }
    this.nextRunAt = this.computeNext(now)
    if (this.busy) return
    const today = localDateKey(now)
    for (const t of s.scheduleTimes) {
      const key = today + '|' + t
      if (this.fired.has(key)) continue
      const at = plannedAt(today, t, s.jitterMinutes)
      const late = now.getTime() - at
      if (late >= 0 && late < 6 * 60 * 1000) {
        this.fired.add(key)
        this.busy = true
        logbus.info('到达计划时间 ' + t + '，开始执行续火花')
        try {
          await this.runFn('定时任务 ' + t)
        } finally {
          this.busy = false
        }
        break
      }
    }
  }
}

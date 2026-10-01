import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

export interface LogLine { at: string; level: 'info' | 'warn' | 'error'; text: string }

const MAX = 500
type Sink = (line: LogLine) => void

class LogBus {
  lines: LogLine[] = []
  private sinks = new Set<Sink>()
  private file: string | null = null

  attachFile(): void {
    try {
      const dir = path.join(app.getPath('userData'), 'data', 'logs')
      fs.mkdirSync(dir, { recursive: true })
      this.file = path.join(dir, 'app.log')
    } catch { this.file = null }
  }

  write(level: 'info' | 'warn' | 'error', text: string): void {
    const line: LogLine = { at: new Date().toISOString(), level, text }
    this.lines.push(line)
    if (this.lines.length > MAX) this.lines.splice(0, this.lines.length - MAX)
    for (const s of this.sinks) { try { s(line) } catch {} }
    if (this.file) { try { fs.appendFileSync(this.file, line.at + ' [' + level + '] ' + text + '\n') } catch {} }
  }

  info(t: string): void { this.write('info', t) }
  warn(t: string): void { this.write('warn', t) }
  error(t: string): void { this.write('error', t) }

  subscribe(s: Sink): () => void {
    this.sinks.add(s)
    return () => { this.sinks.delete(s) }
  }
}

export const logbus = new LogBus()

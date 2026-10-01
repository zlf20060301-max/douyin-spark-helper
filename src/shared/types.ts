export interface Friend {
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

export interface SendRecord {
  at: string
  name: string
  ok: boolean
  message: string
  error: string | null
}

export interface AiSettings {
  enabled: boolean
  baseUrl: string
  apiKey: string
  model: string
  prompt: string
}

export interface Settings {
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

export type LoginStatus = 'unknown' | 'logged_in' | 'logged_out' | 'expired' | 'working'

export interface LoginState {
  status: LoginStatus
  nickname: string | null
  userId: string | null
  checkedAt: string | null
  message: string | null
}

export interface RuntimeStatus {
  session: 'idle' | 'launching' | 'ready' | 'error'
  running: boolean
  lastRunAt: string | null
  nextRunAt: string | null
  lastSummary: string | null
}

export interface AppData {
  settings: Settings
  friends: Friend[]
  history: SendRecord[]
  login: LoginState
}

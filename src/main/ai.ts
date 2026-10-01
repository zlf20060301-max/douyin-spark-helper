import type { Settings } from '../shared/types'
import { logbus } from './logbus'

const FALLBACK = ['续火花来啦 🔥', '今天也要续上～', '来打个卡，火花不能断', '如约而至 ✨']

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export async function callAi(settings: Settings, friendName: string): Promise<string> {
  const ai = settings.ai
  if (!ai.apiKey || !ai.baseUrl) throw new Error('未配置 API Key 或接口地址')
  const base = ai.baseUrl.replace(/\/+$/, '')
  const url = base + '/chat/completions'
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 20000)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + ai.apiKey
      },
      body: JSON.stringify({
        model: ai.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: ai.prompt },
          { role: 'user', content: '对方备注名：' + friendName + '。请直接输出这一句话。' }
        ],
        temperature: 1.1,
        max_tokens: 80
      }),
      signal: ctrl.signal
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error('接口返回 ' + res.status + ' ' + body.slice(0, 120))
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const raw = json.choices && json.choices[0] && json.choices[0].message ? json.choices[0].message.content : ''
    const text = String(raw || '')
      .replace(/[\r\n]+/g, ' ')
      .replace(/^["'「『]+|["'」』]+$/g, '')
      .trim()
      .slice(0, 60)
    if (!text) throw new Error('接口未返回可用内容')
    return text
  } finally {
    clearTimeout(timer)
  }
}

export async function generateMessage(settings: Settings, friendName: string): Promise<string> {
  if (settings.ai.enabled && settings.ai.apiKey) {
    try {
      return await callAi(settings, friendName)
    } catch (e) {
      logbus.warn('AI 生成失败，改用本地文案：' + String(e).slice(0, 140))
    }
  }
  const templates = settings.templates && settings.templates.length ? settings.templates : FALLBACK
  return pick(templates)
}

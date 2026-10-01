import type { Settings } from '../shared/types'
import { logbus } from './logbus'

const FALLBACK = ['续火花来啦 🔥', '今天也要续上～', '来打个卡，火花不能断', '如约而至 ✨']

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** 把接口返回的 HTTP 状态码翻译成能指导操作的提示。 */
function explainStatus(status: number, body: string): string {
  const tail = body ? '：' + body.slice(0, 140) : ''
  if (status === 401 || status === 403) return 'API Key 无效或没有权限（HTTP ' + status + '）' + tail
  if (status === 402) return '账户余额不足（HTTP 402）' + tail
  if (status === 404) return '接口地址不对（HTTP 404）：确认 baseUrl 是否包含 /v1，以及模型名是否正确' + tail
  if (status === 429) return '请求过于频繁或额度用尽（HTTP 429）' + tail
  if (status >= 500) return '服务端错误（HTTP ' + status + '），稍后再试' + tail
  return '接口返回 HTTP ' + status + tail
}

export async function callAi(settings: Settings, friendName: string): Promise<string> {
  const ai = settings.ai
  if (!ai.baseUrl || !ai.baseUrl.trim()) throw new Error('还没有填写接口地址（baseUrl）')
  if (!ai.apiKey || !ai.apiKey.trim()) throw new Error('还没有填写 API Key')
  const base = ai.baseUrl.trim().replace(/\/+$/, '')
  const url = base + '/chat/completions'
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 25000)
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + ai.apiKey.trim()
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
  } catch (e) {
    const msg = String(e)
    if (ctrl.signal.aborted) throw new Error('请求超时（25 秒未响应），可能是网络或代理问题')
    if (msg.indexOf('fetch failed') >= 0 || msg.indexOf('ENOTFOUND') >= 0 || msg.indexOf('ECONN') >= 0) {
      throw new Error('无法连接到 ' + base + '（域名解析或网络不通，若需代理请在系统层配置）')
    }
    throw new Error('请求失败：' + msg.slice(0, 140))
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(explainStatus(res.status, body))
  }

  let json: { choices?: Array<{ message?: { content?: string } }> }
  try {
    json = (await res.json()) as typeof json
  } catch (e) {
    throw new Error('接口返回的不是合法 JSON，请确认 baseUrl 指向的是 OpenAI 兼容接口')
  }
  const raw = json.choices && json.choices[0] && json.choices[0].message ? json.choices[0].message.content : ''
  const text = String(raw || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/^["'「『]+|["'」』]+$/g, '')
    .trim()
    .slice(0, 60)
  if (!text) throw new Error('接口未返回可用内容（可能是模型名不对或触发了内容过滤）')
  return text
}

export async function generateMessage(settings: Settings, friendName: string): Promise<string> {
  if (settings.ai.enabled) {
    if (!settings.ai.apiKey || !settings.ai.baseUrl) {
      logbus.warn('已开启 AI 生成，但接口地址或 API Key 未填写，本次改用本地文案')
    } else {
      try {
        return await callAi(settings, friendName)
      } catch (e) {
        logbus.warn('AI 生成失败，改用本地文案：' + String(e).slice(0, 160))
      }
    }
  }
  const templates = settings.templates && settings.templates.length ? settings.templates : FALLBACK
  return pick(templates)
}

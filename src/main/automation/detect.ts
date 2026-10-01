/**
 * 纯函数：火花天数解析与会话类型判定。
 *
 * 单独成文件是为了能脱离 Electron / Vite 的资源导入直接跑单元测试。
 */

export interface GroupVerdict {
  isGroup: boolean
  reason: string
}

/** 从会话标题旁的文本里解析连续火花天数，如 "845" / "1 天后消失" -> 845 / 1。 */
export function parseStreakDays(text: string | null): number | null {
  if (!text) return null
  const m = String(text).match(/(\d+)/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

/**
 * 判断会话是不是群聊。依据优先级从硬到软：
 *   1. conv_id 里没有 ":"   -> 群/特殊会话（实测群聊 id 是 SDK 分配的纯数字，
 *                              单聊恒为 0:1:<小uid>:<大uid>）
 *   2. conv_id 前缀 0:1:    -> 单聊
 *   3. conv_id 前缀 0:2:    -> 群聊
 *   4. 成员数 > 2           -> 群聊
 * 都对不上 -> 视为单聊（不猜）。
 *
 * 注意：阈值必须是 > 2。1v1 会话的 participantCount 实测就是 2，
 *       写成 > 1 会把所有好友误判成群聊（v0.1.0 的真实 bug）。
 *
 * 注意：本函数结果只用于界面提示，不得用于禁用勾选框。
 */
export function detectGroup(convId: string | null, participantCount: number | null): GroupVerdict {
  const s = convId ? String(convId) : ''
  if (s) {
    if (s.indexOf(':') < 0) return { isGroup: true, reason: '会话ID为纯数字（群/特殊会话）' }
    if (s.indexOf('0:1:') === 0) return { isGroup: false, reason: '单聊（ID 前缀 0:1:）' }
    if (s.indexOf('0:2:') === 0) return { isGroup: true, reason: '群聊（ID 前缀 0:2:）' }
  }
  if (participantCount != null && participantCount > 2) {
    return { isGroup: true, reason: '成员数 ' + participantCount + '（> 2）' }
  }
  return { isGroup: false, reason: '未发现群聊特征' }
}

// 选择器与浏览器内脚本。选择器取自 MIT 许可项目 2061360308/DouYinSparkFlow、Xiaowu-0916/douyin-spark 的实测结果。
import loginDomJs from './scripts/loginDom.js?raw'
import listReadyJs from './scripts/listReady.js?raw'
import collectJs from './scripts/collect.js?raw'
import scrollProbeJs from './scripts/scrollProbe.js?raw'
import scrollToJs from './scripts/scrollTo.js?raw'
import clickByNameJs from './scripts/clickByName.js?raw'
import currentConvJs from './scripts/currentConv.js?raw'
import editorEmptyJs from './scripts/editorEmpty.js?raw'
import editorClearJs from './scripts/editorClear.js?raw'
import msgStateJs from './scripts/msgState.js?raw'
import screenTextJs from './scripts/screenText.js?raw'

export const CHAT_URL = 'https://www.douyin.com/chat'

export const SEL = {
  item: '[data-e2e="conversation-item"]',
  title: '.conversationConversationItemtitle',
  list: '.conversationConversationListwrapper',
  foldList: '.conversationFoldConversationListlistWrapper',
  strangerList: '.conversationStrangerConversationListlistWrapper',
  cur: '.conversationConversationItemcurConversation',
  streak: '.commonStreaknormalText',
  loginBox: '[data-e2e="login-container"]',
  avatar: '[data-e2e="user-avatar-card"]',
  msgItem: '[data-e2e="msg-item-content"]',
  fromMe: '.MessageBoxContentisFromMe',
  sendBtn: '.messageMsgInputpublishBtn',
  sendBtnReady: '.messageMsgInputpublishBtn.messageMsgInputpublishRedBtn',
  qrcode: '#animate_qrcode_container'
}

export const EDITOR_CANDIDATES = [
  '[data-e2e="msg-input"] .public-DraftEditor-content',
  '.DraftEditor-root [contenteditable="true"]',
  '.messageMsgInput [contenteditable="true"]',
  '[data-e2e="msg-input"] [contenteditable="true"]',
  '[contenteditable="true"]'
]

export const RATE_LIMIT_KEYWORDS = [
  '操作频繁', '操作太频繁', '发送过于频繁', '请稍后再试', '稍后再试',
  '安全验证', '滑动验证', '验证码', '验证中心', '人机验证',
  '请勿频繁', '账号存在异常', '登录已失效'
]

export const LOGIN_TEXTS = ['扫码登录', '验证码登录', '登录后查看', '登录后即可']

export const JS_LOGIN_DOM = loginDomJs
export const JS_LIST_READY = listReadyJs
export const JS_COLLECT = collectJs
export const JS_SCROLL_PROBE = scrollProbeJs
export const JS_SCROLL_TO = scrollToJs
export const JS_CLICK_BY_NAME = clickByNameJs
export const JS_CURRENT_CONV = currentConvJs
export const JS_EDITOR_EMPTY = editorEmptyJs
export const JS_EDITOR_CLEAR = editorClearJs
export const JS_MSG_STATE = msgStateJs
export const JS_SCREEN_TEXT = screenTextJs

export { parseStreakDays, detectGroup } from './detect'
export type { GroupVerdict } from './detect'

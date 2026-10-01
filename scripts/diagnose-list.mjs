import { chromium } from 'playwright-core'
import path from 'node:path'

const profile = path.join(process.env.APPDATA, 'douyin-spark-helper', 'data', 'chrome-profile')
const ctx = await chromium.launchPersistentContext(profile, {
  channel: 'chrome',
  headless: true,
  viewport: { width: 1366, height: 860 },
  locale: 'zh-CN'
})
const pages = ctx.pages()
const page = pages.length ? pages[0] : await ctx.newPage()
await page.goto('https://www.douyin.com/chat', { waitUntil: 'domcontentloaded', timeout: 90000 })
await page.waitForTimeout(12000)

const info = await page.evaluate(() => {
  const items = [...document.querySelectorAll('[data-e2e="conversation-item"]')]
  const box = document.querySelector('.conversationConversationListwrapper')
  const titles = [...document.querySelectorAll('.conversationConversationItemtitle')].map(t => t.textContent)
  return {
    itemCount: items.length,
    titleCount: titles.length,
    titles: titles.slice(0, 20),
    boxClassFound: !!box,
    scrollTop: box ? Math.round(box.scrollTop) : null,
    scrollHeight: box ? box.scrollHeight : null,
    clientHeight: box ? box.clientHeight : null,
    atBottom: box ? (box.scrollTop + box.clientHeight >= box.scrollHeight - 2) : null
  }
})
console.log(JSON.stringify(info, null, 1))

// 逐个比对目标名字
const want = '王子心'
const norm = (s) => (s == null ? '' : String(s)).split(String.fromCharCode(160)).join(' ').replace(/[\s\u3000]+/g, ' ').trim()
const matched = await page.evaluate((w) => {
  const n = (s) => (s == null ? '' : String(s)).split(String.fromCharCode(160)).join(' ').replace(/[\s\u3000]+/g, ' ').trim()
  const items = [...document.querySelectorAll('[data-e2e="conversation-item"]')]
  return items.map((el) => {
    const t = el.querySelector('.conversationConversationItemtitle')
    const txt = t ? t.textContent : null
    return { raw: txt, norm: n(txt), eq: n(txt) === n(w) }
  })
}, want)
console.log('目标 = ' + want)
console.log(JSON.stringify(matched, null, 1))
await ctx.close()

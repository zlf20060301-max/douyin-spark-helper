import { chromium } from 'playwright-core'
import path from 'node:path'
import fs from 'node:fs'

const profile = path.join(process.env.APPDATA, 'douyin-spark-helper', 'data', 'chrome-profile')
const src = path.join(process.cwd(), 'src', 'main', 'automation', 'scripts')
const clickFn = fs.readFileSync(path.join(src, 'clickByName.js'), 'utf8')

const ctx = await chromium.launchPersistentContext(profile, { channel: 'chrome', headless: true, viewport: { width: 1366, height: 860 }, locale: 'zh-CN' })
const page = ctx.pages()[0] || await ctx.newPage()
await page.goto('https://www.douyin.com/chat', { waitUntil: 'domcontentloaded', timeout: 90000 })
await page.waitForTimeout(12000)

const hit = await page.evaluate('(' + clickFn + ')(' + JSON.stringify('王子心') + ')')
console.log('点击坐标: ' + JSON.stringify(hit))
if (hit) await page.mouse.click(hit.x, hit.y)
await page.waitForTimeout(6000)

const candidates = [
  '[data-e2e="msg-input"] .public-DraftEditor-content',
  '.DraftEditor-root [contenteditable="true"]',
  '.messageMsgInput [contenteditable="true"]',
  '[data-e2e="msg-input"] [contenteditable="true"]',
  '[contenteditable="true"]'
]
for (const c of candidates) {
  let n = -1, vis = null
  try { const l = page.locator(c); n = await l.count(); if (n) vis = await l.first().isVisible() } catch (e) { n = 'ERR' }
  console.log('候选 ' + JSON.stringify(c) + ' -> count=' + n + ' visible=' + vis)
}

const dump = await page.evaluate(() => {
  const out = { msgInputExists: !!document.querySelector('[data-e2e="msg-input"]'), contentEditables: [], sendBtns: [] }
  document.querySelectorAll('[contenteditable]').forEach((el) => {
    const r = el.getBoundingClientRect()
    out.contentEditables.push({
      tag: el.tagName,
      cls: String(el.className).slice(0, 90),
      dataE2e: el.getAttribute('data-e2e'),
      editable: el.getAttribute('contenteditable'),
      w: Math.round(r.width), h: Math.round(r.height),
      parentCls: el.parentElement ? String(el.parentElement.className).slice(0, 70) : null,
      grandCls: el.parentElement && el.parentElement.parentElement ? String(el.parentElement.parentElement.className).slice(0, 70) : null
    })
  })
  document.querySelectorAll('[class*="publishBtn"],[data-e2e*="send"]').forEach((el) => {
    out.sendBtns.push({ tag: el.tagName, cls: String(el.className).slice(0, 90), dataE2e: el.getAttribute('data-e2e') })
  })
  return out
})
console.log(JSON.stringify(dump, null, 1))
await ctx.close()

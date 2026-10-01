import { chromium } from 'playwright-core'
const b = await chromium.connectOverCDP('http://127.0.0.1:9222')
const pages = b.contexts()[0].pages()
const page = pages.find(p => p.url().includes('index.html')) || pages[0]
console.log('URL=' + page.url())
const shots = []
async function shot(tag) {
  const p = 'C:/Users/28041/Desktop/DEEPSEEK/_ui-' + tag + '.png'
  await page.screenshot({ path: p })
  shots.push(p)
}
await page.waitForTimeout(800)
await shot('overview')
for (const t of ['好友', '记录', '设置']) {
  await page.getByRole('button', { name: t, exact: true }).first().click()
  await page.waitForTimeout(500)
  await shot(t === '好友' ? 'friends' : t === '记录' ? 'history' : 'settings')
}
console.log('SHOTS=' + shots.join(','))
await b.close()

import { chromium } from 'playwright-core'
const b = await chromium.connectOverCDP('http://127.0.0.1:9222')
const pages = b.contexts()[0].pages()
const page = pages.find(p => p.url().includes('index.html')) || pages[0]

// 切到好友页
await page.getByRole('button', { name: '好友', exact: true }).first().click()
await page.waitForTimeout(900)
await page.screenshot({ path: 'C:/Users/28041/Desktop/DEEPSEEK/_verify-friends.png' })

const boxes = page.locator('table input[type=checkbox]')
const n = await boxes.count()
console.log('CHECKBOX_COUNT=' + n)

const first = boxes.first()
console.log('FIRST_DISABLED=' + await first.isDisabled())
const before = await first.isChecked()
await first.click()
await page.waitForTimeout(1200)
const after = await first.isChecked()
console.log('BEFORE=' + before + ' AFTER_CLICK=' + after)

// 再点一次还原
await first.click()
await page.waitForTimeout(1200)
console.log('AFTER_RESTORE=' + await first.isChecked())

// 统计可勾选数量
let enabled = 0
for (let i = 0; i < n; i++) { if (!(await boxes.nth(i).isDisabled())) enabled++ }
console.log('ENABLED=' + enabled + '/' + n)
await page.screenshot({ path: 'C:/Users/28041/Desktop/DEEPSEEK/_verify-friends2.png' })
await b.close()

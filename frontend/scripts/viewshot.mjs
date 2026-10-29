import { chromium } from 'playwright'
const base = 'http://127.0.0.1:5173'
const [route, name] = process.argv.slice(2)
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } })
const page = await ctx.newPage()
await page.goto(`${base}/login`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /continue with demo workspace/i }).click()
await page.waitForURL('**/dashboard', { timeout: 15000 })
await page.goto(`${base}${route}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
await page.screenshot({ path: `/tmp/view-${name}.png` })
console.log('ok', name)
await browser.close()

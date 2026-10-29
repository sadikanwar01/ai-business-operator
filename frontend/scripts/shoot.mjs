/**
 * Visual QA harness: drives the running app with a headless browser and
 * captures screenshots of every screen for design review.
 *
 * Usage: node scripts/shoot.mjs [baseUrl] [outDir]
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const base = process.argv[2] ?? 'http://127.0.0.1:5173'
const out = process.argv[3] ?? './shots'
mkdirSync(out, { recursive: true })

const errors = []

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1 })
const page = await context.newPage()

page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`[console] ${message.text()}`)
})
page.on('pageerror', (error) => errors.push(`[pageerror] ${error.message}`))
page.on('response', (response) => {
  if (response.status() >= 400) errors.push(`[http ${response.status()}] ${response.url()}`)
})

const shoot = async (name, full = true) => {
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: full })
  console.log('captured', name)
}

// 1. Login
await page.goto(`${base}/login`, { waitUntil: 'networkidle' })
await shoot('01-login')

// 2. Demo sign-in
await page.getByRole('button', { name: /continue with demo workspace/i }).click()
await page.waitForURL('**/dashboard', { timeout: 15000 })
await page.waitForTimeout(1200)
await shoot('02-dashboard')

// 3. Missions list
await page.goto(`${base}/missions`, { waitUntil: 'networkidle' })
await shoot('03-missions')

// 4. New mission
await page.goto(`${base}/missions/new`, { waitUntil: 'networkidle' })
await shoot('04-new-mission')

// 5. Mission detail (completed reference mission)
const firstMission = await page.evaluate(async () => {
  const token = localStorage.getItem('abo.session')
  const response = await fetch('/api/missions', { headers: { Authorization: `Bearer ${token}` } })
  const data = await response.json()
  return data.missions.find((m) => m.status === 'completed')?.id ?? data.missions[0]?.id
})
await page.goto(`${base}/missions/${firstMission}`, { waitUntil: 'networkidle' })
await shoot('05-mission-complete')

// 6. Mission detail (running mission)
const runningMission = await page.evaluate(async () => {
  const token = localStorage.getItem('abo.session')
  const response = await fetch('/api/missions', { headers: { Authorization: `Bearer ${token}` } })
  const data = await response.json()
  return data.missions.find((m) => m.status === 'running')?.id
})
if (runningMission) {
  await page.goto(`${base}/missions/${runningMission}`, { waitUntil: 'networkidle' })
  await shoot('06-mission-running')
}

// 7. Leads
await page.goto(`${base}/leads`, { waitUntil: 'networkidle' })
await shoot('07-leads')

// 8. Lead detail
const leadId = await page.evaluate(async () => {
  const token = localStorage.getItem('abo.session')
  const response = await fetch('/api/leads?limit=1', { headers: { Authorization: `Bearer ${token}` } })
  const data = await response.json()
  return data.leads[0]?.id
})
await page.goto(`${base}/leads/${leadId}`, { waitUntil: 'networkidle' })
await shoot('08-lead-detail')

// 9. Research
await page.goto(`${base}/research`, { waitUntil: 'networkidle' })
await shoot('09-research')

// 10. Outreach
await page.goto(`${base}/outreach`, { waitUntil: 'networkidle' })
await shoot('10-outreach')

// 11. Follow-ups
await page.goto(`${base}/follow-ups`, { waitUntil: 'networkidle' })
await shoot('11-follow-ups')

// 12. Analytics
await page.goto(`${base}/analytics`, { waitUntil: 'networkidle' })
await shoot('12-analytics')

// 13. Insights
await page.goto(`${base}/insights`, { waitUntil: 'networkidle' })
await shoot('13-insights')

// 14. Knowledge
await page.goto(`${base}/knowledge`, { waitUntil: 'networkidle' })
await shoot('14-knowledge')

// 15. Activity
await page.goto(`${base}/activity`, { waitUntil: 'networkidle' })
await shoot('15-activity')

// 16. Integrations
await page.goto(`${base}/integrations`, { waitUntil: 'networkidle' })
await shoot('16-integrations')

// 17. Settings
await page.goto(`${base}/settings`, { waitUntil: 'networkidle' })
await shoot('17-settings')

// 18. Mobile
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } })
const mobilePage = await mobile.newPage()
await mobilePage.goto(`${base}/login`, { waitUntil: 'networkidle' })
await mobilePage.getByRole('button', { name: /continue with demo workspace/i }).click()
await mobilePage.waitForURL('**/dashboard', { timeout: 15000 })
await mobilePage.waitForTimeout(1200)
await mobilePage.screenshot({ path: `${out}/18-mobile-dashboard.png`, fullPage: true })
await mobilePage.goto(`${base}/leads`, { waitUntil: 'networkidle' })
await mobilePage.screenshot({ path: `${out}/19-mobile-leads.png`, fullPage: true })
console.log('captured mobile')

console.log('\n=== BROWSER ISSUES ===')
console.log(errors.length ? [...new Set(errors)].join('\n') : 'none')

await browser.close()

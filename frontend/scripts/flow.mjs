/**
 * End-to-end walkthrough of the hackathon presentation flow:
 * login -> dashboard -> create mission -> watch the operator work ->
 * results -> leads -> lead detail -> outreach -> approve.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const base = process.argv[2] ?? 'http://127.0.0.1:5173'
const out = process.argv[3] ?? './shots-flow'
mkdirSync(out, { recursive: true })

const issues = []
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 950 } })
const page = await context.newPage()

page.on('console', (m) => m.type() === 'error' && issues.push(`[console] ${m.text()}`))
page.on('pageerror', (e) => issues.push(`[pageerror] ${e.message}`))
page.on('response', (r) => r.status() >= 400 && issues.push(`[http ${r.status()}] ${r.url()}`))

const shot = async (name) => {
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${out}/${name}.png` })
  console.log('shot', name)
}

await page.goto(`${base}/login`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /continue with demo workspace/i }).click()
await page.waitForURL('**/dashboard', { timeout: 15000 })
await shot('a-dashboard')

// --- Create a mission from the dashboard -------------------------------
await page.getByRole('textbox', { name: /business goal/i }).fill(
  'Find 10 high-value healthcare businesses in India that need a new website.',
)
await page.getByRole('button', { name: /launch mission/i }).click()
await page.waitForURL('**/missions/**', { timeout: 20000 })
console.log('mission launched ->', page.url())
await page.waitForTimeout(2500)
await shot('b-mission-running')

// --- Watch the workflow progress ---------------------------------------
const deadline = Date.now() + 150000
let last = ''
while (Date.now() < deadline) {
  const state = await page.evaluate(async () => {
    const token = localStorage.getItem('abo.session')
    const id = location.pathname.split('/').pop()
    const res = await fetch(`/api/missions/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    return { status: data.mission.status, progress: data.mission.progress, step: data.mission.current_step }
  })
  const line = `${state.status} ${state.progress}% ${state.step}`
  if (line !== last) {
    console.log('  ', line)
    last = line
  }
  if (state.status === 'completed' || state.status === 'failed') break
  await page.waitForTimeout(2000)
}

await page.waitForTimeout(2000)
await shot('c-mission-complete')

// --- Leads --------------------------------------------------------------
await page.goto(`${base}/leads`, { waitUntil: 'networkidle' })
await shot('d-leads')

// --- Lead detail --------------------------------------------------------
await page.getByRole('link', { name: /medcare/i }).first().click()
await page.waitForTimeout(1400)
await shot('e-lead-detail')

// --- Outreach -----------------------------------------------------------
await page.goto(`${base}/outreach`, { waitUntil: 'networkidle' })
await shot('f-outreach')

// --- Approve a message --------------------------------------------------
const before = await page.evaluate(async () => {
  const token = localStorage.getItem('abo.session')
  const res = await fetch('/api/outreach', { headers: { Authorization: `Bearer ${token}` } })
  const data = await res.json()
  return data.ready_count
})
const approve = page.getByRole('button', { name: /^approve$/i }).first()
if (await approve.count()) {
  await approve.click()
  await page.waitForTimeout(1600)
  const after = await page.evaluate(async () => {
    const token = localStorage.getItem('abo.session')
    const res = await fetch('/api/outreach', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    return data.ready_count
  })
  console.log(`approve: ready ${before} -> ${after}`)
}
await shot('g-outreach-approved')

// --- Follow-ups ---------------------------------------------------------
await page.goto(`${base}/follow-ups`, { waitUntil: 'networkidle' })
await shot('h-follow-ups')

console.log('\n=== ISSUES ===')
console.log(issues.length ? [...new Set(issues)].join('\n') : 'none')
await browser.close()

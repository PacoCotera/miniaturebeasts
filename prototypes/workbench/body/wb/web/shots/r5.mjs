// The R5 done-pictures and numbers against a running scratch server (the real API, the real GLBs): Loika in the live viewport in every view and angle, at both ends of leg length, and the GLB and first-paint timings.
// Usage: PLAYWRIGHT_BROWSERS_PATH=/home/mb/.cache/ms-playwright node shots/r5.mjs <base url> <out dir>   (playwright from /home/mb/pw156)
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const require = createRequire('/home/mb/pw156/')
const { chromium } = require('playwright')
const base = process.argv[2] ?? 'http://127.0.0.1:8841'
const out = process.argv[3] ?? join(import.meta.dirname, 'out')
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const report = {}
let failed = 0
const fail = (m) => { failed++; console.log('FAIL', m) }

async function open(page, query, { wait = true } = {}) {
  const t0 = Date.now()
  await page.goto(`${base}/studio/S01/shape?ui=next&${query}`)
  if (wait) await page.waitForSelector('canvas[data-ready="1"]', { timeout: 60000 })
  await page.waitForTimeout(400)
  return Date.now() - t0
}

const errors = []
async function newPage(w = 1440, h = 900) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  return { ctx, page }
}

// first visit: cold cache; then a revisit
{
  const { ctx, page } = await newPage()
  const total = await open(page, 'sel=head&theme=dark')
  report.firstVisit = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    const res = performance.getEntriesByType('resource')
    const glb = res.filter((r) => /\.glb$/.test(r.name)).map((r) => ({ url: r.name.split('/').pop().slice(0, 12), bytes: r.encodedBodySize, fetchMs: Math.round(r.responseEnd - r.startTime) }))
    const vp = res.find((r) => /Viewport-.*\.js$/.test(r.name))
    return { navToFirstFrameMs: Math.round(window.__vp.firstFrame), creatureMs: Math.round(window.__vp.creatureMs), glb, viewportChunk: vp && { bytes: vp.encodedBodySize, fetchMs: Math.round(vp.responseEnd - vp.startTime) }, domContentLoaded: Math.round(nav.domContentLoadedEventEnd) }
  })
  await page.screenshot({ path: join(out, 'live-head-dark-1440.png') })
  report.firstVisit.wallMs = total
  await page.reload()
  await page.waitForSelector('canvas[data-ready="1"]', { timeout: 60000 })
  report.revisit = await page.evaluate(() => {
    const res = performance.getEntriesByType('resource')
    return { navToFirstFrameMs: Math.round(window.__vp.firstFrame), glb: res.filter((r) => /\.glb$/.test(r.name)).map((r) => ({ bytes: r.transferSize, fetchMs: Math.round(r.responseEnd - r.startTime) })) }
  })
  await ctx.close()
}

// views and angles
{
  const { ctx, page } = await newPage()
  for (const view of ['plush', 'clay', 'normal', 'parts', 'wire']) {
    await open(page, `sel=body&view=${view}`)
    await page.screenshot({ path: join(out, `live-${view}-dark-1440.png`) })
  }
  for (const az of [0, 90, 180]) {
    await open(page, `sel=body&az=${az}`)
    await page.screenshot({ path: join(out, `live-clay-az${az}-dark-1440.png`) })
  }
  await ctx.close()
}
{
  const { ctx, page } = await newPage(1180, 820)
  await open(page, 'sel=fore&theme=light')
  await page.screenshot({ path: join(out, 'live-clay-light-1180.png') })
  await ctx.close()
}
writeFileSync(join(out, 'r5-report.json'), JSON.stringify({ report, errors }, null, 1))
console.log(JSON.stringify({ report, errors }, null, 1))
await browser.close()
process.exit(failed ? 1 : 0)

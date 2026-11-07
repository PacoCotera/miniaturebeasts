// R6: the Genes panel's first numbers, in the real app against a running scratch server, and the done-pictures. The numbers are "how often each look shows" (the Wild bar), timed from the navigation to the bar on screen,
// cold (empty cache) and warm (reload); the requests to /freq and /variety are counted, so a build that computes in the page shows none.
// Usage: PLAYWRIGHT_BROWSERS_PATH=/home/mb/pw156/browsers node shots/r6.mjs <base url> <out dir> <label> [--pictures]   (playwright from /home/mb/pw156)
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const require = createRequire('/home/mb/pw156/')
const { chromium } = require('playwright')
const base = process.argv[2] ?? 'http://127.0.0.1:8851'
const out = process.argv[3] ?? join(import.meta.dirname, 'out')
const label = process.argv[4] ?? 'new'
const pictures = process.argv.includes('--pictures')
mkdirSync(out, { recursive: true })

const KINDS = { S20: 'form.ear-kind', S01: 'form.head' }
const BAR = '[role="img"][aria-label^="Wild:"]'
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]

const browser = await chromium.launch()
const report = { label, runs: {} }
for (const [id, sel] of Object.entries(KINDS)) {
  const url = `${base}/studio/${id}/genes?sel=${sel}&theme=dark`
  const cold = [], warm = [], calls = [], afterFile = { cold: [], warm: [] }, freqRt = { cold: [], warm: [] }
  for (let k = 0; k < 5; k++) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    const seen = []
    page.on('request', (r) => { const u = r.url(); if (/\/api\/species\/[^/]+\/(freq|variety)/.test(u)) seen.push(u.replace(base, '')) })
    // the bar's time from the navigation, and how long after the species file arrived it was on screen (the old build waits for /freq as well)
    const t = async () => {
      await page.waitForSelector(BAR, { timeout: 60000 })
      return page.evaluate((sid) => {
        const res = performance.getEntriesByType('resource')
        const file = res.filter((r) => new RegExp(`/api/species/${sid}$`).test(r.name)).at(-1)
        const fq = res.filter((r) => /\/freq/.test(r.name)).at(-1)
        const eng = performance.getEntriesByName('engine.freq').at(-1)
        return { ms: Math.round(performance.now()), afterFileMs: Math.round(performance.now() - (file?.responseEnd ?? 0)), freqMs: fq ? Math.round(fq.responseEnd - fq.startTime) : eng ? Math.round(eng.duration) : null }
      }, id)
    }
    await page.goto(url)
    const c = await t()
    cold.push(c.ms); afterFile.cold.push(c.afterFileMs); if (c.freqMs !== null) freqRt.cold.push(c.freqMs)
    await page.reload()
    const w = await t()
    warm.push(w.ms); afterFile.warm.push(w.afterFileMs); if (w.freqMs !== null) freqRt.warm.push(w.freqMs)
    calls.push(seen.length)
    if (pictures && k === 0) {
      await page.waitForTimeout(300)
      await page.screenshot({ path: join(out, `genes-${id}-1440.png`) })
    }
    await ctx.close()
  }
  report.runs[id] = { coldMs: cold, warmMs: warm, medianColdMs: median(cold), medianWarmMs: median(warm), afterFileMs: afterFile, freqRoundTripMs: freqRt, freqOrVarietyRequests: calls }
}
await browser.close()
writeFileSync(join(out, `r6-${label}.json`), JSON.stringify(report, null, 1))
console.log(JSON.stringify(report, null, 1))

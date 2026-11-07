// The R5b done-pictures: Loika's plush (coat) view and clay in the live viewport at az 0, 32 and 90 at 1x, and an eye close-up at 2x, for a before/after.
// Usage: PLAYWRIGHT_BROWSERS_PATH=... node shots/r5b.mjs <base url> <out dir> <tag>   (playwright from /home/mb/pw156)
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const require = createRequire('/home/mb/pw156/')
const { chromium } = require('playwright')
const [base, out, tag] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })

async function open(page, query) {
  await page.goto(`${base}/studio/S01/shape?ui=next&sel=body&theme=light&${query}`)
  await page.waitForSelector('canvas[data-ready="1"]', { timeout: 60000 })
  await page.waitForTimeout(500)
}
async function box(page) {
  return page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height } })
}

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  for (const view of ['plush', 'clay']) {
    for (const az of [0, 32, 90]) {
      await open(page, `view=${view}&az=${az}`)
      await page.screenshot({ path: join(out, `${tag}-${view}-az${az}.png`), clip: await box(page) })
    }
  }
  await ctx.close()
}
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await open(page, 'view=plush&az=32')
  const b = await box(page)
  await page.screenshot({ path: join(out, `${tag}-eye-2x.png`), clip: { x: b.x + 130, y: b.y + 330, width: 270, height: 190 } })
  await ctx.close()
}
await browser.close()

// The R5 parity gate, browser half: the live viewport's silhouette of each variant at az 0, 32, 90 and 180 in the server's own camera and canvas (608 x 624), written as PNGs (alpha is the picture).
// The Blender half is scripts/parity_refs.py (the server's render path); scripts/parity_iou.py compares the two.
// Usage: PLAYWRIGHT_BROWSERS_PATH=... node shots/parity.mjs <base url> <refs dir (refs.json)> <out dir>
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const require = createRequire('/home/mb/pw156/')
const { chromium } = require('playwright')
const [base, refsDir, out] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const refs = JSON.parse(readFileSync(join(refsDir, 'refs.json'), 'utf8'))
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await browser.newContext({ viewport: { width: 700, height: 700 }, deviceScaleFactor: 1 })
await ctx.addInitScript((r) => { window.__parity = r }, refs)
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('PAGEERR', String(e)))
const poseMs = []
for (const variant of Object.keys(refs.variants)) {
  for (const az of [0, 32, 90, 180]) {
    for (const look of ['flat', 'clay']) { // the flat silhouette is the gate's; the clay is for the sheet's pictures
      await page.goto(`${base}/studio/${refs.species}/parity?variant=${variant}&az=${az}&look=${look}`)
      await page.waitForSelector('canvas[data-ready="1"]', { timeout: 60000 })
      await page.waitForTimeout(250)
      const { url, ms } = await page.evaluate(() => ({ url: document.querySelector('canvas').toDataURL('image/png'), ms: window.__vp.poseMs }))
      if (look === 'flat') poseMs.push(ms)
      writeFileSync(join(out, `${look === 'clay' ? 'clay-' : ''}${variant}-az${az}.png`), Buffer.from(url.split(',')[1], 'base64'))
    }
  }
  console.log(variant)
}
writeFileSync(join(out, 'pose-ms.json'), JSON.stringify(poseMs))
await browser.close()

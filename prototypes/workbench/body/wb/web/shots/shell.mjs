// The studio's look has goldens of its own (studio-ui.md 6). Shots the built app (../static/app) in both themes at 1440x900 and at the tablet 1180x820,
// with the API stubbed, so no Blender is needed, and compares each with shots/golden/*.png. `node shots/shell.mjs --update` remakes the goldens.
// Playwright is the one on the VM: PLAYWRIGHT_BROWSERS_PATH=/home/mb/pw156/browsers node shots/shell.mjs
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const require = createRequire('/home/mb/pw156/')
const { chromium } = require('playwright')
const here = import.meta.dirname
const APP = join(here, '../../static/app')
const update = process.argv.includes('--update')
const MAX_DIFF = 0.002 // fraction of pixels allowed to differ

const frame = readFileSync(join(here, 'fixture/frame.png'))
const view = (mode, az, ready) => ({ mode, az, size: 304, key: `${mode}${az}`.padEnd(64, '0'), ready })
const species = (ready) => ({ id: 'S20', hash: 'h', error: null, lease: null, history: [], file: { name: 'Tuliko', body_plan: 'biped' }, checks: null, goldens: null, path: 'S20.json',
  views: ['clay', 'normal', 'parts', 'wire'].flatMap((m) => [0, 32, 90, 180].map((a) => view(m, a, ready && m === 'clay'))) })

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf' }
const server = createServer((req, res) => {
  const p = new URL(req.url, 'http://x').pathname
  const f = join(APP, p.startsWith('/assets/') ? p : 'index.html')
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] ?? 'text/html' })
  res.end(readFileSync(f))
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}`

const browser = await chromium.launch()
const cases = [
  { name: 'shell-dark-1440', theme: 'dark', w: 1440, h: 900, ready: false },
  { name: 'shell-light-1440', theme: 'light', w: 1440, h: 900, ready: false },
  { name: 'shell-dark-1180', theme: 'dark', w: 1180, h: 820, ready: false, touch: true },
  { name: 'shell-light-1180', theme: 'light', w: 1180, h: 820, ready: false, touch: true },
]
let failed = 0
const fail = (m) => { failed++; console.log('FAIL', m) }
for (const c of cases) {
  const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, hasTouch: !!c.touch, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.route('**/api/species', (r) => r.fulfill({ json: [{ id: 'S20', name: 'Tuliko', hash: 'h', error: null }] }))
  await page.route('**/api/species/S20', (r) => r.fulfill({ json: species(c.ready) }))
  await page.route('**/cas/*.png', (r) => r.fulfill({ body: frame, contentType: 'image/png' }))
  await page.route('**/events*', (r) => r.fulfill({ body: ': connected\n\n', contentType: 'text/event-stream' }))
  await page.goto(`${base}/studio/S20/shape?theme=${c.theme}`)
  await page.waitForSelector('main')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(c.ready ? 700 : 300)
  const geo = await page.evaluate(() => ({ nav: document.querySelector('aside[aria-label=Navigator]').getBoundingClientRect().width, insp: document.querySelector('aside[aria-label=Inspector]').getBoundingClientRect().width, theme: document.documentElement.dataset.theme }))
  if (geo.theme !== c.theme) fail(`${c.name}: theme ${geo.theme}`)
  if (geo.nav !== (c.w >= 1280 ? 232 : 56)) fail(`${c.name}: navigator ${geo.nav}px`)
  if (geo.insp !== 344) fail(`${c.name}: inspector ${geo.insp}px`)
  const png = await page.screenshot()
  const out = join(here, 'out', `${c.name}.png`)
  writeFileSync(out, png)
  const gold = join(here, 'golden', `${c.name}.png`)
  if (update || !existsSync(gold)) { writeFileSync(gold, png); console.log('golden written', c.name) }
  else {
    const d = await page.evaluate(async ([a, b]) => {
      const load = (s) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = 'data:image/png;base64,' + s })
      const [ia, ib] = await Promise.all([load(a), load(b)])
      if (ia.width !== ib.width || ia.height !== ib.height) return 1
      const px = (i) => { const k = document.createElement('canvas'); k.width = i.width; k.height = i.height; const g = k.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data }
      const x = px(ia), y = px(ib); let n = 0
      for (let i = 0; i < x.length; i += 4) if (Math.abs(x[i] - y[i]) + Math.abs(x[i + 1] - y[i + 1]) + Math.abs(x[i + 2] - y[i + 2]) > 24) n++
      return n / (x.length / 4)
    }, [png.toString('base64'), readFileSync(gold).toString('base64')])
    console.log(d <= MAX_DIFF ? 'ok  ' : 'FAIL', c.name, `${(d * 100).toFixed(3)}% differ`)
    if (d > MAX_DIFF) failed++
  }
  await ctx.close()
}
await browser.close()
server.close()
process.exit(failed ? 1 : 0)

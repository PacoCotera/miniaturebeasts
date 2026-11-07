// The ?ui=next shell's done-pictures (chunk R2): the empty workspace, dark and light, at 1440x900 and 1180x820, and the palette open.
// Shots the built app (../static/app) with the API stubbed. Usage: PLAYWRIGHT_BROWSERS_PATH=/home/mb/pw156/browsers node shots/next.mjs <out dir>
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, extname } from 'node:path'

const require = createRequire('/home/mb/pw156/')
const { chromium } = require('playwright')
const here = import.meta.dirname
const APP = join(here, '../../static/app')
const out = process.argv[2] ?? join(here, 'out')
mkdirSync(out, { recursive: true })

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf' }
const server = createServer((req, res) => {
  const p = new URL(req.url, 'http://x').pathname
  const q = p.replace(/^\/studio(?=\/assets\/)/, '')
  const f = join(APP, q.startsWith('/assets/') ? q : 'index.html')
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] ?? 'text/html' })
  res.end(readFileSync(f))
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}`

const SPECIES = [{ id: 'S01', name: 'Loika', hash: 'h', error: null }, { id: 'S20', name: 'Tuliko', hash: 'h', error: null }, { id: 'S22', name: 'Pelu', hash: 'h', error: null }]
const browser = await chromium.launch()
let failed = 0
const fail = (m) => { failed++; console.log('FAIL', m) }
const cases = [
  { name: 'shell-dark-1440', theme: 'dark', w: 1440, h: 900 },
  { name: 'shell-light-1440', theme: 'light', w: 1440, h: 900 },
  { name: 'shell-dark-1180', theme: 'dark', w: 1180, h: 820, touch: true },
  { name: 'shell-light-1180', theme: 'light', w: 1180, h: 820, touch: true },
  { name: 'palette-dark-1440', theme: 'dark', w: 1440, h: 900, palette: true },
  { name: 'palette-light-1180', theme: 'light', w: 1180, h: 820, touch: true, palette: true },
]
for (const c of cases) {
  const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, hasTouch: !!c.touch, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.route('**/api/species', (r) => r.fulfill({ json: SPECIES }))
  await page.route('**/api/me', (r) => r.fulfill({ json: { name: 'Paco Cotera', role: 'owner', agent: false } }))
  await page.route('**/events*', (r) => r.fulfill({ body: ': connected\n\n', contentType: 'text/event-stream' }))
  await page.goto(`${base}/studio/S01/shape?ui=next&theme=${c.theme}`)
  await page.waitForSelector('header')
  await page.waitForSelector('text=Loika')
  await page.evaluate(() => document.fonts.ready)
  if (c.palette) { await page.keyboard.press('Control+k'); await page.waitForSelector('[cmdk-input]') }
  await page.waitForTimeout(400)
  const geo = await page.evaluate(() => ({
    top: document.querySelector('header').getBoundingClientRect().height,
    parts: document.querySelector('aside[aria-label=Parts]').getBoundingClientRect().width,
    insp: document.querySelector('aside[aria-label=Inspector]').getBoundingClientRect().width,
    bg: getComputedStyle(document.body).backgroundColor,
    dark: document.documentElement.classList.contains('dark'),
    smallest: Math.min(...[...document.querySelectorAll('header *, aside *, main *, [role=dialog] *')].filter((e) => e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())).map((e) => parseFloat(getComputedStyle(e).fontSize))),
  }))
  if (geo.top !== 56) fail(`${c.name}: top bar ${geo.top}px`)
  if (geo.parts !== (c.w >= 1280 ? 232 : 76)) fail(`${c.name}: parts ${geo.parts}px`)
  if (geo.insp !== (c.w >= 1280 ? 372 : 340)) fail(`${c.name}: inspector ${geo.insp}px`)
  if (geo.dark !== (c.theme === 'dark')) fail(`${c.name}: dark class ${geo.dark}`)
  if (geo.smallest < 14) fail(`${c.name}: text of ${geo.smallest}px`)
  console.log(c.name, JSON.stringify(geo))
  writeFileSync(join(out, `${c.name}.png`), await page.screenshot())
  await ctx.close()
}
await browser.close()
server.close()
process.exit(failed ? 1 : 0)

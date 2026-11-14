// The R3 done-pictures: Loika's fields in the new inspector, read only. Shots the built app (../static/app) with the API answering from the real files:
// species_v1/S01.json and the server's own forms for it (src/generated/roundtrip.json, made by wb/roundtrip.py).
// Usage: PLAYWRIGHT_BROWSERS_PATH=/home/mb/pw156/browsers node shots/r3.mjs <out dir>
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

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' }
const server = createServer((req, res) => {
  const p = new URL(req.url, 'http://x').pathname
  const q = p.replace(/^\/studio(?=\/assets\/)/, '')
  const f = join(APP, q.startsWith('/assets/') ? q : 'index.html')
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] ?? 'text/html' })
  res.end(readFileSync(f))
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}`

const S01 = JSON.parse(readFileSync(join(here, '../../../species_v1/S01.json'), 'utf8'))
const FORMS = JSON.parse(readFileSync(join(here, '../src/generated/roundtrip.json'), 'utf8')).forms_S01
const SPECIES = [{ id: 'S01', name: 'Loika', hash: 'h', error: null }, { id: 'S20', name: 'Tuliko', hash: 'h', error: null }, { id: 'S22', name: 'Pelu', hash: 'h', error: null }]
const answer = (file) => ({ id: 'S01', hash: 'h', error: null, lease: null, history: [], undo: { undo: false, redo: false }, views: [], checks: null, file })
const broken = structuredClone(S01)
broken.rig.bones[FORMS.parts.head.fields[0].ptr.split('/')[3]].len = 'long'

const browser = await chromium.launch()
let failed = 0
const fail = (m) => { failed++; console.log('FAIL', m) }
const cases = [
  { name: 'loika-head-dark-1440', theme: 'dark', w: 1440, h: 900, sel: 'head' },
  { name: 'loika-body-dark-1440', theme: 'dark', w: 1440, h: 900, sel: 'body' },
  { name: 'loika-hind-light-1440', theme: 'light', w: 1440, h: 900, sel: 'hind' },
  { name: 'loika-fore-dark-1180', theme: 'dark', w: 1180, h: 820, sel: 'fore', touch: true },
  { name: 'loika-head-light-1180', theme: 'light', w: 1180, h: 820, sel: 'head', touch: true },
  { name: 'loika-head-refused-dark-1440', theme: 'dark', w: 1440, h: 900, sel: 'head', file: broken },
]
for (const c of cases) {
  const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, hasTouch: !!c.touch, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.route('**/api/species', (r) => r.fulfill({ json: SPECIES }))
  await page.route('**/api/species/S01', (r) => r.fulfill({ json: answer(c.file ?? S01) }))
  await page.route('**/api/species/S01/forms', (r) => r.fulfill({ json: FORMS }))
  await page.route('**/api/me', (r) => r.fulfill({ json: { name: 'Paco Cotera', role: 'owner', agent: false } }))
  await page.route('**/events*', (r) => r.fulfill({ body: ': connected\n\n', contentType: 'text/event-stream' }))
  await page.goto(`${base}/studio/S01/shape?sel=${c.sel}&ui=next&theme=${c.theme}`)
  await page.waitForSelector('[data-field]')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(500)
  const geo = await page.evaluate(() => ({
    fields: document.querySelectorAll('[data-field]').length,
    inputs: [...document.querySelectorAll('[data-field] input')].filter((i) => i.value === '').length,
    alerts: document.querySelectorAll('[role=alert]').length,
    owed: /OWED/.test(document.body.textContent),
    smallest: Math.min(...[...document.querySelectorAll('header *, aside *, main *')].filter((e) => e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())).map((e) => parseFloat(getComputedStyle(e).fontSize))),
    scrollX: document.documentElement.scrollWidth > window.innerWidth,
  }))
  if (!geo.fields) fail(`${c.name}: no fields`)
  if (geo.inputs) fail(`${c.name}: ${geo.inputs} empty values`)
  if (geo.owed) fail(`${c.name}: a placeholder shows`)
  if (geo.smallest < 14) fail(`${c.name}: text of ${geo.smallest}px`)
  if (geo.scrollX) fail(`${c.name}: sideways scroll`)
  if (c.file && !geo.alerts) fail(`${c.name}: the refused field is not marked`)
  if (!c.file && geo.alerts) fail(`${c.name}: ${geo.alerts} alerts on a valid file`)
  console.log(c.name, JSON.stringify(geo))
  writeFileSync(join(out, `${c.name}.png`), await page.screenshot())
  await ctx.close()
}
await browser.close()
server.close()
process.exit(failed ? 1 : 0)

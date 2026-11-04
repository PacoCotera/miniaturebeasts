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
const row = (id, state, value, limit, measure, extra) => ({ id, state, value, limit, measure, stage: 'cage', version: 1, extra, proof: { mode: 'clay', az: 90, key: ('proof' + id).padEnd(64, '0'), ready: true } })
const rows = [row('tail.size', 'fail', 0.2874, 0.25, 'Side area 0.287 of the trunk, limit 0.25'), row('verts', 'warn', 3606, 3500, '3,606 vertices at subdivision level 1, limit 3,500 (amber up to 3,850)', { fail: '3,606 vertices, over 3,500' }), row('balance', 'pass', 0.2636, 0.15, 'Centre of mass 26% of the sole length in front of the heel, limit 15%')]
const metas = [['tail.size', 'Tail size', 'Tail too big for the body', ['tail'], 'Any longer and I\'d tip over backwards!'], ['verts', 'Vertex budget', '{n} vertices, over 3,500', [], null], ['balance', 'Balance', 'Tips over at {end}', ['legs'], 'Whoa, I need my feet under me.']]
  .map(([id, name, fail, part, play]) => ({ id, name, fail, stage: 'cage', version: 1, rule: { date: '2026-11-02 18:26', words: 'The tail is scaled to the creature: root about 0.45 of the seat radius, a thin stalk, the bulb about eye size, side area at most about 1/4 of the trunk.' }, limit: { text: 'side area at most 1/4 of the trunk', value: 0.25 }, part, fields: ['/parts/tail/joints'], play, az: 90, mode: 'clay' }))
const checks = { hash: 'h', fresh: true, rows, counts: { total: 3, fail: 1, warn: 1, need: 2, passed: 1 } }
const species = (ready, withChecks) => ({ checks: withChecks ? checks : null, id: 'S20', hash: 'h', error: null, lease: null, history: [], file: { name: 'Tuliko', body_plan: 'biped' }, checks: null, goldens: null, path: 'S20.json',
  views: ['clay', 'normal', 'parts', 'wire'].flatMap((m) => [0, 32, 90, 180].map((a) => view(m, a, ready && m === 'clay'))) })

const genome = JSON.parse(readFileSync(join(here, '../../../species_v1/S20.json'), 'utf8')).genome
const fails = [{ id: 'normals', fail: 'Sharp crease in leg.L', measure: '24 visible edges over 20°', value: 24, limit: 0 }]
const proofKey = 'proofend'.padEnd(64, '0')
const end = (locus, e, genome_, value, state, extra = {}) => ({ id: `${locus}:${e}`, locus, end: e, genome: genome_, value, label: 'Tail length', state, fails: state === 'fail' ? fails : [], unit: '×', cage: 'c' + e, ...extra })
const extremes = { fresh: true, running: false, key: 'k', rows: [], ends: [end('form.tail-length', 'low', 'low:form.tail-length', 0.8, 'pass'), end('form.tail-length', 'high', 'high:form.tail-length', 1.3, 'fail', { fix: { value: 1.19, path: 'genome.loci.form.tail-length.band.hi', end: 'high' }, proof: { mode: 'normal', az: 90, key: proofKey, ready: true } }),
  end('form.tail-curl', 'low', 'low:form.tail-curl', -0.03, 'fail', { label: 'Tail curl', unit: 'turns' })] }

const s20file = JSON.parse(readFileSync(join(here, '../../../species_v1/S20.json'), 'utf8'))
const demoFile = JSON.parse(readFileSync(join(here, 'fixture/demo-file.json'), 'utf8'))
const freqS20 = JSON.parse(readFileSync(join(here, 'fixture/freq-s20.json'), 'utf8'))
const varietyS20 = JSON.parse(readFileSync(join(here, 'fixture/variety-s20.json'), 'utf8'))
const goldensSame = JSON.parse(readFileSync(join(here, 'fixture/goldens-same.json'), 'utf8'))
const goldensChanged = JSON.parse(readFileSync(join(here, 'fixture/goldens-changed.json'), 'utf8'))
const formsS20 = JSON.parse(readFileSync(join(here, 'fixture/forms-s20.json'), 'utf8'))
const freqDemo = JSON.parse(readFileSync(join(here, 'fixture/freq-demo.json'), 'utf8'))
const metasShape = metas.map((m) => (m.id === 'tail.size' ? { ...m, fields: ['spine.tail.length', 'spine.tail.root', 'spine.tail.tip_r'] } : m))
const shapeFile = structuredClone(s20file)
shapeFile.spine.tail.length = 1.24
const TYPE_STRING = 'G1-S20v1-20A00R61GC3A86100430R210861WQB0R4GC30R61621GC30G10R61GC30R61GC30R442008YR'     // the type's genome string (wb frame writes it into frames/species-S20.json)

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf' }
const server = createServer((req, res) => {
  const p = new URL(req.url, 'http://x').pathname
  const q = p.replace(/^\/studio(?=\/assets\/)/, '') // the app is built with base /studio/
  const f = join(APP, q.startsWith('/assets/') ? q : 'index.html')
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
  { name: 'stage-dark-1440', theme: 'dark', w: 1440, h: 900, ready: true },
  { name: 'checks-dark-1440', theme: 'dark', w: 1440, h: 900, ready: true, checks: true, q: '&sel=tail&drawer=checks&proof=tail.size' },
  { name: 'checks-light-1180', theme: 'light', w: 1180, h: 820, ready: true, checks: true, touch: true, q: '&sel=tail' },
  { name: 'genes-dark-1440', theme: 'dark', w: 1440, h: 900, ready: true, genes: true, q: '&sel=form.tail-length' },
  { name: 'variety-dark-1440', theme: 'dark', w: 1440, h: 900, ready: true, mode: 'variety', q: '&sel=anatomy.tail-tip-form%3Dlantern' },
  { name: 'variety-light-1180', theme: 'light', w: 1180, h: 820, ready: true, touch: true, mode: 'variety', q: '&sel=form.ear-kind%3Dprick&ind=3' },
  { name: 'express-lantern-dark-1440', theme: 'dark', w: 1440, h: 900, ready: true, genes: true, demo: true, q: '&sel=anatomy.tail-tip-form&proof=none', act: async (p) => { await p.locator('aside[aria-label=Navigator] >> text=Tail tip order').scrollIntoViewIfNeeded() } },
  { name: 'express-horn-dark-1440', theme: 'dark', w: 1440, h: 900, ready: true, genes: true, demo: true, q: '&sel=anatomy.horn-presence&proof=none' },
  { name: 'express-sparkle-light-1440', theme: 'light', w: 1440, h: 900, ready: true, genes: true, demo: true, q: '&sel=appearance.freckle-glow&proof=none' },
  { name: 'express-copy-dark-1440', theme: 'dark', w: 1440, h: 900, ready: true, genes: true, demo: true, q: '&sel=appearance.glow-pattern&proof=none', act: async (p) => { await p.click('text=Copy'); await p.waitForSelector('text=Copied'); await p.locator('aside[aria-label=Inspector]').evaluate((e) => e.scrollTo(0, e.scrollHeight)) } },
  { name: 'express-modifier-dark-1440', theme: 'dark', w: 1440, h: 900, ready: true, genes: true, demo: true, token: true, q: '&sel=appearance.glow-pattern&proof=none', act: async (p) => { await p.click('text=Add a modifier'); await p.waitForSelector('text=Which look comes first?'); await p.locator('aside[aria-label=Inspector]').evaluate((e) => e.scrollTo(0, 400)) } },
  { name: 'genes-light-1180', theme: 'light', w: 1180, h: 820, ready: true, genes: true, touch: true, q: '&sel=form.tail-length&proof=none' },
  { name: 'goldens-dark-1440', theme: 'dark', w: 1440, h: 900, ready: true, mode: 'goldens', goldens: goldensSame, q: '&sel=stand%2Fadult-calm' },
  { name: 'goldens-light-1440', theme: 'light', w: 1440, h: 900, ready: true, mode: 'goldens', goldens: goldensChanged, q: '&sel=stand%2Fadult-calm&gv=diff' },
  { name: 'goldens-light-1180', theme: 'light', w: 1180, h: 820, ready: true, touch: true, mode: 'goldens', goldens: goldensSame, q: '&sel=turn%2Fadult-calm-az90-plush' },
  { name: 'shape-dark-1440', theme: 'dark', w: 1440, h: 900, ready: true, shape: true, q: '&sel=tail' },
  { name: 'shape-light-1180', theme: 'light', w: 1180, h: 820, ready: true, shape: true, touch: true, q: '&sel=legs' },
  { name: 'stage-light-1180', theme: 'light', w: 1180, h: 820, ready: true, touch: true },
]
let failed = 0
const fail = (m) => { failed++; console.log('FAIL', m) }
for (const c of cases) {
  const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, hasTouch: !!c.touch, reducedMotion: 'reduce' })
  if (c.token) await ctx.addInitScript(() => sessionStorage.setItem('wb.token', 'shots'))
  const page = await ctx.newPage()
  await page.route('**/api/species', (r) => r.fulfill({ json: [{ id: 'S20', name: 'Tuliko', hash: 'h', error: null }] }))
  await page.route('**/api/species/S20', (r) => { const j = species(c.ready, c.checks); if (c.shape) { j.file = shapeFile; j.checks = checks }
    if (c.genes) { j.file.genome = c.demo ? demoFile.genome : genome; j.file.expressions = c.demo ? demoFile.expressions : s20file.expressions; j.extremes = extremes }; r.fulfill({ json: j }) })
  await page.route('**/api/species/S20/freq*', (r) => r.fulfill({ json: c.demo ? freqDemo : freqS20 }))
  await page.route('**/api/species/S20/string*', (r) => r.fulfill({ json: { species: 'S20', genome: 'type', string: TYPE_STRING, code: null, length: TYPE_STRING.length, version: 1, hash: 'h' } }))
  await page.route('**/api/species/S20/jobs', (r) => r.fulfill({ json: { id: 'j1', state: 'done', result: { views: [{ mode: 'clay', az: 32, size: 304, key: 'clayend'.padEnd(64, '0') }] } } }))
  await page.route('**/api/species/S20/variety*', (r) => r.fulfill({ json: varietyS20 }))
  await page.route('**/api/species/S20/goldens', (r) => r.fulfill({ json: c.goldens ?? goldensSame }))
  await page.route('**/api/species/S20/goldens/file*', (r) => r.fulfill({ body: frame, contentType: 'image/png' }))
  await page.route('**/api/checks', (r) => r.fulfill({ json: c.shape ? metasShape : metas }))
  await page.route('**/api/species/S20/forms', (r) => r.fulfill({ json: formsS20 }))
  await page.route('**/cas/*.png', (r) => r.fulfill({ body: frame, contentType: 'image/png' }))
  await page.route('**/events*', (r) => r.fulfill({ body: ': connected\n\n', contentType: 'text/event-stream' }))
  await page.goto(`${base}/studio/S20/${c.mode ?? (c.genes ? 'genes' : 'shape')}?theme=${c.theme}${c.q ?? ''}`)
  await page.waitForSelector('main')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(c.ready ? 700 : 300)
  if (c.act) { await c.act(page); await page.waitForTimeout(300) }
  const geo = await page.evaluate(() => ({ nav: document.querySelector('aside[aria-label=Navigator]').getBoundingClientRect().width, insp: document.querySelector('aside[aria-label=Inspector]').getBoundingClientRect().width, theme: document.documentElement.dataset.theme }))
  if (geo.theme !== c.theme) fail(`${c.name}: theme ${geo.theme}`)
  if (geo.nav !== (c.w >= 1280 ? 232 : 64)) fail(`${c.name}: navigator ${geo.nav}px`)
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

// The coat landing check (R5b): does each zone's RENDERED median, under the studio key, land on its hex within 0.02 L (OKLab)? Measured on a live render of Loika at az 32 in the server's hero camera (the parity page).
// Usage: PLAYWRIGHT_BROWSERS_PATH=... node shots/landing.mjs <base url> <refs dir (refs.json)> [--calibrate | --table <out.json>] [--cell tint-shade]
//   check (default): draws the coat view and the zones view, prints a zone table (median hex, target hex, dL) and exits 1 when a zone is off by more than 0.02 L.
//   --calibrate: draws the white-albedo view, writes src/viewport/coatGain.json (the albedo gain of each zone: 1 over its median irradiance, per channel). Rebuild the app, then run the check.
// The zones view paints every zone an id grey (no light), so which pixels are a zone is read from the render itself; a zone's pixels are those whose neighbours two pixels round are the same zone (no edge blend).
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const require = createRequire('/home/mb/pw156/')
const { chromium } = require('playwright')
const [base, refsDir, ...rest] = process.argv.slice(2)
const calibrate = rest.includes('--calibrate')
const tableOut = rest.includes('--table') ? rest[rest.indexOf('--table') + 1] : null
const refs = JSON.parse(readFileSync(join(refsDir, 'refs.json'), 'utf8'))
const ZONES = { coat: 0, cream: 1, toe: 2, ring: 3, iris: 4, crest: 8 } // the ids of the zones view (materials.ts ZONE_ID)

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await browser.newContext({ viewport: { width: 700, height: 700 }, deviceScaleFactor: 1 })
await ctx.addInitScript((r) => { window.__parity = r }, refs)
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('PAGEERR', String(e)))
async function draw(look) {
  await page.goto(`${base}/studio/${refs.species}/parity?variant=type&az=32&look=${look}`)
  await page.waitForSelector('canvas[data-ready="1"]', { timeout: 60000 })
  await page.waitForTimeout(300)
  return page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))
}
const urls = { zones: await draw('zones') }
if (calibrate) urls.white = await draw('white')
else urls.coat = await draw('coat')
const targets = await (await fetch(`${base}/api/species/${refs.species}/studio`)).json()

// the analysis runs in a page (canvas decodes the PNGs)
const blank = await ctx.newPage()
const res = await blank.evaluate(async ({ urls, ZONES }) => {
  const load = async (u) => {
    const bmp = await createImageBitmap(await (await fetch(u)).blob(), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' })
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const g = c.getContext('2d', { willReadFrequently: true })
    g.drawImage(bmp, 0, 0)
    return g.getImageData(0, 0, bmp.width, bmp.height)
  }
  const ids = await load(urls.zones)
  const img = await load(urls.white ?? urls.coat)
  const W = ids.width, H = ids.height
  const idAt = new Int16Array(W * H).fill(-1)
  for (let i = 0; i < W * H; i++) {
    const r = ids.data[i * 4], g = ids.data[i * 4 + 1], b = ids.data[i * 4 + 2], a = ids.data[i * 4 + 3]
    if (a < 255 || Math.abs(r - g) > 3 || Math.abs(g - b) > 3) continue
    const k = Math.round(r / 25) - 1
    if (k >= 0 && k <= 8 && Math.abs(r - (k + 1) * 25) <= 4) idAt[i] = k
  }
  const out = {}
  for (const [name, id] of Object.entries(ZONES)) {
    const px = []
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
      const i = y * W + x
      if (idAt[i] !== id) continue
      if (idAt[i - 2] !== id || idAt[i + 2] !== id || idAt[i - 2 * W] !== id || idAt[i + 2 * W] !== id || idAt[i - W - 1] !== id || idAt[i + W + 1] !== id) continue
      px.push([img.data[i * 4], img.data[i * 4 + 1], img.data[i * 4 + 2]])
    }
    out[name] = { n: px.length, px }
  }
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
  const lab = (r, g, b) => {
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  }
  const med = (a) => { const s = [...a].sort((p, q) => p - q); return s[Math.floor(s.length / 2)] }
  const rep = {}
  for (const [name, z] of Object.entries(out)) {
    if (!z.n) { rep[name] = { n: 0 }; continue }
    const ch = [0, 1, 2].map((c) => med(z.px.map((p) => lin(p[c]))))
    rep[name] = { n: z.n, medLinear: ch, medL: med(z.px.map((p) => lab(lin(p[0]), lin(p[1]), lin(p[2])))) }
  }
  return rep
}, { urls, ZONES })
await browser.close()

if (calibrate) {
  const WHITE = 0.35
  const gain = {}
  for (const z of Object.keys(ZONES)) {
    if (!res[z].n) throw new Error(`zone ${z} has no pixels in the zones view`)
    gain[z] = res[z].medLinear.map((m) => Number((WHITE / m).toFixed(4)))
    // the toe pads and the cream share a hex, the ring too: each its own zone, so its own light
  }
  const here = new URL('../src/viewport/coatGain.json', import.meta.url).pathname
  writeFileSync(here, JSON.stringify(gain) + '\n')
  console.log(JSON.stringify({ pixels: Object.fromEntries(Object.entries(res).map(([k, v]) => [k, v.n])), gain }, null, 1))
  process.exit(0)
}

// the check
const hex = { coat: '#2e2a2d', cream: '#a98b6d', toe: '#a98b6d', ring: '#a98b6d', iris: '#c47a2c', crest: '#757944' }
const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const Lof = (h) => { const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255)); return 0.2104542553 * Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) + 0.793617785 * Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) - 0.0040720468 * Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b) }
const gam = (v) => Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)).toString(16).padStart(2, '0')
const rows = []
let worst = 0
for (const z of Object.keys(ZONES)) {
  const r = res[z]
  const dL = r.n ? r.medL - Lof(hex[z]) : NaN
  worst = Math.max(worst, Math.abs(dL))
  rows.push({ zone: z, pixels: r.n, rendered: r.n ? '#' + r.medLinear.map(gam).join('') : '-', target: hex[z], dL: Number.isNaN(dL) ? null : Number(dL.toFixed(4)) })
}
if (rest.includes('--refine')) { // one correction on the white-render gains for what the light adds that does not scale with the albedo (the sheen of a dark coat): gain x target / rendered, per channel
  const here = new URL('../src/viewport/coatGain.json', import.meta.url).pathname
  const gain = JSON.parse(readFileSync(here, 'utf8'))
  for (const z of Object.keys(ZONES)) {
    const t = [1, 3, 5].map((i) => lin(parseInt(hex[z].slice(i, i + 2), 16) / 255))
    gain[z] = gain[z].map((g, c) => Number((g * t[c] / res[z].medLinear[c]).toFixed(4)))
  }
  writeFileSync(here, JSON.stringify(gain) + '\n')
  console.log('refined', JSON.stringify(gain))
  process.exit(0)
}
console.log(JSON.stringify({ look: targets.look, rows, worst }, null, 1))
if (tableOut) writeFileSync(tableOut, JSON.stringify({ rows, worst }, null, 1))
const bad = rows.filter((r) => r.dL === null || Math.abs(r.dL) > 0.02)
if (bad.length) { console.log('FAIL: zones off by more than 0.02 L:', bad.map((r) => r.zone).join(', ')); process.exit(1) }
console.log('ok: every zone within 0.02 L, worst', worst.toFixed(4))

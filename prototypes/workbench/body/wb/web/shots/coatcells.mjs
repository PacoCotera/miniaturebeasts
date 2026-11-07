// Tunes the coat of every Tint-Shade cell and prints the spread numbers of all nine (R5b).
// For each cell it draws the live creature (shots/landing.mjs --cell --tune) and corrects the albedo gain until the coat's median lands on the cell's hex, and the spread curve's exponent until the coat's p95 L reaches the master's ratio to its median
// (0.47 / 0.29), capped at 0.92 so a light cell does not clip. Writes src/viewport/coatCells.json (rebuild the app after) and, with --check, only measures with the table in the build.
// Usage: PLAYWRIGHT_BROWSERS_PATH=... node shots/coatcells.mjs <base url> <refs dir> <out json> [--check]
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const [base, refsDir, out, ...rest] = process.argv.slice(2)
const check = rest.includes('--check')
const here = new URL('./landing.mjs', import.meta.url).pathname
const tableFile = new URL('../src/viewport/coatCells.json', import.meta.url).pathname
const CELLS = ['redder-dark', 'redder-between', 'redder-light', 'between-dark', 'between-between', 'between-light', 'yellower-dark', 'yellower-between', 'yellower-light']
const HEX = { 'redder-dark': '#482a1e', 'redder-between': '#864d2b', 'redder-light': '#a26b4f', 'between-dark': '#2e2a2d', 'between-between': '#615c5f', 'between-light': '#989397', 'yellower-dark': '#3e301f', 'yellower-between': '#72583b', 'yellower-light': '#9f805a' }
const lin = (h, i) => { const v = parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16) / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
const base0 = JSON.parse(readFileSync(new URL('../src/viewport/coatGain.json', import.meta.url), 'utf8')).coat
const table = check ? JSON.parse(readFileSync(tableFile, 'utf8')) : {}

function measure(cell, tune) {
  const f = `${out}.${cell}.json`
  const args = [here, base, refsDir, '--cell', cell, '--json', f]
  if (tune) args.push('--tune', JSON.stringify(tune))
  const r = spawnSync('node', args, { encoding: 'utf8', env: process.env })
  if (!r.stdout && r.status === null) throw new Error(r.stderr)
  return { rows: JSON.parse(readFileSync(f, 'utf8')).rows, log: r.stdout, status: r.status }
}

const numbers = []
for (const cell of CELLS) {
  let tune = check ? table[cell] : { gain: base0, gamma: 1.85 }
  let m = measure(cell, check ? null : tune)
  if (!check) {
    for (let i = 0; i < 9; i++) {
      const c = m.rows[0]
      const rendered = c.rendered
      const gain = tune.gain.map((g, k) => Number((g * (lin(HEX[cell], k) / lin(rendered, k)) ** (1 / tune.gamma)).toFixed(4)))
      const gamma = Number((tune.gamma * Math.log(Math.min(c.p95Target, 0.885) / c.median) / Math.log(c.p95 / c.median)).toFixed(4))
      // the median is read back before the curve changes it, so move the exponent by half the correction at first
      tune = { gain, gamma: Number(((tune.gamma + gamma) / 2).toFixed(4)) }
      m = measure(cell, tune)
      const d = m.rows[0]
      if (Math.abs(d.dL) < 0.005 && Math.abs(d.p95 - Math.min(d.p95Target, 0.885)) < 0.008) break
    }
    table[cell] = tune
  }
  const c = m.rows[0]
  numbers.push({ cell, hex: HEX[cell], p5: c.p5, p5Target: c.p5Target, median: c.median, dL: c.dL, p95: c.p95, p95Target: c.p95Target, clip: c.clip, gamma: table[cell]?.gamma })
  console.log(JSON.stringify(numbers.at(-1)))
}
if (!check) writeFileSync(tableFile, JSON.stringify(table, null, 1) + '\n')
writeFileSync(out, JSON.stringify(numbers, null, 1))
const bad = numbers.filter((n) => n.p95 > 0.92 || Math.abs(n.dL) > 0.02 || Math.abs(n.p5 - n.p5Target) > 0.04 || Math.abs(n.p95 - n.p95Target) > 0.04 || n.clip >= 0.01)
console.log(bad.length ? 'FAIL: ' + bad.map((n) => n.cell).join(', ') : 'ok: all 9 cells within 0.02 L of median, p95 at most 0.92, p5 and p95 within 0.04, under 1% of coat pixels with a channel at 0 or 255')
process.exit(bad.length ? 1 : 0)

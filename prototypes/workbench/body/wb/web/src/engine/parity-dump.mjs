// The parity dump: 1,000 wild draws and 1,000 `seed:N` draws of a species file, with their looks and how often each look shows, plus the file's freq and Variety numbers, as JSON on stdout.
// tests/test_wb_studio_parity.py makes the same dump in Python and compares the two. Run: node --import ./node-framework.mjs parity-dump.mjs <species file> [draws]
import { readFileSync } from 'node:fs'
import { context, looksOf, wild, typeCopies } from './expressions.mjs'
import { draw, genomeOf } from './genes.mjs'
import { meshCopies, sheet } from './variety.mjs'
import { freqOf } from './index.mjs'

const doc = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const N = Number(process.argv[3] ?? 1000)
const g = doc.genome
const ctx = context(g)

// how many draws show each look at each locus ("asleep" when the locus sleeps)
function counts(looksList) {
  const out = {}
  for (const looks of looksList) for (const [i, v] of Object.entries(looks)) { const c = (out[i] ??= {}); const k = v === null ? 'asleep' : v; c[k] = (c[k] ?? 0) + 1 }
  return out
}
const dump = (copies, extra) => ({ genomes: copies, looks: copies.map((c) => looksOf(g, c, ctx)), ...extra })

const out = { id: doc.id, loci: g.loci.length }
out.wild = dump(wild(g, N, 20, true, ctx))
out.wild.counts = counts(out.wild.looks)
if (doc.id === 'S20') {
  const copies = []
  for (let i = 1; i <= N; i++) { const c = typeCopies(g); for (const [k, x] of Object.entries(genomeOf(draw(i, 2026)))) if (k in c) c[k] = [...x]; copies.push(c) }
  out.draws = dump(copies)
} else if (doc.mesh && g.loci.length) {
  const cs = Array.from({ length: N }, (_, k) => meshCopies(doc, k + 1, doc.variety?.seed ?? 2026))
  out.draws = dump(cs.map((x) => x.copies), { values: cs.map((x) => x.values) })
} else out.draws = null
if (out.draws) out.draws.counts = counts(out.draws.looks)
const { species: _s, ...fq } = freqOf(doc, 1000) ?? {}
out.freq = freqOf(doc, 1000) ? fq : null
out.sheet = sheet(doc)
process.stdout.write(JSON.stringify(out))

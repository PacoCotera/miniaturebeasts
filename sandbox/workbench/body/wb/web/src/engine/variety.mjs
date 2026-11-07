// wb/variety.py in the page: the Variety sheet's numbers and rules (N individuals drawn from the file's own rules, how often each look shows on the sheet, in wild pods and in a cross), and the draws of a mesh body.
// Only the file is read: no build, no render, so every number is instant.
import { pyRandom } from './py-random.mjs'
import { pyRound, pyMod } from './pymath.mjs'
import { draw, genomeOf, creature, loudGenes, hueWindow, valueOf, tOf, blendMap } from './genes.mjs'
import { freq, context, looksOf, showingFrom, typeCopies, isModifier, poolOf, sheetCopies } from './expressions.mjs'

export const DEFAULT = { n: 12, seed: 2026, cycle: [], hue_wheel: true, max_loud: 2, species_rules: [] }
export const N_MAX = 48

export function settings(doc, n = null, seed = null) {
  const v = { ...DEFAULT, ...(doc.variety ?? {}) }
  if (n !== null) v.n = Math.trunc(Number(n))
  if (seed !== null) v.seed = Math.trunc(Number(seed))
  v.n = Math.max(1, Math.min(Math.trunc(v.n), N_MAX))
  return v
}
export const selector = (i, seed, fileSeed) => (Number(seed) === Number(fileSeed) ? `seed:${i}` : `seed:${i}@${Math.trunc(seed)}`)

// An individual's resolved fields: shape and coat flat, the hue in degrees and the belly (dark or light, by the coat's own warm window).
export function fields(ind) {
  const c = creature(ind)
  const f = { ...c.shape, ...c.coat }
  const h = pyMod(Number(c.coat.hue) + 360.0 * Number(c.coat.hue_shift ?? 0.0), 360.0)
  f.hue = pyRound(h, 3)
  f.belly = hueWindow(h) ? 'dark' : 'light'
  f.loud = loudGenes(ind)
  return f
}
export function holds(cond, f) {
  if ('any' in cond) return cond.any.some((c) => holds(c, f))
  const v = f[cond.field]
  if ('in' in cond) { const [lo, hi] = cond.in; return typeof v === 'number' && lo <= v && v <= hi }
  if ('not' in cond) return v !== cond.not
  return v === cond.is
}
export const broken = (rule, f) => (rule.when ?? []).every((c) => holds(c, f)) && !(rule.then ?? []).every((c) => holds(c, f))

export function lookWords(v, locus, look) {
  const w = v.look_words?.[locus]?.[look]
  return Array.isArray(w) && (w.length === 2 || w.length === 3) ? [...w] : null
}
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
function labelOf(g, expressions, locus, look, words) {
  if (words) return words[0]
  const x = expressions.find((x) => x.locus === locus && x.look === look)
  if (x) return x.label || x.id
  const e = g.loci.find((e) => e.locus === locus) ?? {}
  return `${capitalize(String(look).replace(/-/g, ' '))} · ${e.short ?? locus}`
}

// Individual i of a mesh body's sheet: {locus: value}, each blend locus that moves something drawn at a t between the band's ends (a seeded draw, so the same sheet comes back).
export function meshDraw(doc, i, seed) {
  const rng = pyRandom(`${doc.id}:${Math.trunc(seed)}:${Math.trunc(i)}`)
  const out = {}
  for (const e of doc.genome?.loci ?? []) {
    if (e.op === 'blend' && e.band && e.moves && e.moves.length) out[e.locus] = pyRound(valueOf(e.band.form, e.band.lo, e.band.hi, rng.random()), 4)
  }
  return out
}
// A mesh draw as copies of the file's own loci: a drawn locus sits at the t its value stands for (both copies, to 9 places, as the type's t is), every other at the type.
export function meshCopies(doc, i, seed) {
  const g = doc.genome, vals = meshDraw(doc, i, seed), c = typeCopies(g)
  for (const e of g.loci) if (e.locus in vals) { const [f, lo, hi] = blendMap(e); const t = pyRound(tOf(f, lo, hi, vals[e.locus]), 9); c[e.locus] = [t, t] }
  return { values: vals, copies: c }
}

// The Variety sheet of a file: its individuals (looks, loud looks, any broken rule), the looks with how often each shows, and the rules. null for a species with no sampler.
export function sheet(doc, n = null, seed = null, wildN = 1000) {
  const g = doc.genome
  if (doc.id !== 'S20' || !g || typeof g !== 'object' || !('loci' in g)) return null
  const v = settings(doc, n, seed)
  const expressions = doc.expressions ?? []
  const ctx = context(g)
  const { by } = ctx
  const fileSeed = doc.variety?.seed ?? DEFAULT.seed
  const inds = [], copies = []
  const typ = typeCopies(g)
  for (let i = 1; i <= v.n; i++) {
    const ind = draw(i, v.seed)
    const c = { ...typ }
    for (const [k, x] of Object.entries(genomeOf(ind))) if (k in c) c[k] = [...x]
    const f = fields(ind)
    const fails = v.species_rules.filter((r) => broken(r, f)).map((r) => ({ rule: r.id, label: r.label || r.id, words: r.fail }))
    if (f.loud.length > v.max_loud) fails.push({ rule: 'loud', label: 'Loud traits', words: `${f.loud.length} loud traits, limit ${v.max_loud}` })
    inds.push({ n: i, genome: selector(i, v.seed, fileSeed), hue: f.hue, loud: f.loud, looks: looksOf(g, c, ctx), fails })
    copies.push(c)
  }
  const fq = freq(g, expressions, wildN, 20, 'S20')
  const rows = []
  for (const locus of v.cycle) {
    const e = by[locus]
    if (e === undefined || isModifier(e)) continue
    const fl = fq.loci[locus] ?? {}
    for (const look of poolOf(e)) {
      if (look === 'none') continue
      const who = inds.filter((x) => x.looks[locus] === look).map((x) => x.n)
      const x = expressions.find((x) => x.locus === locus && x.look === look)
      const words = lookWords(v, locus, look)
      rows.push({
        id: `${locus}=${look}`, locus, look, label: labelOf(g, expressions, locus, look, words), short: (words ?? [null, String(look).replace(/-/g, ' ')])[1], trait: v.trait_words?.[locus] || e.short || locus,
        count: who.length, who, age: x?.age?.from ?? null, wild: fl.wild?.[look] ?? 0.0, cross: fl.cross?.[look] ?? 0.0, cross_of: fq.n.cross, rule: fl.rule_words ?? null, order: e.order ?? null, modifiers: fl.modifiers ?? [],
      })
    }
  }
  for (const x of expressions) {
    if (v.cycle.includes(x.locus) || !(x.age || x.needs?.length)) continue
    const xf = fq.expressions[x.id], stage = x.age?.from ?? 'adult'
    const who = inds.filter((_, k) => showingFrom(looksOf(g, copies[k], ctx), [x], stage).length).map((i) => i.n)
    rows.push({
      id: `expr:${x.id}`, locus: x.locus, look: x.look, label: x.label || x.id, short: String(x.look).replace(/-/g, ' '), trait: v.trait_words?.[x.locus] || by[x.locus]?.short || x.locus,
      count: who.length, who, age: x.age?.from ?? null, wild: xf.wild?.[stage] ?? 0.0, cross: xf.cross?.[stage] ?? 0.0, cross_of: fq.n.cross, rule: null, order: null, modifiers: [],
    })
  }
  return {
    n: v.n, seed: v.seed, file_seed: fileSeed, max_loud: v.max_loud, wild_n: wildN, individuals: inds, looks: rows,
    rules: v.species_rules.map((r) => ({ id: r.id, label: r.label || r.id, fail: r.fail, broken: inds.filter((i) => i.fails.some((f) => f.rule === r.id)).map((i) => i.n) })),
    failing: inds.filter((i) => i.fails.length).map((i) => i.n),
  }
}
export { sheetCopies }

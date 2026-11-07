// expressions.py in the page: how a locus shows (dominance, modifier genes, sleeping records), the looks of a genome, wild pods, the cross and how often each look shows. The file's genome block and `expressions[]` are read; nothing else.
import { generator } from './numpy-rng.mjs'
import { pyRound, pyRoundInt } from './pymath.mjs'
import { GENES, SAMPLER_OF, draw, genomeOf, gridT, typeT, pinValue, GRID } from './genes.mjs'

export const STAGES = ['juvenile', 'adult', 'elder']
const RULE_OF = { 'dominant-enable': 'dominant', 'recessive-enable': 'recessive', 'pair-map': 'first-ranked', 'partition-map': 'both' }
export const RULE_WORDS = { dominant: 'One is enough', recessive: 'Needs both', 'first-ranked': 'First in the order', both: 'Both show', mixes: 'Mixes' }
const LOUD_ORDER = ['glow', 'pattern', 'emblem', 'brow']
export const MAX_LOUD = 2
const isOn = (c) => c === 'on' || c === true

export const byLocus = (g) => Object.fromEntries(g.loci.map((e) => [e.locus, e]))
export function modifiers(g) {
  const out = {}
  for (const e of g.loci) if (e.modifier && typeof e.modifier === 'object') (out[e.modifier.of] ??= []).push(e)
  return out
}
export const isModifier = (e) => !!e.modifier && typeof e.modifier === 'object'
export const poolOf = (e) => (e.op === 'blend' ? [...(e.bins ?? [])] : e.limits.map(String))

function activeModifier(mods, copies, locus) {
  for (const m of mods[locus] ?? []) if ((copies[m.locus] ?? ['off', 'off']).some(isOn)) return m
  return null
}
export function ruleOf(mods, entry, copies = null) {
  const base = RULE_OF[entry.operator || (entry.op === 'pair-map' ? 'pair-map' : 'copy-mean')] ?? 'mixes'
  const m = copies !== null ? activeModifier(mods, copies, entry.locus) : null
  return m ? [m.modifier.show, m.modifier.order ?? null, m.locus] : [base, entry.order ?? null, null]
}
const T_OF = { low: 0.0, short: 0.0, between: 0.5, high: 1.0, long: 1.0 }
const tOf = (c) => (typeof c === 'number' ? c : T_OF[c] ?? 0.5)

export function shown(mods, entry, copies) {
  const cs = copies[entry.locus]
  const [show, order] = ruleOf(mods, entry, copies)
  if (entry.op === 'blend') {
    const bins = entry.bins
    if (!bins || !bins.length) return null
    const t = (tOf(cs[0]) + tOf(cs[1])) / 2.0
    return bins[t > 0 ? Math.min(bins.length - 1, Math.trunc(t * bins.length - 1e-9)) : 0]
  }
  if (entry.op === 'switch') {
    const n = cs.filter(isOn).length
    return (show === 'dominant' ? n >= 1 : n === 2) ? 'on' : 'off'
  }
  const ordr = (order ?? entry.limits).map(String)
  const idx = (x) => { const i = ordr.indexOf(x); if (i < 0) throw new Error(`${x} is not in ${ordr}`); return i }
  const names = cs.map(String)
  if (show === 'both') return [...new Set(names)].sort((a, b) => idx(a) - idx(b)).join(' and ')
  return names.reduce((a, b) => (idx(b) < idx(a) ? b : a))
}

export function asleep(by, mods, copies, entry, seen = []) {
  if (entry.kind !== 'sleeping' || seen.includes(entry.locus)) return false
  const look = (i) => { const o = by[i]; return o === undefined || asleep(by, mods, copies, o, [...seen, entry.locus]) ? null : shown(mods, o, copies) }
  if ((entry.requires ?? []).some((r) => look(r) !== 'on')) return true
  const ww = entry.wakesWhen
  return !!ww && Object.keys(ww).length > 0 && !Object.entries(ww).some(([i, looks]) => look(i) !== null && looks.includes(look(i)))
}

export function looksOf(g, copies, ctx = { by: byLocus(g), mods: modifiers(g) }) {
  const out = {}
  for (const [i, e] of Object.entries(ctx.by)) if (!isModifier(e)) out[i] = asleep(ctx.by, ctx.mods, copies, e) ? null : shown(ctx.mods, e, copies)
  return out
}
const needOk = (looks, need) => { const v = looks[need.locus]; return v !== null && v !== undefined && ('is' in need ? v === need.is : need.in.includes(v)) }
const stageOk = (x, stage) => { const f = x.age?.from; return f === undefined || STAGES.indexOf(stage) >= STAGES.indexOf(f) }
// the expressions that show given the looks, at a life stage
export const showingFrom = (looks, expressions, stage = 'adult') => expressions.filter((x) => looks[x.locus] === x.look && (x.needs ?? []).every((n) => needOk(looks, n)) && stageOk(x, stage)).map((x) => x.id)
export const showing = (g, expressions, copies, stage = 'adult') => showingFrom(looksOf(g, copies), expressions, stage)

// ---- draws
export function typeCopies(g) {
  const out = {}
  for (const e of g.loci) {
    if (e.op === 'blend') { const t = typeT(e); out[e.locus] = [t, t] } else out[e.locus] = [e.type, e.type]
  }
  return out
}

export function loudTags(g, copies, ctx) {
  const looks = looksOf(g, copies, ctx), typ = ctx.typLooks
  const tags = []
  for (const e of g.loci) {
    const t = e.loud
    const l = looks[e.locus]
    if (t && l !== undefined && l !== null && l !== typ[e.locus] && !tags.includes(t)) tags.push(t)
  }
  return tags.sort((a, b) => (LOUD_ORDER.includes(a) ? LOUD_ORDER.indexOf(a) : 99) - (LOUD_ORDER.includes(b) ? LOUD_ORDER.indexOf(b) : 99))
}
export function limitLoud(g, copies, typ, ctx, keep = MAX_LOUD) {
  for (const tag of loudTags(g, copies, ctx).slice(keep)) for (const e of g.loci) if (e.loud === tag) copies[e.locus] = [...typ[e.locus]]
  return copies
}
export function context(g) {
  const by = byLocus(g), mods = modifiers(g)
  const ctx = { by, mods, typLooks: null }
  ctx.typLooks = looksOf(g, typeCopies(g), ctx)
  return ctx
}

// n genomes drawn from the pools of the file (numpy stream [seed, 9])
export function wild(g, n = 1000, seed = 20, limit = true, ctx = context(g)) {
  const rng = generator([seed, 9])
  const typ = typeCopies(g), out = []
  for (let k = 0; k < n; k++) {
    const c = {}
    for (const e of g.loci) {
      const i = e.locus
      if (e.op === 'blend') {
        const old = SAMPLER_OF[i]
        const tight = old in GENES && ['body', 'face'].includes(GENES[old][3])
        const t = gridT(tight ? 0.5 + (rng.random() - 0.5) * 0.7 : rng.random())
        c[i] = [t, t]
      } else if (e.op === 'switch') {
        const w = Number(e.weight ?? 0.5)
        const a = rng.random() < w ? 'on' : 'off'
        const b = rng.random() < w ? 'on' : 'off'
        c[i] = [a, b]
      } else {
        const al = e.limits.map(String)
        const w = e.weights?.length ? e.weights : Array(al.length).fill(1.0 / al.length)
        c[i] = [rng.choiceP(al, w), rng.choiceP(al, w)]
      }
    }
    out.push(limit ? limitLoud(g, c, typ, ctx) : c)
  }
  return out
}

// the Variety sheet's copies (S20 only: its sampler is the sheet)
export function sheetCopies(g, docId, n = 12, seed = 2026, ctx) {
  if (docId !== 'S20') return null
  const out = []
  for (let i = 1; i <= n; i++) {
    const c = typeCopies(g)
    for (const [k, x] of Object.entries(genomeOf(draw(i, seed)))) if (k in c) c[k] = [...x]
    out.push(c)
  }
  return out
}

const ABS_RECORD = { 'movement.cycle-rate': [0.6, 1.4], 'appearance.sheen': [0.0, 1.0], 'appearance.emission-brightness': [0.4, 1.0] }
const copyValue = (record, c) => (typeof c === 'number' ? c : pinValue(record, c))

// a child of two genomes: one copy from each parent at every locus; a blend is the mean of the two copies taken, on the 59-step grid
export function cross(g, a, b, rng) {
  const out = {}
  for (const e of g.loci) {
    const i = e.locus
    const ca = a[i][rng.integers2()], cb = b[i][rng.integers2()]
    if (e.op !== 'blend') out[i] = [ca, cb]
    else if (i in ABS_RECORD) {
      const [lo, hi] = ABS_RECORD[i]
      const k = pyRoundInt(((copyValue(i, ca) + copyValue(i, cb)) / 2.0 - lo) / ((hi - lo) / GRID))
      const v = pyRound(lo + (k * (hi - lo)) / GRID, 6)
      out[i] = [v, v]
    } else {
      const t = gridT((copyValue(i, ca) + copyValue(i, cb)) / 2.0)
      out[i] = [t, t]
    }
  }
  return out
}
export function forecast(g, mateSeed = 1, seeds = 4, ctx) {
  const typ = typeCopies(g)
  const mate = wild(g, 1, 1000 + mateSeed, true, ctx)[0]
  const rng = generator([20, 4, mateSeed])
  return [Array.from({ length: seeds }, () => cross(g, typ, mate, rng)), mate]
}

export const pct = (k, n) => (n ? pyRound((100.0 * k) / n, 1) : 0.0)

// How often each look shows: wild (n pods from the pools), this sheet, a cross (the four-seed forecast of the type with a sample mate), in percent; per expression, the share showing at each life stage.
/** @param {any} g @param {any[]} expressions @param {number} [n] @param {number} [seed] @param {string | null} [docId] */
export function freq(g, expressions, n = 1000, seed = 20, docId = null) {
  const ctx = context(g)
  const [kids] = forecast(g, 1, 4, ctx)
  const groups = { wild: wild(g, n, seed, true, ctx), sheet: sheetCopies(g, docId, 12, 2026, ctx), cross: kids }
  const { by, mods } = ctx
  const out = { n: Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v ? v.length : 0])), loci: {}, expressions: {} }
  const seen = {}
  for (const [k, v] of Object.entries(groups)) if (v && v.length) seen[k] = v.map((c) => looksOf(g, c, ctx))
  for (const [i, e] of Object.entries(by)) {
    if (isModifier(e) || (e.op === 'blend' && !(e.bins && e.bins.length))) continue
    const looks = poolOf(e)
    const rule = ruleOf(mods, e)[0]
    const row = { looks, rule, rule_words: RULE_WORDS[rule], modifiers: (mods[i] ?? []).map((m) => m.locus) }
    for (const [k, vs] of Object.entries(seen)) {
      const cnt = Object.fromEntries(looks.map((a) => [a, 0]))
      cnt.asleep = 0
      for (const v of vs) { const x = v[i]; if (x === null) cnt.asleep += 1; else cnt[x] = (cnt[x] ?? 0) + 1 }
      row[k] = Object.fromEntries(Object.entries(cnt).filter(([a, c]) => c || looks.includes(a)).map(([a, c]) => [a, pct(c, vs.length)]))
    }
    out.loci[i] = row
  }
  for (const x of expressions) {
    const row = { label: x.label || x.id, locus: x.locus, look: x.look, age: x.age?.from ?? null, needs: x.needs ?? [], loud: !!x.loud }
    for (const [k, cs] of Object.entries(groups)) {
      if (!cs || !cs.length) continue
      const looksList = seen[k]
      row[k] = Object.fromEntries(STAGES.map((st) => [st, pct(looksList.filter((lk) => showingFrom(lk, [x], st).length).length, cs.length)]))
    }
    out.expressions[x.id] = row
  }
  return out
}

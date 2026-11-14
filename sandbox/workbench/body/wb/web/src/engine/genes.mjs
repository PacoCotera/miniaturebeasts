// The Python sampler (s20genes.py, genomeapply.py) as the studio runs it in the page: the S20 gene tables, the `seed:N` draws, the type specimen, a drawn mibi as two copies per record of the catalogue, and its resolved creature fields.
// The catalogue is the game's own (framework/catalogue.mjs, the same file the pin is written from); the random streams are numpy's and Python's (numpy-rng.mjs, py-random.mjs), so a draw here is the draw the server makes.
import { LOCI } from '@framework/catalogue.mjs'
import { generator } from './numpy-rng.mjs'
import { npRound, pyRound, pyRoundInt, pyMod } from './pymath.mjs'

export const pinLocus = (id) => LOCI.get(id)
// a named copy's number in the catalogue (expressions._value)
export const pinValue = (record, id) => { const a = pinLocus(record).alleles.find((x) => x.id === id && 'value' in x); if (!a) throw new Error(`${record}: no value for ${id}`); return a.value }

// ---- genomeapply: values and t
export function valueOf(form, lo, hi, t) {
  if (form === 'mult') return t <= 0.5 ? lo ** ((0.5 - t) / 0.5) : hi ** ((t - 0.5) / 0.5)
  if (form === 'off') return t <= 0.5 ? (lo * (0.5 - t)) / 0.5 : (hi * (t - 0.5)) / 0.5
  if (form === 'lin') return lo + (hi - lo) * t
  if (form === 'int') return pyRoundInt(lo + (hi - lo) * t)
  throw new Error(`unknown form ${form}`)
}
export function tOf(form, lo, hi, v) {
  if (form === 'mult') return v <= 1 ? 0.5 - (0.5 * Math.log(v)) / Math.log(lo) : 0.5 + (0.5 * Math.log(v)) / Math.log(hi)
  if (form === 'off') return v === 0 ? 0.5 : v < 0 ? 0.5 - (0.5 * v) / lo : 0.5 + (0.5 * v) / hi
  return (v - lo) / (hi - lo)
}
export const blendMap = (e) => { const b = e.band ?? e.absolute; return [b.form, b.lo, b.hi] }
// t of the type specimen at a blend locus
export function typeT(e) {
  const [f, lo, hi] = blendMap(e)
  return f === 'mult' || f === 'off' ? 0.5 : pyRound(tOf(f, lo, hi, e.type), 9)
}
export const byLocus = (g) => Object.fromEntries(g.loci.map((e) => [e.locus, e]))

// ---- s20genes: the gene tables
// locus: [kind, lo, hi, anchor]
export const GENES = {
  'body.torso-girth': ['mult', 0.95, 1.06, 'body'], 'body.head-size': ['mult', 0.96, 1.05, 'body'], 'body.limb-length': ['mult', 0.9, 1.1, 'body'], 'body.limb-girth': ['mult', 0.94, 1.08, 'body'],
  'growth.exterior-eye-size-ratio': ['mult', 0.92, 1.1, 'face'], 'growth.exterior-eye-height-ratio': ['off', -0.03, 0.03, 'face'], 'growth.exterior-eye-spacing-ratio': ['off', -0.03, 0.03, 'face'],
  'face.mouth-width': ['mult', 0.9, 1.12, 'face'], 'face.mouth-height': ['off', -0.02, 0.02, 'face'], 'movement.cycle-rate': ['mult', 0.85, 1.15, 'face'],
  'body.ear-length': ['mult', 0.8, 1.3, 'ears'], 'body.ear-girth': ['mult', 0.85, 1.2, 'ears'], 'body.ear-splay': ['off', -20.0, 20.0, 'ears'], 'body.ear-droop': ['off', -15.0, 15.0, 'ears'],
  'body.tail-length': ['mult', 0.8, 1.3, 'tail'], 'body.tail-girth': ['mult', 0.8, 1.2, 'tail'], 'body.tail-curl': ['off', -0.03, 0.2, 'tail'], 'body.tail-lift': ['off', -12.0, 12.0, 'tail'], 'body.tip-size': ['mult', 0.85, 1.2, 'tail'],
  'appearance.coat-value': ['mult', 0.8, 1.2, 'coat'], 'appearance.bib-reach': ['off', -0.1, 0.12, 'coat'], 'appearance.glow': ['lin', 0.6, 1.0, 'coat'], 'skin.grain': ['lin', 0.25, 0.45, 'coat'], 'skin.sheen': ['lin', 0.2, 0.4, 'coat'],
  'coat.gradient': ['lin', 0.1, 0.5, 'coat'], 'coat.hue-shift': ['off', -0.06, 0.06, 'coat'], 'coat.fleck': ['lin', 0.2, 0.8, 'coat'], 'coat.freckle-density': ['lin', 0.1, 1.0, 'coat'],
  'coat.freckle-glow': ['lin', 0.5, 1.0, 'coat'], 'coat.bleed': ['lin', 0.3, 0.9, 'coat'], 'coat.rd-scale': ['lin', 0.8, 1.3, 'coat'], 'coat.rd-contrast': ['lin', 0.6, 1.0, 'coat'],
  'coat.rosette': ['lin', 0.0, 1.0, 'coat'], 'coat.bands': ['int', 3, 7, 'coat'], 'coat.mark-size': ['lin', 0.07, 0.12, 'coat'],
  'face.whisker-count': ['int', 0, 3, 'face'], 'face.whisker-length': ['lin', 0.2, 0.45, 'face'], 'face.whisker-droop': ['lin', 0.1, 0.5, 'face'], 'face.whisker-curl': ['lin', 0.0, 0.6, 'face'],
  'appearance.body-hue': ['lin', 180.0, 360.0, 'coat'], 'appearance.glow-hue': ['lin', 60.0, 100.0, 'coat'],
}
// pair-map loci: [alleles, draw weights, the dominance order]
export const PAIRS = {
  'body.ear-family': [['prick', 'lop', 'nub'], [0.4, 0.3, 0.3], ['prick', 'nub', 'lop']],
  'body.tail-tip': [['lantern', 'tuft', 'plain'], [0.75, 0.20, 0.05], ['lantern', 'tuft', 'plain']],
  'appearance.marking-layout': [['plain', 'masked', 'points', 'banded', 'spotted', 'capped'], [0.25, 0.15, 0.15, 0.15, 0.15, 0.15], ['plain', 'masked', 'points', 'banded', 'spotted', 'capped']],
  'coat.rd': [['none', 'spots', 'labyrinth', 'rings'], [0.4, 0.25, 0.2, 0.15], ['none', 'spots', 'labyrinth', 'rings']],
  'coat.mark': [['none', 'heart', 'star'], [0.5, 0.25, 0.25], ['none', 'heart', 'star']],
  'coat.mark-where': [['forehead', 'belly'], [0.7, 0.3], ['forehead', 'belly']],
  'coat.glow-pattern': [['none', 'belly-arcs'], [0.6, 0.4], ['none', 'belly-arcs']],
  'face.expression': [['content', 'open', 'smile'], [0.2, 0.2, 0.6], ['smile', 'content', 'open']],
  'face.whisker-glow': [['off', 'glow'], [0.85, 0.15], ['off', 'glow']],
  'face.fangs': [['none', 'fangs'], [0.75, 0.25], ['none', 'fangs']],
}
export const SWITCHES = { 'face.blush': 0.09, 'coat.brow': 0.25 }
export const RECESSIVE_SWITCHES = ['blush']
export const TYPE_PAIRS = { 'body.ear-family': 'prick', 'body.tail-tip': 'lantern', 'appearance.marking-layout': 'plain', 'coat.rd': 'none', 'coat.mark': 'none', 'coat.mark-where': 'forehead', 'coat.glow-pattern': 'none', 'face.expression': 'smile', 'face.whisker-glow': 'off', 'face.fangs': 'none' }
export const TYPE_COAT_T = { 'coat.gradient': 0.5, 'coat.fleck': 0.5, 'coat.freckle-density': 0.5, 'coat.freckle-glow': 0.8, 'coat.bleed': 0.5 }

// the sampler's ids -> the catalogue's records
export const RECORD = {
  'appearance.body-hue': 'appearance.body-hue', 'appearance.coat-value': 'appearance.body-value', 'coat.gradient': 'appearance.countershade', 'skin.grain': 'appearance.surface-grain',
  'skin.sheen': 'appearance.sheen', 'coat.fleck': 'appearance.fleck', 'appearance.bib-reach': 'appearance.cream-extent', 'coat.rd-scale': 'appearance.pattern-scale',
  'coat.rd-contrast': 'appearance.pattern-contrast', 'coat.rosette': 'appearance.marking-rosette', 'coat.bands': 'appearance.band-count', 'coat.mark-size': 'appearance.emblem-size',
  'coat.freckle-density': 'appearance.freckle-density', 'coat.freckle-glow': 'appearance.freckle-glow', 'appearance.glow': 'appearance.emission-brightness', 'appearance.glow-hue': 'appearance.emission-hue',
  'coat.bleed': 'appearance.lantern-bleed',
  'growth.exterior-eye-size-ratio': 'form.eye-size', 'growth.exterior-eye-height-ratio': 'form.eye-height', 'growth.exterior-eye-spacing-ratio': 'form.eye-spacing',
  'face.mouth-width': 'form.mouth-width', 'face.mouth-height': 'form.mouth-height', 'face.whisker-count': 'form.whisker-count', 'face.whisker-length': 'form.whisker-length',
  'face.whisker-droop': 'form.whisker-droop', 'face.whisker-curl': 'form.whisker-curl',
  'body.ear-length': 'form.ear-length', 'body.ear-girth': 'form.ear-width', 'body.ear-splay': 'form.ear-splay', 'body.ear-droop': 'form.ear-droop',
  'body.head-size': 'form.head', 'body.torso-girth': 'form.torso-girth', 'body.limb-length': 'form.leg-length', 'body.limb-girth': 'form.leg-girth', 'body.tail-length': 'form.tail-length',
  'body.tail-girth': 'form.tail-girth', 'body.tail-curl': 'form.tail-curl', 'body.tail-lift': 'form.tail-carry', 'body.tip-size': 'form.tail-tip-size', 'movement.cycle-rate': 'movement.cycle-rate',
}
export const PAIR_RECORD = { 'body.ear-family': 'form.ear-kind', 'body.tail-tip': 'anatomy.tail-tip-form', 'coat.rd': 'appearance.pattern-kind', 'coat.mark': 'appearance.emblem', 'coat.mark-where': 'appearance.emblem-place', 'coat.glow-pattern': 'appearance.glow-pattern', 'face.expression': 'appearance.mouth-rest' }
export const MARKING_SWITCH = 'appearance.marking-switch', MARKING_LAYOUT = 'appearance.marking-layout'
export const PAIR_SWITCH = { 'face.fangs': ['anatomy.fang-presence', 'none', 'fangs'], 'face.whisker-glow': ['appearance.whisker-glow', 'off', 'glow'] }
export const SWITCH_RECORD = { blush: ['face.blush', 'appearance.blush'], brow: ['coat.brow', 'anatomy.brow-tuft-presence'] }
export const WHISKER_SWITCH = 'anatomy.whisker-presence'
export const FOLDED = 'coat.hue-shift'
export const LAYOUT_ALLELE = { banded: 'bands' }
const ABSOLUTE = ['movement.cycle-rate', 'skin.sheen', 'appearance.glow']
export const SAMPLER_OF = { ...Object.fromEntries(Object.entries(RECORD).map(([k, v]) => [v, k])), ...Object.fromEntries(Object.entries(PAIR_RECORD).map(([k, v]) => [v, k])) }

export const GRID = 59
const ABS_RANGE = { 'movement.cycle-rate': [0.6, 1.4], 'skin.sheen': [0.0, 1.0], 'appearance.glow': [0.4, 1.0] }
const HUE_STEP = { 2: 44, 3: 47, 4: 59, 5: 53, 6: 12, 7: 36, 8: 25, 9: 0, 10: 4, 11: 17, 12: 20 }
const EARS = ['lop', 'nub', 'prick']
const TIPS = ['lantern', 'lantern', 'tuft', 'lantern', 'lantern', 'plain', 'lantern', 'lantern', 'tuft', 'lantern', 'lantern']
export const LOUD = ['glow', 'pattern', 'emblem', 'brow']

export function resolveLocus(name, t, G = GENES) {
  const [kind, lo, hi] = G[name]
  return valueOf(kind, lo, hi, t)
}

export function gridT(t) {
  const k = Math.min(Math.max(pyRoundInt(t * GRID), 0), GRID)
  const g = pyRound(k / GRID, 6)
  return Math.abs(t - 0.5) <= Math.abs(t - g) ? 0.5 : g
}
function gridAbs(name, t, G = GENES) {
  if (Math.abs(t - 0.5) < 1e-9 && name === 'movement.cycle-rate') return t
  const [f, lo, hi] = G[name]
  const [cLo, cHi] = ABS_RANGE[name]
  const step = (cHi - cLo) / GRID
  const v0 = resolveLocus(name, 0.0, G), v1 = resolveLocus(name, 1.0, G), v = resolveLocus(name, t, G)
  let k = pyRoundInt((v - cLo) / step)
  k = Math.min(Math.max(k, Math.ceil((Math.min(v0, v1) - cLo) / step - 1e-9)), Math.floor((Math.max(v0, v1) - cLo) / step + 1e-9))
  return pyRound(tOf(f, lo, hi, pyRound(cLo + k * step, 6)), 9)
}
function toGrid(t) {
  for (const k of Object.keys(t)) if (k !== FOLDED) t[k] = k in ABS_RANGE ? gridAbs(k, t[k]) : gridT(t[k])
  return t
}

export function specimen() {
  const t = Object.fromEntries(Object.keys(GENES).map((k) => [k, 0.5]))
  Object.assign(t, TYPE_COAT_T)
  t['appearance.glow'] = 0.8
  t['face.whisker-count'] = 0.0
  t['appearance.body-hue'] = 0.5; t['appearance.glow-hue'] = 0.5
  t['skin.grain'] = 0.5; t['skin.sheen'] = 0.5
  t['coat.bands'] = 0.5; t['coat.mark-size'] = 0.5; t['coat.rd-scale'] = 0.5; t['coat.rd-contrast'] = 0.5; t['coat.rosette'] = 0.0
  toGrid(t)
  return { t, pairs: Object.fromEntries(Object.entries(TYPE_PAIRS).map(([k, v]) => [k, [v, v]])), switches: { blush: false, brow: false }, seed: 20 }
}

export const phenotype = (name, pair) => { const dom = PAIRS[name][2]; return pair.reduce((a, b) => (dom.indexOf(b) < dom.indexOf(a) ? b : a)) }

export function loudGenes(ind) {
  const ph = Object.fromEntries(Object.keys(PAIRS).map((k) => [k, phenotype(k, ind.pairs[k])]))
  const out = []
  if (ph['coat.glow-pattern'] !== 'none') out.push('glow')
  if (ph['coat.rd'] !== 'none' || ['banded', 'spotted', 'capped'].includes(ph['appearance.marking-layout'])) out.push('pattern')
  if (ph['coat.mark'] !== 'none') out.push('emblem')
  if (ind.switches.brow) out.push('brow')
  return out
}
export function limitLoud(ind) {
  for (const g of loudGenes(ind).slice(2)) {
    if (g === 'glow') ind.pairs['coat.glow-pattern'] = ['none', 'none']
    else if (g === 'pattern') { ind.pairs['coat.rd'] = ['none', 'none']; ind.pairs['appearance.marking-layout'] = ['plain', 'plain'] }
    else if (g === 'emblem') ind.pairs['coat.mark'] = ['none', 'none']
    else ind.switches.brow = false
  }
  return ind
}

// Individual i of the variety sheet (seed0 is the sheet's seed): 1 is the type specimen.
export function draw(i, seed0 = 2026) {
  if (i === 1) return specimen()
  const rng = generator([seed0, i])
  const t = {}
  for (const [k, [, , , anchor]] of Object.entries(GENES)) t[k] = anchor === 'body' || anchor === 'face' ? npRound(0.5 + (rng.random() - 0.5) * 0.7, 3) : npRound(rng.random(), 3)
  const pairs = {}
  for (const [k, [al, w]] of Object.entries(PAIRS)) pairs[k] = [rng.choiceP(al, w, false), rng.choiceP(al, w, false)]
  pairs['body.ear-family'] = [EARS[pyMod(i - 2, 3)], EARS[pyMod(i - 2, 3)]]
  t['appearance.body-hue'] = npRound(pyMod(270.0 + 30.0 * (i - 1) + 14.0 * (rng.random() - 0.5), 360.0) / 360.0, 3)
  const tipk = TIPS[pyMod(i - 2, TIPS.length)]
  pairs['body.tail-tip'] = tipk !== 'lantern' ? [tipk, tipk] : ['lantern', ['lantern', 'tuft', 'plain'][rng.integers(3)]]
  pairs['coat.glow-pattern'] = Array(2).fill(['none', 'belly-arcs', 'none'][pyMod(i - 1, 3)])
  pairs['face.expression'] = i === 4 || i === 9 ? ['open', 'open'] : ['smile', 'smile']
  t['face.whisker-count'] = i !== 1 ? [0.0, 0.4, 0.7, 1.0][pyMod(i - 1, 4)] : 0.0
  pairs['face.whisker-glow'] = i === 6 ? ['glow', 'glow'] : ['off', 'off']
  pairs['face.fangs'] = [3, 8, 11].includes(i) ? ['fangs', 'fangs'] : ['none', 'none']
  const blush = rng.random() < SWITCHES['face.blush']
  const brow = rng.random() < SWITCHES['coat.brow']
  if (i in HUE_STEP) t['appearance.body-hue'] = HUE_STEP[i] / GRID
  t['coat.hue-shift'] = 0.5
  t['appearance.glow-hue'] = pyRound(0.25 + 0.5 * t['appearance.glow-hue'], 6)
  toGrid(t)
  const seed = 1 + rng.integersRange(10 ** 6 - 1 - 1)
  return limitLoud({ t, pairs, switches: { blush, brow }, seed })
}

// The adapter: an individual as the sampler draws it -> two copies of every record of the catalogue.
export function genomeOf(ind) {
  if (ind.copies) return Object.fromEntries(Object.entries(ind.copies).map(([k, v]) => [k, [...v]]))
  const G = GENES
  const out = {}
  const tCopy = (record, t) => {
    t = pyRound(Number(t), 6)
    const named = new Map(pinLocus(record).alleles.filter((a) => 'value' in a).map((a) => [a.value, a.id]))
    return named.has(t) ? named.get(t) : t
  }
  const put = (record, value) => { out[record] = [value, value] }
  for (const [old, neu] of Object.entries(RECORD)) {
    let t = ind.t[old]
    if (old === 'appearance.body-hue' && FOLDED in ind.t) {
      const [, lo_, hi_] = G[old]
      const shift = 360.0 * resolveLocus(FOLDED, ind.t[FOLDED], G)
      t = Math.min(Math.max((resolveLocus(old, t, G) + shift - lo_) / (hi_ - lo_), 0.0), 1.0)
    }
    if (ABSOLUTE.includes(old)) {
      const [f, lo, hi] = G[old]
      const v = pyRound(valueOf(f, lo, hi, t), 6)
      if (neu === 'movement.cycle-rate' && v === 1.0) out[neu] = ['low', 'high']
      else put(neu, v)
    } else put(neu, tCopy(neu, t))
  }
  const none = pyRoundInt(valueOf(...G['face.whisker-count'].slice(0, 3), ind.t['face.whisker-count'])) < 1
  put(WHISKER_SWITCH, none ? 'off' : 'on')
  if (none) for (const r of ['form.whisker-count', 'form.whisker-length', 'form.whisker-droop', 'form.whisker-curl']) put(r, 'between')
  for (const [old, neu] of Object.entries(PAIR_RECORD)) out[neu] = [...ind.pairs[old]]
  const lay = [...ind.pairs['appearance.marking-layout']]
  const shown = lay.filter((a) => a !== 'plain').map((a) => LAYOUT_ALLELE[a] ?? a)
  out[MARKING_SWITCH] = lay.includes('plain') ? ['off', 'off'] : ['on', 'on']
  out[MARKING_LAYOUT] = lay.map((a) => (a !== 'plain' ? LAYOUT_ALLELE[a] ?? a : shown.length ? shown[0] : 'bands'))
  for (const [old, [neu, , aOn]] of Object.entries(PAIR_SWITCH)) out[neu] = ind.pairs[old].map((a) => (a === aOn ? 'on' : 'off'))
  for (const [key, [, neu]] of Object.entries(SWITCH_RECORD)) out[neu] = ind.switches[key] ? ['on', 'on'] : ['off', 'off']
  return out
}

const canon = (o) => (typeof o === 'number' ? (Number.isInteger(o) ? o : pyRound(o, 6)) : Array.isArray(o) ? o.map(canon) : o && typeof o === 'object' ? Object.fromEntries(Object.keys(o).sort().map((k) => [k, canon(o[k])])) : o)

// creature.json's shape and coat: every number resolved (canonical, 1e-6).
export function creature(ind) {
  const G = { ...GENES }
  const v = Object.fromEntries(Object.keys(G).map((k) => [k, resolveLocus(k, ind.t[k], G)]))
  const ph = Object.fromEntries(Object.keys(PAIRS).map((k) => [k, phenotype(k, ind.pairs[k])]))
  if (v['body.head-size'] < 0.97 * v['body.torso-girth']) v['body.head-size'] = 0.97 * v['body.torso-girth']
  return canon({
    shape: { torsoGirth: v['body.torso-girth'], headSize: v['body.head-size'], legLen: v['body.limb-length'], legGirth: v['body.limb-girth'], ear: ph['body.ear-family'], earLen: v['body.ear-length'], earGirth: v['body.ear-girth'], splay: v['body.ear-splay'], droop: v['body.ear-droop'], tailLen: v['body.tail-length'], tailGirth: v['body.tail-girth'], curl: v['body.tail-curl'], lift: v['body.tail-lift'], tip: ph['body.tail-tip'], tipSize: v['body.tip-size'] },
    coat: {
      glow_pattern: ph['coat.glow-pattern'], expression: ph['face.expression'], hue: v['appearance.body-hue'], glow_hue: v['appearance.glow-hue'], layout: ph['appearance.marking-layout'], coat_value: v['appearance.coat-value'], belly_reach: v['appearance.bib-reach'], glow: v['appearance.glow'],
      grain: v['skin.grain'], sheen: v['skin.sheen'], gradient: v['coat.gradient'], hue_shift: v['coat.hue-shift'], fleck: v['coat.fleck'], freckle_density: v['coat.freckle-density'], freckle_glow: v['coat.freckle-glow'], bleed: v['coat.bleed'], rd: ph['coat.rd'], rd_scale: v['coat.rd-scale'], rd_contrast: v['coat.rd-contrast'],
      rosette: ph['appearance.marking-layout'] === 'spotted' ? v['coat.rosette'] : 0.0, bands: v['coat.bands'], brow: ind.switches.brow ? 1.0 : 0.0, mark: ph['coat.mark'], mark_where: ph['coat.mark-where'], mark_size: v['coat.mark-size'], blush: !!ind.switches.blush,
      eye_size: v['growth.exterior-eye-size-ratio'], eye_height: v['growth.exterior-eye-height-ratio'], eye_spacing: v['growth.exterior-eye-spacing-ratio'], mouth_width: v['face.mouth-width'], mouth_z: v['face.mouth-height'], seed: Math.trunc(ind.seed),
    },
  })
}
// the hue window where a cream belly would read as the fire-tailed starter (s20coat.WARM_BELLY)
export const WARM_BELLY = [10.0, 35.0]
export const hueWindow = (h) => { const m = pyMod(h, 360.0); return WARM_BELLY[0] <= m && m <= WARM_BELLY[1] }

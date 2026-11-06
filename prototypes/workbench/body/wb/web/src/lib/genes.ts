import type { CheckRow, Proof } from './checks'

// The genome block of a species file (spec 4.1 and 8.2) and what Genes mode says about it. Pure, so it is tested alone.
export type Band = { form: 'mult' | 'off' | 'lin' | 'int'; lo: number; hi: number; unit: string }
// One record of the catalogue pin (pin 11). A position record carries `band` (what t stands for in this species); an absolute record (its copy is the record's own number) carries `absolute`, the pool its type was drawn from.
// A sleeping record names the switches it needs (`requires`) or the looks that wake it (`wakesWhen`: record -> looks).
export type Locus = {
  locus: string; label: string; short: string; chapter: string; scope: 'trunk' | 'branch'; kind: string; op: 'blend' | 'switch' | 'pair-map' | 'pigment'; operator?: string; borrowed?: string
  band?: Band; absolute?: Band; range?: [number, number]; limits?: (string | boolean)[]; type: number | string; bins?: string[]; order?: string[]; moves: unknown[]; consumer?: string
  requires?: string[]; wakesWhen?: Record<string, string[]>; loud?: string; shapeable?: boolean; weight?: number
  modifier?: { of: string; show: string; order?: string[] }
}
export type Genome = { catalogue: { id: string; version: number; digest?: string }; clan?: string; borrows?: string[]; chapters: { id: string; name: string }[]; loci: Locus[] }
export const bandOf = (l: Locus): Band | null => l.band ?? l.absolute ?? null
export const unitOf = (l: Locus) => bandOf(l)?.unit
export type EndFail = { id: string; fail: string | null; measure: string | null; value: number | string | null; limit: number | string | null }
export type End = { id: string; locus: string | null; end: 'low' | 'high' | 'allele' | 'corner'; genome: string; value: number | string; label: string; state: 'pass' | 'fail'; fails: EndFail[]; unit?: string; fix?: { value: number; path: string; end: 'low' | 'high' } | null; proof?: Proof; cage: string }
export type ExtremesState = { fresh: boolean; running: boolean; ends: End[] | null; rows: CheckRow[] | null; key: string; at?: number | null }
export const failingEnds = (x: ExtremesState | null | undefined) => (x?.ends ?? []).filter((e) => e.state === 'fail')
export const runTime = (at: number | null | undefined) => (at ? new Date(at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'an earlier run')

export const locusById = (g: Genome | undefined, id: string | null) => g?.loci.find((l) => l.locus === id) ?? null

// The selection in Genes mode: a locus id; the tail from Shape takes the tail length; a chapter name takes that chapter's first locus; nothing takes the first of the legs & tail chapter, else of the first.
export function selectedLocus(g: Genome | undefined, sel: string | null): Locus | null {
  if (!g) return null
  const hit = locusById(g, sel?.split('=')[0] ?? null) // a look picked in Variety is `locus=look`
  if (hit) return hit
  if (sel === 'tail') return locusById(g, 'form.tail-length') ?? g.loci[0] ?? null
  const ch = g.chapters.find((c) => c.id === sel) ?? g.chapters.find((c) => c.id === 'legs-tail') ?? g.chapters[0]
  return g.loci.find((l) => l.chapter === ch?.id) ?? g.loci[0] ?? null
}

export const unitText = (v: number | string, unit?: string) => (typeof v !== 'number' ? String(v) : `${Number.isInteger(v) && !unit ? v : fmt(v)}${!unit ? '' : unit === '×' || unit === '°' ? unit : ' ' + unit}`)
export const fmt = (v: number) => (Math.round(v * 100) / 100).toFixed(2)
export const fmtInt = (l: Locus, v: number) => (bandOf(l)?.form === 'int' ? String(v) : fmt(v))

// Which of a blend's named looks a value falls in: the limits cut into as many equal parts as there are names.
export function binIndex(l: Locus, v: number): number {
  const { lo, hi } = bandOf(l)!
  const n = l.bins?.length ?? 0
  if (!n || hi <= lo) return -1
  return Math.max(0, Math.min(n - 1, Math.floor(((v - lo) / (hi - lo)) * n)))
}

// The ends the stage shows round the type: a blend's low and high limit; for a pair or a switch the first two alleles that are not the type.
export function stageEnds(l: Locus): { genome: string; value: number | string; caption: string }[] {
  if (l.op === 'blend') { const { lo, hi } = bandOf(l)!; return [{ genome: `low:${l.locus}`, value: lo, caption: 'low' }, { genome: `high:${l.locus}`, value: hi, caption: 'high' }] }
  return (l.limits as string[]).filter((a) => a !== l.type).slice(0, 2).map((a) => ({ genome: `allele:${l.locus}=${a}`, value: a, caption: 'look' }))
}

export const endsOf = (x: ExtremesState | null | undefined, locus: string) => (x?.ends ?? []).filter((e) => e.locus === locus)
export type Dot = 'fail' | 'pass' | 'stale' | null
// The dot beside a locus in the navigator: red when an end fails, grey ring when the file has moved on since the ends were built, none until they have been.
export function locusDot(x: ExtremesState | null | undefined, locus: string): Dot {
  const es = endsOf(x, locus)
  if (!x?.ends || !es.length) return null
  if (!x.fresh) return 'stale'
  return es.some((e) => e.state === 'fail') ? 'fail' : null
}
export const endDot = (x: ExtremesState | null | undefined, e: { genome: string }, locus: string): Dot => {
  const hit = endsOf(x, locus).find((n) => n.genome === e.genome)
  return !hit ? null : !x?.fresh ? 'stale' : hit.state === 'fail' ? 'fail' : 'pass'
}

// words.md ck.limits: "{trait} fails at its {low/high} end"; the measure goes under it, and the fix it computed (the highest passing value).
export const endLine = (l: Locus, e: End) => (e.end === 'low' || e.end === 'high' ? `${l.label} fails at its ${e.end} end` : `${l.label} fails with ${e.value}`)
export const endMeasure = (e: End) => {
  const f = e.fails[0]
  const at = typeof e.value === 'number' ? `At ${unitText(e.value, e.unit)}` : `With ${e.value}`
  return `${at}: ${f?.fail ?? f?.id ?? 'a check fails'}${f?.measure ? ` (${f.measure})` : ''}.${e.fix ? ` Passes up to ${unitText(e.fix.value, e.unit)}.` : ''}`
}

// The JSON pointer a computed fix writes to: genome.loci.<locus>.<band|absolute>.<lo|hi>.
export function fixPointer(g: Genome, fix: { path: string }): string | null {
  const m = /^genome\.loci\.(.+)\.(band|absolute)\.(lo|hi)$/.exec(fix.path)
  const i = m ? g.loci.findIndex((l) => l.locus === m[1]) : -1
  return i < 0 ? null : `/genome/loci/${i}/${m![2]}/${m![3]}`
}

// How the catalogue says two copies show (words.md: One is enough, Needs both, Mixes).
export const COPY_RULE: Record<string, string> = { 'copy-mean': 'Mixes', 'pair-map': 'Needs both', 'dominant-enable': 'One is enough', 'partition-map': 'Mixes' }
export const copyRule = (l: Locus) => (l.op === 'switch' && l.operator === 'recessive-enable' ? 'Needs both' : COPY_RULE[l.operator ?? (l.op === 'pair-map' ? 'pair-map' : l.op === 'switch' ? 'dominant-enable' : 'copy-mean')])

// The range bar's positions, in percent of the range.
export function rangeBar(l: Locus) {
  const { lo, hi } = bandOf(l)!, [r0, r1] = l.range ?? [lo, hi]
  const pos = (v: number) => Math.round(((v - r0) / (r1 - r0)) * 1000) / 10
  return { r0, r1, lo, hi, band: [pos(lo), pos(hi)] as [number, number], mark: pos(l.type as number) }
}

// The failing end whose proof is on the stage: the one the URL names, else the first that fails (the mock shows it by default); `proof=none` puts the clay back.
export function proofEnd(x: ExtremesState | null | undefined, locus: string, param: string | null): End | null {
  if (!param || param === 'none') return null
  const bad = endsOf(x, locus).filter((e) => e.state === 'fail' && e.proof?.ready)
  return bad.find((e) => e.id === param) ?? null          // on demand: the failing end keeps its clay until "Show proof" names it
}

// The camera a locus is judged from: the part it moves, seen from where it shows. The house camera is fixed, so a view is an azimuth and a crop of the 608 render (zoom about a point, in percent of the tile).
export type StageView = { az: number; zoom: { s: number; ox: number; oy: number }; part: string }
export function stageView(l: Locus): StageView {
  const id = l.locus
  if (/tail-/.test(id)) return { az: 90, zoom: { s: 1.4, ox: 62, oy: 60 }, part: 'tail, from the side' }
  if (/ear-/.test(id)) return { az: 0, zoom: { s: 1.9, ox: 50, oy: 24 }, part: 'ears, from the front' }
  if (l.chapter === 'face') return { az: 0, zoom: { s: 2.0, ox: 50, oy: 27 }, part: 'face, from the front' }
  if (/leg-/.test(id)) return { az: 90, zoom: { s: 1.5, ox: 50, oy: 78 }, part: 'legs, from the side' }
  return { az: 32, zoom: { s: 1.3, ox: 50, oy: 50 }, part: 'whole body' }
}

// A sleeping record is carried and crossed all the same; only its drawing waits. At the type it is asleep unless the switch it needs is on, or the shown look of a record it names is one of the looks that wake it
// (a record that is itself asleep shows nothing and wakes nothing). Studio voice; no string for this is in words.md yet (listed for the copywriter in the W7 notes).
const lookWord = (a: string) => a.replace(/-/g, ' ')
export const labelOf = (g: Genome, id: string) => locusById(g, id)?.label ?? id
export function isAsleep(g: Genome, l: Locus, seen: string[] = []): boolean {
  if (l.kind !== 'sleeping' || seen.includes(l.locus)) return false
  const shown = (id: string) => { const o = locusById(g, id); return !o || isAsleep(g, o, [...seen, l.locus]) ? undefined : String(o.type) }
  if (l.requires?.some((r) => shown(r) !== 'on')) return true
  return !!l.wakesWhen && !Object.entries(l.wakesWhen).some(([id, looks]) => { const v = shown(id); return v !== undefined && looks.includes(v) })
}
export function wakeLine(g: Genome, l: Locus): { asleep: boolean; head: string; line: string } | null {
  if (l.kind !== 'sleeping') return null
  const asleep = isAsleep(g, l)
  const cond = [
    ...(l.requires ?? []).map((r) => `${labelOf(g, r)} is on`),
    ...(l.wakesWhen ? [Object.entries(l.wakesWhen).map(([id, looks]) => `${labelOf(g, id)} shows ${looks.map(lookWord).join(' or ')}`).join(', or ')] : []),
  ].join(' and ')
  return { asleep, head: asleep ? 'Asleep at the type' : 'Awake at the type', line: asleep ? `Wakes when ${cond}.` : `Sleeps unless ${cond}.` }
}


// ---- chapter 9: expressions, how often, modifiers, the genome string.
export type Stage = 'juvenile' | 'adult' | 'elder'
export const STAGES: { id: Stage; word: string }[] = [{ id: 'juvenile', word: 'Young' }, { id: 'adult', word: 'Grown' }, { id: 'elder', word: 'Elder' }]
export type Need = { locus: string; is?: string; in?: string[] }
export type Expression = { id: string; label?: string; locus: string; look: string; age?: { from: Stage; grow?: number }; needs?: Need[]; loud?: boolean; art?: Stage[] }
export type Group = Record<string, number>
export type LocusFreq = { looks: string[]; rule: string; rule_words: string; modifiers: string[]; wild: Group; sheet?: Group; cross?: Group }
export type ExprFreq = { label: string; locus: string; look: string; age: Stage | null; needs: Need[]; loud: boolean; wild: Record<Stage, number>; sheet?: Record<Stage, number>; cross?: Record<Stage, number> }
export type Freq = { species: string; n: { wild: number; sheet: number; cross: number }; loci: Record<string, LocusFreq>; expressions: Record<string, ExprFreq> }
export const GROUPS = [{ id: 'wild', word: 'Wild' }, { id: 'sheet', word: 'Sheet' }, { id: 'cross', word: 'Cross' }] as const
export const pct = (v: number) => (v >= 10 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(1)) + '%'

// words.md: an age is "from age · grown". The stage ids are the game's (juvenile, adult, elder); the words are the player's.
export const stageWord = (s: Stage) => STAGES.find((x) => x.id === s)!.word.toLowerCase()
export const ageLine = (x: Expression) => (x.age ? `From age · ${stageWord(x.age.from)}` : null)
export const needLine = (g: Genome, x: Expression) =>
  x.needs?.length ? `Needs · ${x.needs.map((n) => `${labelOf(g, n.locus)} shows ${n.is ?? n.in!.join(' or ')}`).join(' and ')}` : null
export const expressionsOf = (xs: Expression[] | undefined, locus: string) => (xs ?? []).filter((x) => x.locus === locus)
export const modifiersOf = (g: Genome, locus: string) => g.loci.filter((m) => m.modifier?.of === locus)
export const isModifier = (l: Locus) => !!l.modifier
export const orderLine = (order: string[] | undefined) => (order ?? []).join(' over ')

// How a locus's looks split in a group: one segment per look (and the asleep share), widths in percent. A look with nothing shows no segment.
export function barSegments(f: LocusFreq | undefined, group: 'wild' | 'sheet' | 'cross'): { look: string; pct: number; tone: number }[] {
  const g = f?.[group]
  if (!g || !f) return []
  return [...f.looks, 'asleep'].map((look, i) => ({ look, pct: g[look] ?? 0, tone: look === 'asleep' ? -1 : i })).filter((x) => x.pct > 0)
}

// A modifier gene a species may add to a shared locus (owner ruling 1): a pair map is given a new first look, a switch the other copy rule. The id begins `mod.`, the gene is a switch that one copy turns on.
export function newModifier(g: Genome, l: Locus, pick: string): Locus | null {
  if (l.op === 'blend' || l.modifier) return null
  const slug = l.locus.split('.').pop()!
  const id = `mod.${slug}-${l.op === 'pair-map' ? 'order' : 'rule'}`
  if (g.loci.some((o) => o.locus === id)) return null
  const mod: Locus['modifier'] = l.op === 'pair-map'
    ? { of: l.locus, show: 'first-ranked', order: [pick, ...(l.order ?? (l.limits as string[])).map(String).filter((a) => a !== pick)] }
    : { of: l.locus, show: l.operator === 'recessive-enable' ? 'dominant' : 'recessive' }
  return {
    locus: id, label: `${l.label} ${l.op === 'pair-map' ? 'order' : 'rule'}`, short: l.short, chapter: l.chapter, scope: 'modifier' as 'trunk', kind: 'heritable-look', op: 'switch', operator: 'dominant-enable', limits: ['off', 'on'], type: 'off',
    moves: [], consumer: 'the cross: a carrier shows ' + l.label + ' by this gene\'s rule', shapeable: true, weight: 0.25, modifier: mod,
  } as Locus
}
export const modifierLine = (g: Genome, m: Locus) => {
  const t = locusById(g, m.modifier!.of)
  return m.modifier!.show === 'first-ranked' ? `${t?.label ?? m.modifier!.of}: ${orderLine(m.modifier!.order)}` : `${t?.label ?? m.modifier!.of}: ${m.modifier!.show === 'recessive' ? 'Needs both' : 'One is enough'}`
}

// The genome string in groups of five, as it is read aloud; the reader ignores the spaces.
export const grouped = (s: string) => { const m = /^(G\d+-S\d+v\d+-)(.*)$/i.exec(s); return m ? `${m[1]} ${m[2].replace(/(.{5})/g, '$1 ').trim()}` : s }

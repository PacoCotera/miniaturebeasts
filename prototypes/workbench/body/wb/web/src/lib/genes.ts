import type { CheckRow, Proof } from './checks'

// The genome block of a species file (spec 4.1 and 8.2) and what Genes mode says about it. Pure, so it is tested alone.
export type Locus = {
  locus: string; label: string; short: string; chapter: string; scope: 'shared' | 'own'; kind: string; op: 'blend' | 'switch' | 'pair-map' | 'pigment'
  form?: 'mult' | 'off' | 'lin' | 'int'; unit?: string; range?: [number, number]; limits: (number | string | boolean)[]; type: number | string; bins?: string[]; order?: string[]; moves: unknown[]; consumer?: string
  catalogue?: { range: [number, number]; type: number; operator?: string }; pin_note?: string; loud?: string; shapeable?: boolean
}
export type Genome = { catalogue: { id: string; version: number }; chapters: { id: string; name: string }[]; loci: Locus[] }
export type EndFail = { id: string; fail: string | null; measure: string | null; value: number | string | null; limit: number | string | null }
export type End = { id: string; locus: string | null; end: 'low' | 'high' | 'allele' | 'corner'; genome: string; value: number | string; label: string; state: 'pass' | 'fail'; fails: EndFail[]; unit?: string; fix?: { value: number; path: string; end: 'low' | 'high' } | null; proof?: Proof; cage: string }
export type ExtremesState = { fresh: boolean; running: boolean; ends: End[] | null; rows: CheckRow[] | null; key: string }

export const locusById = (g: Genome | undefined, id: string | null) => g?.loci.find((l) => l.locus === id) ?? null

// The selection in Genes mode: a locus id; a part or chapter name from Shape (the tail becomes the tail genes) takes that chapter's first locus; nothing takes the first of the tail chapter, else of the first.
export function selectedLocus(g: Genome | undefined, sel: string | null): Locus | null {
  if (!g) return null
  const hit = locusById(g, sel)
  if (hit) return hit
  const ch = g.chapters.find((c) => c.id === sel) ?? g.chapters.find((c) => c.id === 'tail') ?? g.chapters[0]
  return g.loci.find((l) => l.chapter === ch?.id) ?? g.loci[0] ?? null
}

export const unitText = (v: number | string, unit?: string) => (typeof v !== 'number' ? String(v) : `${Number.isInteger(v) && !unit ? v : fmt(v)}${!unit ? '' : unit === '×' || unit === '°' ? unit : ' ' + unit}`)
export const fmt = (v: number) => (Math.round(v * 100) / 100).toFixed(2)
export const fmtInt = (l: { form?: string }, v: number) => (l.form === 'int' ? String(v) : fmt(v))

// Which of a blend's named looks a value falls in: the limits cut into as many equal parts as there are names.
export function binIndex(l: Locus, v: number): number {
  const [lo, hi] = l.limits as number[]
  const n = l.bins?.length ?? 0
  if (!n || hi <= lo) return -1
  return Math.max(0, Math.min(n - 1, Math.floor(((v - lo) / (hi - lo)) * n)))
}

// The ends the stage shows round the type: a blend's low and high limit; for a pair or a switch the first two alleles that are not the type.
export function stageEnds(l: Locus): { genome: string; value: number | string; caption: string }[] {
  if (l.op === 'blend') { const [lo, hi] = l.limits as number[]; return [{ genome: `low:${l.locus}`, value: lo, caption: 'low' }, { genome: `high:${l.locus}`, value: hi, caption: 'high' }] }
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

// The JSON pointer a computed fix writes to: genome.loci.<locus>.limits.<0|1>.
export function fixPointer(g: Genome, fix: { path: string }): string | null {
  const m = /^genome\.loci\.(.+)\.limits\.([01])$/.exec(fix.path)
  const i = m ? g.loci.findIndex((l) => l.locus === m[1]) : -1
  return i < 0 ? null : `/genome/loci/${i}/limits/${m![2]}`
}

// How the catalogue says two copies show (words.md: One is enough, Needs both, Mixes).
export const COPY_RULE: Record<string, string> = { 'copy-mean': 'Mixes', 'pair-map': 'Needs both', 'dominant-enable': 'One is enough', 'partition-map': 'Mixes' }
export const copyRule = (l: Locus) => COPY_RULE[l.catalogue?.operator ?? (l.op === 'pair-map' ? 'pair-map' : l.op === 'switch' ? 'dominant-enable' : 'copy-mean')]

// The range bar's positions, in percent of the range.
export function rangeBar(l: Locus) {
  const [r0, r1] = l.range ?? (l.limits as number[]), [lo, hi] = l.limits as number[]
  const pos = (v: number) => Math.round(((v - r0) / (r1 - r0)) * 1000) / 10
  return { r0, r1, lo, hi, band: [pos(lo), pos(hi)] as [number, number], mark: pos(l.type as number) }
}

// The failing end whose proof is on the stage: the one the URL names, else the first that fails (the mock shows it by default); `proof=none` puts the clay back.
export function proofEnd(x: ExtremesState | null | undefined, locus: string, param: string | null): End | null {
  if (param === 'none') return null
  const bad = endsOf(x, locus).filter((e) => e.state === 'fail' && e.proof?.ready)
  return bad.find((e) => e.id === param) ?? bad[0] ?? null
}

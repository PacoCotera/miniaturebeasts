import { describe, expect, it } from 'vitest'
import { isAsleep, wakeLine, stageView, binIndex, proofEnd, endLine, endMeasure, fixPointer, locusDot, rangeBar, selectedLocus, stageEnds, unitText, ageLine, needLine, barSegments, expressionsOf, grouped, modifiersOf, newModifier, modifierLine, pct, type Expression, type LocusFreq, type End, type ExtremesState, type Genome, type Locus } from './genes'

const tail: Locus = { locus: 'form.tail-length', label: 'Tail length', short: 'Length', chapter: 'legs-tail', scope: 'trunk', kind: 'heritable-look', op: 'blend', band: { form: 'mult', lo: 0.8, hi: 1.3, unit: '×' }, range: [0.5, 2], type: 1, bins: ['short', 'between', 'long'], moves: [] }
const eye: Locus = { ...tail, locus: 'form.eye-size', label: 'Eye size', short: 'Eye size', chapter: 'face', band: { form: 'mult', lo: 0.92, hi: 1.1, unit: '×' }, bins: ['small', 'between', 'large'] }
const tip: Locus = { ...tail, locus: 'anatomy.tail-tip-form', op: 'pair-map', band: undefined, limits: ['plain', 'tuft', 'lantern'], type: 'lantern', bins: undefined }
const whiskers: Locus = { ...tail, locus: 'anatomy.whisker-presence', label: 'Whiskers', short: 'Whiskers', chapter: 'face', op: 'switch', operator: 'dominant-enable', band: undefined, limits: ['off', 'on'], type: 'off', bins: undefined }
const whiskerLength: Locus = { ...eye, locus: 'form.whisker-length', label: 'Whisker length', kind: 'sleeping', requires: ['anatomy.whisker-presence'] }
const layout: Locus = { ...tip, locus: 'appearance.marking-layout', label: 'Marking layout', kind: 'sleeping', requires: ['appearance.marking-switch'], limits: ['bands', 'spotted'], type: 'bands' }
const marks: Locus = { ...whiskers, locus: 'appearance.marking-switch', label: 'Marking switch', type: 'off' }
const rosette: Locus = { ...eye, locus: 'appearance.marking-rosette', label: 'Rosette', kind: 'sleeping', wakesWhen: { 'appearance.marking-layout': ['spotted'] } }
const g: Genome = { catalogue: { id: 'mb-genome-framework', version: 11 }, chapters: [{ id: 'shape', name: 'Shape' }, { id: 'face', name: 'Face' }, { id: 'legs-tail', name: 'Legs & tail' }], loci: [{ ...tail, locus: 'form.torso-girth', chapter: 'shape' }, tail, tip, eye, whiskers, whiskerLength, marks, layout, rosette] }
const end = (o: Partial<End>): End => ({ id: 'x', locus: 'form.tail-length', end: 'high', genome: 'high:form.tail-length', value: 1.3, label: 'Tail length', state: 'fail', fails: [{ id: 'normals', fail: 'Sharp crease in leg.L', measure: '24 visible edges over 20°', value: 24, limit: 0 }], unit: '×', cage: 'c', fix: { value: 1.19, path: 'genome.loci.form.tail-length.band.hi', end: 'high' }, ...o })
const ext = (fresh: boolean, ends: End[]): ExtremesState => ({ fresh, running: false, ends, rows: [], key: 'k' })

describe('genes', () => {
  it('takes the tail chapter for a part from Shape, and a locus as it is', () => {
    expect(selectedLocus(g, 'tail')?.locus).toBe('form.tail-length')
    expect(selectedLocus(g, 'face')?.locus).toBe('form.eye-size')
    expect(selectedLocus(g, 'anatomy.tail-tip-form')?.locus).toBe('anatomy.tail-tip-form')
    expect(selectedLocus(g, null)?.locus).toBe('form.tail-length')
    expect(selectedLocus(undefined, 'tail')).toBeNull()
  })
  it('names the look a value falls in', () => {
    expect([0.8, 1, 1.29].map((v) => tail.bins![binIndex(tail, v)])).toEqual(['short', 'between', 'long'])
  })
  it('puts the band, the mark and the range ends in percent of the range', () => {
    expect(rangeBar(tail)).toMatchObject({ r0: 0.5, r1: 2, band: [20, 53.3], mark: 33.3 })
  })
  it('shows the limits of a blend and the other alleles of a pair as ends', () => {
    expect(stageEnds(tail).map((e) => e.genome)).toEqual(['low:form.tail-length', 'high:form.tail-length'])
    expect(stageEnds(tip).map((e) => e.genome)).toEqual(['allele:anatomy.tail-tip-form=plain', 'allele:anatomy.tail-tip-form=tuft'])
  })
  it('puts a red dot on a failing locus, a grey one once the file has moved on, none before the ends are built', () => {
    expect(locusDot(null, 'form.tail-length')).toBeNull()
    expect(locusDot(ext(true, [end({})]), 'form.tail-length')).toBe('fail')
    expect(locusDot(ext(true, [end({ state: 'pass' })]), 'form.tail-length')).toBeNull()
    expect(locusDot(ext(false, [end({})]), 'form.tail-length')).toBe('stale')
  })
  it('says it in the owner\'s words, with the fix it computed', () => {
    expect(endLine(tail, end({}))).toBe('Tail length fails at its high end')
    expect(endMeasure(end({}))).toBe('At 1.30×: Sharp crease in leg.L (24 visible edges over 20°). Passes up to 1.19×.')
    expect(unitText(-0.03, 'turns')).toBe('-0.03 turns')
  })
  it('shows the first failing end\'s proof unless the URL says none', () => {
    const e = end({ proof: { mode: 'clay', az: 90, key: 'k', ready: true } })
    expect(proofEnd(ext(true, [e]), 'form.tail-length', null)).toBeNull()
    expect(proofEnd(ext(true, [e]), 'form.tail-length', 'x')?.id).toBe('x')
    expect(proofEnd(ext(true, [e]), 'form.tail-length', 'none')).toBeNull()
    expect(proofEnd(ext(true, [end({})]), 'form.tail-length', null)).toBeNull()
  })
  it('judges each locus from the camera that shows its part', () => {
    expect(stageView(tail).az).toBe(90)
    expect(stageView(eye).az).toBe(0)
    expect(stageView(eye).zoom.s).toBeGreaterThanOrEqual(2)
    expect(stageView(g.loci[0]).az).toBe(32)
  })
  it('turns a fix into the pointer it writes to', () => {
    expect(fixPointer(g, { path: 'genome.loci.form.tail-length.band.hi' })).toBe('/genome/loci/1/band/hi')
    expect(fixPointer(g, { path: 'genome.loci.nope.band.hi' })).toBeNull()
  })
  it('shows a sleeping locus as asleep, with what wakes it', () => {
    expect(isAsleep(g, whiskerLength)).toBe(true)
    expect(wakeLine(g, whiskerLength)).toEqual({ asleep: true, head: 'Asleep at the type', line: 'Wakes when Whiskers is on.' })
    expect(isAsleep(g, rosette)).toBe(true)                                    // the layout is asleep behind the marking switch, so it shows nothing and wakes nothing
    expect(wakeLine(g, rosette)?.line).toBe('Wakes when Marking layout shows spotted.')
    expect(isAsleep(g, tail)).toBe(false)
    expect(wakeLine(g, tail)).toBeNull()
    const on = { ...g, loci: g.loci.map((l) => (l.locus === 'anatomy.whisker-presence' ? { ...l, type: 'on' } : l)) }
    expect(wakeLine(on, whiskerLength)).toEqual({ asleep: false, head: 'Awake at the type', line: 'Sleeps unless Whiskers is on.' })
  })
})


describe('chapter 9: expressions, how often, modifiers, the string', () => {
  const horn: Expression = { id: 'horn', label: 'Horn', locus: 'anatomy.horn-presence', look: 'on', age: { from: 'adult', grow: 0.5 }, art: ['adult', 'elder'] }
  const sparkle: Expression = { id: 'sparkle', label: 'Sparkle spots', locus: 'appearance.freckle-glow', look: 'high', needs: [{ locus: 'anatomy.tail-tip-form', is: 'lantern' }, { locus: 'appearance.marking-layout', in: ['bands', 'spotted'] }] }
  it('says an age and the needs in the studio words', () => {
    expect(ageLine(horn)).toBe('From age · grown')
    expect(ageLine({ ...horn, age: { from: 'elder' } })).toBe('From age · elder')
    expect(ageLine(sparkle)).toBeNull()
    expect(needLine(g, sparkle)).toBe('Needs · Tail length shows lantern and Marking layout shows bands or spotted')
    expect(needLine(g, horn)).toBeNull()
    expect(expressionsOf([horn, sparkle], 'anatomy.horn-presence')).toEqual([horn])
  })
  it('cuts a bar into the looks that show, the sleeping share last, and leaves out what is nothing', () => {
    const f: LocusFreq = { looks: ['lantern', 'tuft', 'plain'], rule: 'first-ranked', rule_words: 'First in the order', modifiers: [], wild: { lantern: 85.1, tuft: 12.8, plain: 2.1 }, cross: { lantern: 100, tuft: 0, plain: 0 } }
    expect(barSegments(f, 'wild').map((x) => x.look)).toEqual(['lantern', 'tuft', 'plain'])
    expect(barSegments(f, 'cross')).toEqual([{ look: 'lantern', pct: 100, tone: 0 }])
    expect(barSegments(f, 'sheet')).toEqual([])
    expect(barSegments({ ...f, wild: { lantern: 0, tuft: 0, plain: 0, asleep: 100 } }, 'wild')).toEqual([{ look: 'asleep', pct: 100, tone: -1 }])
    expect([pct(85.1), pct(2.1), pct(0), pct(100)]).toEqual(['85%', '2.1%', '0%', '100%'])
  })
  it('makes a modifier for a pair map (a new first look) and a switch (the other rule), once, and never for a blend', () => {
    const m = newModifier(g, tip, 'tuft')!
    expect(m.locus).toBe('mod.tail-tip-form-order')
    expect(m.modifier).toEqual({ of: 'anatomy.tail-tip-form', show: 'first-ranked', order: ['tuft', 'plain', 'lantern'] })
    expect(m.op === 'switch' && m.limits).toEqual(['off', 'on'])
    const sw = newModifier(g, marks, '')!
    expect(sw.modifier).toEqual({ of: 'appearance.marking-switch', show: 'recessive' })
    expect(newModifier(g, { ...marks, operator: 'recessive-enable' }, '')!.modifier!.show).toBe('dominant')
    expect(newModifier(g, tail, '')).toBeNull()
    const g2: Genome = { ...g, loci: [...g.loci, m] }
    expect(newModifier(g2, tip, 'plain')).toBeNull()
    expect(modifiersOf(g2, 'anatomy.tail-tip-form')).toEqual([m])
    expect(modifierLine(g2, m)).toBe('Tail length: tuft over plain over lantern')
  })
  it('writes the genome string in groups of five after its opening', () => {
    expect(grouped('G1-S20v1-20A00XY1GC30TJ1G8010R60G821GF5TR6')).toBe('G1-S20v1- 20A00 XY1GC 30TJ1 G8010 R60G8 21GF5 TR6')
    expect(grouped('hello')).toBe('hello')
  })
})

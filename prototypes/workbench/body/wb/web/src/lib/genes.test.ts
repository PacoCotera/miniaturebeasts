import { describe, expect, it } from 'vitest'
import { stageView, binIndex, proofEnd, endLine, endMeasure, fixPointer, locusDot, rangeBar, selectedLocus, stageEnds, unitText, type End, type ExtremesState, type Genome, type Locus } from './genes'

const tail: Locus = { locus: 'body.tail-length', label: 'Tail length', short: 'Length', chapter: 'tail', scope: 'own', kind: 'heritable-look', op: 'blend', form: 'mult', unit: '×', range: [0.5, 2], limits: [0.8, 1.3], type: 1, bins: ['short', 'between', 'long'], moves: [] }
const eye: Locus = { ...tail, locus: 'growth.exterior-eye-size-ratio', label: 'Exterior eye size ratio', short: 'Eye size', chapter: 'face', scope: 'shared', limits: [0.92, 1.1], catalogue: { range: [0.24, 0.44], type: 0.32, operator: 'copy-mean' } }
const tip: Locus = { ...tail, locus: 'body.tail-tip', op: 'pair-map', form: undefined, limits: ['plain', 'tuft', 'lantern'], type: 'lantern', bins: undefined }
const g: Genome = { catalogue: { id: 'mb-genome-framework', version: 10 }, chapters: [{ id: 'body', name: 'Body' }, { id: 'tail', name: 'Tail' }, { id: 'face', name: 'Face' }], loci: [{ ...tail, locus: 'body.torso-girth', chapter: 'body' }, tail, tip, eye] }
const end = (o: Partial<End>): End => ({ id: 'x', locus: 'body.tail-length', end: 'high', genome: 'high:body.tail-length', value: 1.3, label: 'Tail length', state: 'fail', fails: [{ id: 'normals', fail: 'Sharp crease in leg.L', measure: '24 visible edges over 20°', value: 24, limit: 0 }], unit: '×', cage: 'c', fix: { value: 1.19, path: 'genome.loci.body.tail-length.limits.1', end: 'high' }, ...o })
const ext = (fresh: boolean, ends: End[]): ExtremesState => ({ fresh, running: false, ends, rows: [], key: 'k' })

describe('genes', () => {
  it('takes the tail chapter for a part from Shape, and a locus as it is', () => {
    expect(selectedLocus(g, 'tail')?.locus).toBe('body.tail-length')
    expect(selectedLocus(g, 'body.tail-tip')?.locus).toBe('body.tail-tip')
    expect(selectedLocus(g, null)?.locus).toBe('body.tail-length')
    expect(selectedLocus(undefined, 'tail')).toBeNull()
  })
  it('names the look a value falls in', () => {
    expect([0.8, 1, 1.29].map((v) => tail.bins![binIndex(tail, v)])).toEqual(['short', 'between', 'long'])
  })
  it('puts the band, the mark and the range ends in percent of the range', () => {
    expect(rangeBar(tail)).toMatchObject({ r0: 0.5, r1: 2, band: [20, 53.3], mark: 33.3 })
  })
  it('shows the limits of a blend and the other alleles of a pair as ends', () => {
    expect(stageEnds(tail).map((e) => e.genome)).toEqual(['low:body.tail-length', 'high:body.tail-length'])
    expect(stageEnds(tip).map((e) => e.genome)).toEqual(['allele:body.tail-tip=plain', 'allele:body.tail-tip=tuft'])
  })
  it('puts a red dot on a failing locus, a grey one once the file has moved on, none before the ends are built', () => {
    expect(locusDot(null, 'body.tail-length')).toBeNull()
    expect(locusDot(ext(true, [end({})]), 'body.tail-length')).toBe('fail')
    expect(locusDot(ext(true, [end({ state: 'pass' })]), 'body.tail-length')).toBeNull()
    expect(locusDot(ext(false, [end({})]), 'body.tail-length')).toBe('stale')
  })
  it('says it in the owner\'s words, with the fix it computed', () => {
    expect(endLine(tail, end({}))).toBe('Tail length fails at its high end')
    expect(endMeasure(end({}))).toBe('At 1.30×: Sharp crease in leg.L (24 visible edges over 20°). Passes up to 1.19×.')
    expect(unitText(-0.03, 'turns')).toBe('-0.03 turns')
  })
  it('shows the first failing end\'s proof unless the URL says none', () => {
    const e = end({ proof: { mode: 'clay', az: 90, key: 'k', ready: true } })
    expect(proofEnd(ext(true, [e]), 'body.tail-length', null)?.id).toBe('x')
    expect(proofEnd(ext(true, [e]), 'body.tail-length', 'none')).toBeNull()
    expect(proofEnd(ext(true, [end({})]), 'body.tail-length', null)).toBeNull()
  })
  it('judges each locus from the camera that shows its part', () => {
    expect(stageView(tail).az).toBe(90)
    expect(stageView(eye).az).toBe(0)
    expect(stageView(eye).zoom.s).toBeGreaterThanOrEqual(2)
    expect(stageView(g.loci[0]).az).toBe(32)
  })
  it('turns a fix into the pointer it writes to', () => {
    expect(fixPointer(g, { path: 'genome.loci.body.tail-length.limits.1' })).toBe('/genome/loci/1/limits/1')
    expect(fixPointer(g, { path: 'genome.loci.nope.limits.1' })).toBeNull()
  })
})

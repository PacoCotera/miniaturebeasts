import { describe, expect, it } from 'vitest'
import type { CheckMeta, CheckRow } from './checks'
import { barPos, clamp, controlFor, drives, failingFor, fmtNum, getAt, parseNum, patchFor, scrub, setAt, snap } from './forms'

const tail = { range: [0.6, 1.8] as [number, number], step: 0.01 }

describe('the Shape forms', () => {
  it('reads and writes the file at a pointer, leaving the rest of it alone', () => {
    const file = { spine: { tail: { length: 1.1, root: 0.27 }, ranges: [{ name: 'head', length: 0.93 }] } }
    expect(getAt(file, '/spine/tail/length')).toBe(1.1)
    expect(getAt(file, '/spine/ranges/0/length')).toBe(0.93)
    expect(getAt(file, '/spine/nothing/here')).toBeUndefined()
    const next = setAt(file, '/spine/tail/length', 1.24)
    expect(getAt(next, '/spine/tail/length')).toBe(1.24)
    expect(next.spine.tail.root).toBe(0.27)
    expect(file.spine.tail.length).toBe(1.1)
    expect(next.spine.ranges).toEqual(file.spine.ranges)
    expect(getAt(setAt(file, '/spine/ranges/0/length', 1), '/spine/ranges/0/length')).toBe(1)
  })
  it('shows a number without trailing zeros and takes a typed one the way a person writes it', () => {
    expect(fmtNum(1.24)).toBe('1.24')
    expect(fmtNum(0.045)).toBe('0.045')
    expect(fmtNum(0)).toBe('0')
    expect(fmtNum(1.6000001)).toBe('1.6')
    expect(fmtNum(0.272727273)).toBe('0.273')
    expect(parseNum(' 1.24 ')).toBe(1.24)
    expect(parseNum('1,24')).toBe(1.24)
    expect(parseNum('-0.5')).toBe(-0.5)
    expect(parseNum('.5')).toBe(0.5)
    expect(parseNum('1.2.3')).toBeNull()
    expect(parseNum('')).toBeNull()
    expect(parseNum('abc')).toBeNull()
  })
  it('scrubs inside the range, in steps, and ten times finer with Shift', () => {
    expect(scrub(1.1, 0, tail)).toBe(1.1)
    expect(scrub(1.1, 24, tail)).toBe(1.22)                 // 24 px of 240 is a tenth of the 1.2 band
    expect(scrub(1.1, 24, tail, true)).toBe(1.11)
    expect(scrub(1.1, -9999, tail)).toBe(0.6)
    expect(scrub(1.1, 9999, tail)).toBe(1.8)
    expect(snap(1.2349, 0.01)).toBe(1.23)
    expect(snap(0.0451, 0.001)).toBe(0.045)
    expect(clamp(5, null)).toBe(5)
  })
  it('places the mark on the bar, pinned to the end it passed', () => {
    expect(barPos(1.2, [0.6, 1.8])).toBeCloseTo(50, 6)
    expect(barPos(9, [0.6, 1.8])).toBe(100)
    expect(barPos(-1, [0.6, 1.8])).toBe(0)
  })
  it('turns the mark red only for a failing check that lists the field, or a path it sits under', () => {
    const row = (id: string, state: CheckRow['state']) => ({ id, state }) as CheckRow
    const meta = (id: string, fields: string[]) => ({ id, fields }) as CheckMeta
    const metas = { 'tail.size': meta('tail.size', ['spine.tail.length', 'spine.tail.root']), joins: meta('joins', ['parts.ear.L.socket.join']), balance: meta('balance', ['parts.leg.L.chain']) }
    expect(failingFor('spine.tail.length', [row('tail.size', 'fail')], metas)?.id).toBe('tail.size')
    expect(failingFor('spine.tail.length', [row('tail.size', 'pass')], metas)).toBeNull()
    expect(failingFor('spine.tail.length', [row('tail.size', 'warn')], metas)).toBeNull()
    expect(failingFor('spine.tail.tip_r', [row('tail.size', 'fail')], metas)).toBeNull()
    expect(failingFor('parts.leg.L.chain.knee.len', [row('balance', 'fail')], metas)?.id).toBe('balance')
    expect(drives('spine.ranges', 'spine.ranges.head.length')).toBe(true)
    expect(drives('spine.tail', 'spine.tailor')).toBe(false)
  })
  it('picks the control from the kind of field: a number, a choice of up to three, a longer choice, a flag', () => {
    expect(controlFor({ type: 'number' })).toBe('number')
    expect(controlFor({ type: 'int' })).toBe('number')
    expect(controlFor({ type: 'enum', options: ['hard', 'soft'] })).toBe('segmented')
    expect(controlFor({ type: 'enum', options: ['a', 'b', 'c'] })).toBe('segmented')
    expect(controlFor({ type: 'enum', options: ['a', 'b', 'c', 'd'] })).toBe('select')
    expect(controlFor({ type: 'bool' })).toBe('switch')
    expect(controlFor({ type: 'free' })).toBeNull()
  })
  it('saves as one patch that first tests the value it started from', () => {
    expect(patchFor('/spine/tail/length', 1.1, 1.24)).toEqual([{ op: 'test', path: '/spine/tail/length', value: 1.1 }, { op: 'replace', path: '/spine/tail/length', value: 1.24 }])
  })
})

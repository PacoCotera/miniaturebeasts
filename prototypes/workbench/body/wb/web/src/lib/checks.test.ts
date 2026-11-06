import { describe, expect, it } from 'vitest'
import { failLine, needsYou, pillWords, shownLimit, shownValue, stateOfPart, type CheckMeta, type CheckRow } from './checks'

const r = (id: string, state: CheckRow['state'], extra?: CheckRow['extra']): CheckRow => ({ id, state, value: 1, limit: 1, measure: '', stage: 'cage', version: 1, proof: null, extra })
const m = (id: string, part: string[]): CheckMeta => ({ id, name: id, fail: 'Tail too big for the body', stage: 'cage', rule: { date: '', words: '' }, limit: { text: '', value: null }, part, fields: [], play: null, az: 90, mode: 'clay' })

describe('what needs you', () => {
  it('counts fails and warnings, never passes: the pill and the drawer read the same list', () => {
    const rows = [r('a', 'fail'), r('b', 'warn'), r('c', 'pass'), r('d', 'pass')]
    expect(needsYou(rows).map((x) => x.id)).toEqual(['a', 'b'])
    expect(pillWords(rows)).toEqual({ text: '2 need you', kind: 'fail', n: 2 })
  })
  it('says it the way words.md does', () => {
    expect(pillWords([r('a', 'fail')])?.text).toBe('1 to fix')
    expect(pillWords([r('a', 'fail'), r('b', 'fail')])?.text).toBe('2 to fix')
    expect(pillWords([r('a', 'warn')])).toMatchObject({ text: '1 needs a look', kind: 'warn' })
    expect(pillWords([r('a', 'warn'), r('b', 'warn')])?.text).toBe('2 need a look')
  })
  it('has no pill when nothing needs you', () => expect(pillWords([r('a', 'pass')])).toBeNull())
  it('puts a dot on the part a check is about: red over amber', () => {
    const metas = { a: m('a', ['tail']), b: m('b', ['tail', 'legs']) }
    expect(stateOfPart([r('a', 'warn'), r('b', 'fail')], metas, 'tail')).toBe('fail')
    expect(stateOfPart([r('a', 'warn'), r('b', 'fail')], metas, 'legs')).toBe('fail')
    expect(stateOfPart([r('a', 'warn')], metas, 'legs')).toBeNull()
  })
  it('uses the row\'s own fail line, else the check\'s without its placeholder', () => {
    expect(failLine(r('a', 'fail', { fail: 'Ear join is half-blended' }), m('a', []))).toBe('Ear join is half-blended')
    expect({ x: failLine(r('a', 'fail'), { ...m('a', []), fail: 'Tips over at {end}' }) }).toEqual({ x: 'Tips over at' })
  })
})

// The Checks screen's count rows say what was measured, never "0 against 0".
describe('the Value and Limit columns on the count checks', () => {
  it('names a bump or the lack of one on the tail taper', () => {
    expect(shownValue({ id: 'tail.taper', value: 0 })).toBe('no bump')
    expect(shownValue({ id: 'tail.taper', value: 0.0009 })).toBe('no bump')
    expect(shownValue({ id: 'tail.taper', value: 0.041 })).toBe('bump 0.041 H')
    expect(shownLimit({ id: 'tail.taper', limit: 0 })).toBe('none')
  })
  it('counts the ranges on the mesh quality', () => {
    expect(shownValue({ id: 'mesh', value: 0 })).toBe('all ranges')
    expect(shownValue({ id: 'mesh', value: 1 })).toBe('1 range')
    expect(shownValue({ id: 'mesh', value: 3 })).toBe('3 ranges')
    expect(shownLimit({ id: 'mesh', limit: 0 })).toBe('none')
  })
  it('says what the server measured on the rows that count nothing worth showing (joins, head on the spine, shoulders and hips, normals, the rig and coat)', () => {
    const extra = { shown: { value: '0.83 · 0.83', limit: '0.8' } }
    expect(shownValue({ id: 'joins', value: 0, extra })).toBe('0.83 · 0.83')
    expect(shownLimit({ id: 'joins', limit: 0, extra })).toBe('0.8')
  })
  it('leaves every other row as its number', () => {
    expect(shownValue({ id: 'verts', value: 3330 })).toBe('3,330')
    expect(shownLimit({ id: 'verts', limit: 3500 })).toBe('3,500')
    expect(shownLimit({ id: 'balance', limit: 0.15 })).toBe('0.15')
  })
})

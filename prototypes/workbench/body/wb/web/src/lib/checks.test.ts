import { describe, expect, it } from 'vitest'
import { failLine, needsYou, pillWords, stateOfPart, type CheckMeta, type CheckRow } from './checks'

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

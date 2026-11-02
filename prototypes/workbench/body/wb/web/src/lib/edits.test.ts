import { describe, expect, it } from 'vitest'
import type { Entry } from './api'
import { entryKey, fieldLabel, fmtValue, initials, leaseFrom, newEntries } from './edits'

const e = (over: Partial<Entry> = {}): Entry => ({ t: '2026-11-02T14:02:00.000-06:00', actor: 'agent-3', role: 'maker', agent: true, via: 'api', op: 'replace', path: '/parts/tail/joints/2/len', old: 0.21, new: 0.33, hash_before: 'a', hash_after: 'b', ...over })

describe('who holds the file', () => {
  const t = Date.parse(e().t)
  it('an agent holds it for ten minutes after its last edit', () => {
    expect(leaseFrom(null, [e()], t + 9 * 60_000)).toMatchObject({ holder: 'agent-3', agent: true })
    expect(leaseFrom(null, [e()], t + 11 * 60_000)).toBeNull()
  })
  it('a person editing, or no edits, holds nothing; the server\'s own lease wins', () => {
    expect(leaseFrom(null, [e({ agent: false, actor: 'file' })], t)).toBeNull()
    expect(leaseFrom(null, [], t)).toBeNull()
    const own = { holder: 'agent-9', agent: true, since: e().t }
    expect(leaseFrom(own, [], t)).toBe(own)
  })
})

describe('toasts for other hands', () => {
  it('shows nothing on the first look, then only entries not seen before', () => {
    const a = e(), b = e({ path: '/parts/tail/joints/3/len', hash_after: 'c' })
    expect(newEntries(null, [a])).toEqual([])
    expect(newEntries(new Set([entryKey(a)]), [a, b])).toEqual([b])
  })
  it('words: the field, the values and the avatar', () => {
    expect(fieldLabel('/parts/tail/joints/2/len')).toBe('tail len')
    expect(fieldLabel('/spine/tail/length')).toBe('tail length')
    expect(fmtValue(1.2400000001)).toBe('1.24')
    expect(fmtValue('soft')).toBe('soft')
    expect(initials('agent-3')).toBe('a3')
    expect(initials('local')).toBe('LO')
  })
})

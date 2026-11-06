import { describe, expect, it } from 'vitest'
import type { Entry } from './api'
import { clock, dottedPath, entryKey, fieldLabel, fieldValue, fmtValue, initials, leaseFrom, newEntries } from './edits'

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

describe('times', () => {
  it('show in the viewer\'s time zone, not the server\'s', () => {
    expect(clock('2026-11-02T20:32:00.000+00:00', 'America/Mexico_City')).toBe('14:32')
    expect(clock('2026-11-02T14:32:00.000-06:00', 'America/Mexico_City')).toBe('14:32')
    expect(clock('2026-11-02T14:32:00.000-06:00', 'UTC')).toBe('20:32')
  })
})

describe('toasts for edits made elsewhere', () => {
  it('shows nothing on the first look, then only entries not seen before', () => {
    const a = e(), b = e({ path: '/parts/tail/joints/3/len', hash_after: 'c' })
    expect(newEntries(null, [a])).toEqual([])
    expect(newEntries(new Set([entryKey(a)]), [a, b])).toEqual([b])
  })
  it('words: the field, the values and the avatar', () => {
    const gfile = { genome: { loci: [{ locus: 'form.ear-kind', label: 'Ear shape', limits: ['prick', 'lop', 'nub'] }] }, sockets: [{ id: 'ear.L' }], variety: { look_words: { 'form.ear-kind': { lop: ['Floppy ears', 'floppy'], prick: ['Pointy ears', 'pointy'] } } } }
    expect(fieldLabel('/genome/loci/0/weights/1', undefined, gfile)).toBe('floppy ears wild odds')
    expect(fieldLabel('/genome/loci/0/type', undefined, gfile)).toBe('ear shape')
    expect(fieldLabel('/parts/tail/joints/2/len')).toBe('tail joint 2 length')
    expect(fieldLabel('/parts/leg.L/joints/1/r')).toBe('leg joint 1 radius')
    expect(fieldLabel('/spine/tail/length')).toBe('tail length')
    expect(fieldLabel('/spine/tail/length', { 'spine.tail.length': 'Tail length' })).toBe('tail length')
    const file = { spine: { tail: { length: 1.25 }, ranges: [{ name: 'head' }, { name: 'neck', length: 0.25 }] }, parts: [{ id: 'leg.L', chain: [{ joint: 'knee' }, { joint: 'ankle', len: 0.12 }] }] }
    const labels = { 'spine.tail.length': 'Tail length', 'spine.ranges.*.length': 'Length', 'parts.*.chain.*.len': 'Length' }
    expect(fieldLabel('/spine/tail/length', labels, file)).toBe('tail length')
    expect(fieldLabel('/spine/ranges/1/length', labels, file)).toBe('neck length')
    expect(fieldLabel('/parts/0/chain/1/len', labels, file)).toBe('leg ankle length')
    expect(dottedPath('/parts/0/chain/1/len', file)).toBe('parts.leg.L.chain.ankle.len')
    expect(fmtValue(1.2400000001)).toBe('1.24')
    expect(fmtValue('soft')).toBe('soft')
    expect(fieldValue('/genome/loci/0/weights/1', 0.3, gfile)).toBe('30%')
    expect(fieldValue('/sockets/0/spec/default', 'prick', gfile)).toBe('pointy')
    expect(fieldValue('/spine/tail/length', 1.2400000001, gfile)).toBe('1.24')
    expect(initials('agent-3')).toBe('a3')
    expect(initials('local')).toBe('LO')
  })
})

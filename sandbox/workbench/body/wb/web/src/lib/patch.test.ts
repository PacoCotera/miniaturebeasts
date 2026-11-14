import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import type { Entry, Species } from './api'
import { applyOps, followEdit, type Edit, type Op } from './patch'

const doc = () => ({ name: 'Tuliko', spine: { tail: { length: 1.25 }, joints: [{ len: 0.2 }, { len: 0.3 }] }, loci: ['a', 'b'] })

describe('applyOps (the server\'s subset of RFC 6902)', () => {
  it('replaces, adds and removes, in order, and leaves the document it was given alone', () => {
    const d = doc()
    const frozen = JSON.stringify(d)
    const out = applyOps(d, [
      { op: 'replace', path: '/spine/tail/length', value: 1.4 },
      { op: 'replace', path: '/spine/joints/1/len', value: 0.35 },
      { op: 'add', path: '/spine/tail/curl', value: 0.1 },
      { op: 'add', path: '/loci/-', value: 'c' },
      { op: 'add', path: '/loci/0', value: 'z' },
      { op: 'remove', path: '/name' },
    ])
    expect(out).toEqual({ spine: { tail: { length: 1.4, curl: 0.1 }, joints: [{ len: 0.2 }, { len: 0.35 }] }, loci: ['z', 'a', 'b', 'c'] })
    expect(JSON.stringify(d)).toBe(frozen)
    expect(out.spine.joints[0]).toBe(d.spine.joints[0]) // nodes off the path are shared, not copied
  })
  it('removes a list element and shifts the rest', () => {
    expect(applyOps(doc(), [{ op: 'remove', path: '/spine/joints/0' }]).spine.joints).toEqual([{ len: 0.3 }])
  })
  it('a test that holds changes nothing; one that does not hold throws', () => {
    const d = doc()
    expect(applyOps(d, [{ op: 'test', path: '/spine/tail/length', value: 1.25 }])).toBe(d)
    expect(() => applyOps(d, [{ op: 'test', path: '/spine/tail/length', value: 9 }])).toThrow()
    expect(() => applyOps(d, [{ op: 'test', path: '/spine/joints/1', value: { len: 0.3 } }, { op: 'replace', path: '/name', value: 'x' }])).not.toThrow()
  })
  it('a path that is not there throws, as the server\'s 400 does', () => {
    const d = doc()
    for (const op of [
      { op: 'replace', path: '/spine/nope', value: 1 },
      { op: 'replace', path: '/spine/joints/2/len', value: 1 },
      { op: 'remove', path: '/loci/5' },
      { op: 'replace', path: '/name/deep', value: 1 },
      { op: 'replace', path: 'spine', value: 1 },
      { op: 'replace', path: '', value: 1 },
    ] as Op[]) expect(() => applyOps(d, [op])).toThrow()
  })
  it('reads ~1 and ~0 in a pointer', () => {
    expect(applyOps({ 'a/b': { 'c~d': 1 } }, [{ op: 'replace', path: '/a~1b/c~0d', value: 2 }])).toEqual({ 'a/b': { 'c~d': 2 } })
  })
})

const entry = (path: string, value: number, hash: string): Entry => ({ t: '2026-11-07T10:00:00.000-06:00', actor: 'owner', role: 'owner', agent: false, via: 'api', op: 'replace', path, old: 1.25, new: value, hash_before: 'h0', hash_after: hash })
const held = (hash = 'h0'): Species => ({ id: 'S20', hash, error: null, lease: null, history: [], views: [], file: doc() as unknown as Species['file'], checks: { hash, fresh: true, rows: [], counts: { total: 0, fail: 0, warn: 0, need: 0, passed: 0 } } as unknown as Species['checks'] })
const save = (extra: Partial<Edit> = {}): Edit => ({ base: 'h0', hash: 'h1', ops: [{ op: 'replace', path: '/spine/tail/length', value: 1.4 }], entries: [entry('/spine/tail/length', 1.4, 'h1')], undo: true, redo: false, ...extra })

describe('followEdit', () => {
  const at = (qc: QueryClient) => qc.getQueryData<Species>(['species', 'S20'])!
  it('takes the ops, the hash, the log entries and the undo flags; the check rows turn stale', () => {
    const qc = new QueryClient()
    qc.setQueryData(['species', 'S20'], held())
    expect(followEdit(qc, 'S20', save())).toBe('followed')
    expect([at(qc).hash, (at(qc).file as unknown as ReturnType<typeof doc>).spine.tail.length, at(qc).history.length, at(qc).undo, at(qc).checks?.fresh]).toEqual(['h1', 1.4, 1, { undo: true, redo: false }, false])
  })
  it('keeps the last five log entries, and an entry it already has is not added twice', () => {
    const qc = new QueryClient()
    const old = [1, 2, 3, 4, 5].map((i) => entry(`/p/${i}`, i, `x${i}`))
    qc.setQueryData(['species', 'S20'], { ...held(), history: old })
    followEdit(qc, 'S20', save({ entries: [old[4], entry('/spine/tail/length', 1.4, 'h1')] }))
    expect(at(qc).history.map((e) => e.path)).toEqual(['/p/2', '/p/3', '/p/4', '/p/5', '/spine/tail/length'])
  })
  it('a hash it already has is followed with no change (the answer and the event both arrive)', () => {
    const qc = new QueryClient()
    qc.setQueryData(['species', 'S20'], held('h1'))
    const before = at(qc)
    expect(followEdit(qc, 'S20', save())).toBe('followed')
    expect(at(qc)).toBe(before)
  })
  it('says refetch for a gap, for no ops, for ops that do not apply, and for nothing held', () => {
    const qc = new QueryClient()
    qc.setQueryData(['species', 'S20'], held('hX'))
    expect(followEdit(qc, 'S20', save())).toBe('refetch')
    qc.setQueryData(['species', 'S20'], held())
    expect(followEdit(qc, 'S20', save({ ops: null }))).toBe('refetch')
    expect(followEdit(qc, 'S20', save({ ops: [{ op: 'replace', path: '/spine/nope', value: 1 }] }))).toBe('refetch')
    expect(at(qc).hash).toBe('h0')
    expect(followEdit(new QueryClient(), 'S20', save())).toBe('refetch')
  })
})

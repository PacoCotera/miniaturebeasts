import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Species } from './api'
import { NO_JOBS, REFETCH_GAP_MS, applyEvent, reduceJobs, syncState, type JobsState, type WbEvent } from './events'

const state = vi.fn()
const extremes = vi.fn()
vi.mock('./api', async (orig) => ({ ...(await orig<typeof import('./api')>()), speciesState: (...a: unknown[]) => state(...a), speciesExtremes: (...a: unknown[]) => extremes(...a) }))

const ev = (type: WbEvent['type'], extra: Partial<WbEvent> = {}): WbEvent => ({ id: 1, type, species: 'S20', t: '2026-11-02T20:00:00.000-06:00', job: 'j1', kind: 'render', ...extra })

describe('job events feed the indicator', () => {
  it('queued, running, done: on the indicator, then off it', () => {
    let s: JobsState = reduceJobs(NO_JOBS, ev('queued', { actor: 'agent-3' }), 1000)
    expect(s.jobs.j1).toMatchObject({ state: 'queued', kind: 'render', since: 1000, actor: 'agent-3' })
    s = reduceJobs(s, ev('running'), 1500)
    expect(s.jobs.j1).toMatchObject({ state: 'running', since: 1000, actor: 'agent-3' }) // keeps when it began
    s = reduceJobs(s, ev('done'), 2000)
    expect(s.jobs).toEqual({})
  })
  it('a failed or superseded job leaves the indicator too, and an edit changes nothing', () => {
    const q = reduceJobs(NO_JOBS, ev('queued'), 0)
    expect(reduceJobs(q, ev('failed', { superseded: true }), 1).jobs).toEqual({})
    expect(reduceJobs(q, ev('edited', { job: undefined }), 1)).toBe(q)
  })
  it('a running job with no queued event before it (a late reader) still shows', () => {
    expect(reduceJobs(NO_JOBS, ev('running', { progress: 0.4 }), 5).jobs.j1).toMatchObject({ state: 'running', progress: 0.4 })
  })
})

describe('events and the query cache', () => {
  beforeEach(() => { vi.useFakeTimers(); state.mockReset(); extremes.mockReset() })
  afterEach(() => vi.useRealTimers())
  it('writes the job list; an edit it cannot follow refetches the species, a finished job syncs its state (and refetches only if that fails)', async () => {
    const qc = new QueryClient()
    state.mockRejectedValue(new Error('offline'))
    const inv = vi.spyOn(qc, 'invalidateQueries')
    applyEvent(qc, 'S20', ev('queued'), 10)
    expect(qc.getQueryData<JobsState>(['jobs', 'S20'])?.jobs.j1.state).toBe('queued')
    expect(inv).not.toHaveBeenCalled()
    applyEvent(qc, 'S20', ev('edited', { job: undefined, actor: 'agent-3' }))
    applyEvent(qc, 'S20', ev('done'))
    expect(inv).toHaveBeenCalledTimes(7) // the species, the Variety sheet, the goldens, the gate and the forms, for the edit; the Variety sheet and the goldens for the job
    await vi.advanceTimersByTimeAsync(0)
    expect(inv).toHaveBeenCalledTimes(8) // the state call failed: the species, whole
    expect(inv).toHaveBeenCalledWith({ queryKey: ['species', 'S20'] })
    expect(inv).toHaveBeenCalledWith({ queryKey: ['variety', 'S20'] })
    expect(inv).toHaveBeenCalledWith({ queryKey: ['forms', 'S20'] })
    expect(inv).toHaveBeenCalledWith({ queryKey: ['gate', 'S20'] })
    expect(inv).toHaveBeenCalledWith({ queryKey: ['goldens', 'S20'] })
    expect(qc.getQueryData<JobsState>(['jobs', 'S20'])?.jobs).toEqual({})
  })
  it('a superseded job is not a failure to refetch for', () => {
    const qc = new QueryClient()
    const inv = vi.spyOn(qc, 'invalidateQueries')
    applyEvent(qc, 'S20', ev('failed', { superseded: true }))
    expect(inv).not.toHaveBeenCalled()
  })
})

const sp = (hash: string, len: number): Species => ({ id: 'S20', hash, error: null, lease: null, history: [], views: [], checks: { hash, fresh: true, rows: [], counts: { total: 0, fail: 0, warn: 0, need: 0, passed: 0 } } as unknown as Species['checks'], file: { spine: { tail: { length: len } } } as unknown as Species['file'] })
const stateOf = (hash: string, extra: Record<string, unknown> = {}) => ({ id: 'S20', hash, error: null, lease: null, views: [], checks: null, extremes: null, undo: { undo: false, redo: false }, ...extra })
const edited = (extra: Partial<WbEvent>): WbEvent => ev('edited', { job: undefined, actor: 'owner', base: 'h0', hash: 'h1', ops: [{ op: 'replace', path: '/spine/tail/length', value: 1.3 }], entries: [], undo: true, redo: false, ...extra })

describe('an edit is followed, not refetched', () => {
  beforeEach(() => { vi.useFakeTimers(); state.mockReset(); extremes.mockReset() })
  afterEach(() => vi.useRealTimers())

  it('applies the ops to the copy it holds and takes the hash, with no refetch of the species', () => {
    const qc = new QueryClient()
    qc.setQueryData(['species', 'S20'], sp('h0', 1.25))
    const inv = vi.spyOn(qc, 'invalidateQueries')
    applyEvent(qc, 'S20', edited({}))
    const s = qc.getQueryData<Species>(['species', 'S20'])!
    expect([s.hash, (s.file as { spine?: unknown }).spine, s.undo]).toEqual(['h1', { tail: { length: 1.3 } }, { undo: true, redo: false }])
    expect(s.checks?.fresh).toBe(false) // the rows are those of the file before
    expect(inv).not.toHaveBeenCalledWith({ queryKey: ['species', 'S20'] })
    expect(inv).toHaveBeenCalledWith({ queryKey: ['forms', 'S20'] })
  })
  it('takes each hash once: the same edit again changes and asks for nothing', () => {
    const qc = new QueryClient()
    qc.setQueryData(['species', 'S20'], sp('h0', 1.25))
    applyEvent(qc, 'S20', edited({}))
    const inv = vi.spyOn(qc, 'invalidateQueries')
    applyEvent(qc, 'S20', edited({}))
    expect(inv).not.toHaveBeenCalled()
  })
  it('a save the page already took from its own answer is not taken again', () => {
    const qc = new QueryClient()
    qc.setQueryData(['species', 'S20'], sp('h1', 1.3)) // useField applied the answer first
    const inv = vi.spyOn(qc, 'invalidateQueries')
    applyEvent(qc, 'S20', edited({}))
    expect(inv).not.toHaveBeenCalledWith({ queryKey: ['species', 'S20'] })
    expect((qc.getQueryData<Species>(['species', 'S20'])!.file as { spine?: unknown }).spine).toEqual({ tail: { length: 1.3 } })
  })
  it('refetches when the copy is not at the edit\'s base, when the ops are missing, and for a direct file edit', () => {
    for (const [held, e] of [[sp('hX', 1.25), edited({})], [sp('h0', 1.25), edited({ ops: null })], [sp('h0', 1.25), edited({ base: undefined, ops: undefined })]] as const) {
      const qc = new QueryClient()
      qc.setQueryData(['species', 'S20'], held)
      const inv = vi.spyOn(qc, 'invalidateQueries')
      applyEvent(qc, 'S20', e)
      expect(inv).toHaveBeenCalledWith({ queryKey: ['species', 'S20'] })
    }
  })
  it('jobs that land together are one state sync now and one more at the end of the gap', async () => {
    const qc = new QueryClient()
    qc.setQueryData(['species', 'S20'], sp('h0', 1.25))
    state.mockResolvedValue(stateOf('h0'))
    applyEvent(qc, 'S20', ev('done', { job: 'j1' }))
    applyEvent(qc, 'S20', ev('done', { job: 'j2', kind: 'check' }))
    applyEvent(qc, 'S20', ev('done', { job: 'j3', kind: 'check' }))
    expect(state).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(REFETCH_GAP_MS + 1)
    expect(state).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(REFETCH_GAP_MS * 3)
    expect(state).toHaveBeenCalledTimes(2)
    applyEvent(qc, 'S20', ev('done', { job: 'j4' })) // a lone job later is synced at once
    expect(state).toHaveBeenCalledTimes(3)
  })
})

describe('a finished job lays the species state over the copy the page holds', () => {
  beforeEach(() => { vi.useFakeTimers(); state.mockReset(); extremes.mockReset() })
  afterEach(() => vi.useRealTimers())
  const at = (qc: QueryClient) => qc.getQueryData<Species>(['species', 'S20'])!

  it('takes the views, the check rows and the undo flags, and keeps the file, with no refetch of the species', async () => {
    const qc = new QueryClient()
    qc.setQueryData(['species', 'S20'], sp('h0', 1.25))
    const inv = vi.spyOn(qc, 'invalidateQueries')
    const rows = [{ id: 'ranges', state: 'pass' }]
    state.mockResolvedValue(stateOf('h0', { checks: { hash: 'h0', fresh: true, rows, counts: { total: 1, fail: 0, warn: 0, need: 0, passed: 1 } }, views: [{ mode: 'clay', az: 0, size: 608, key: 'k1', ready: true }], undo: { undo: true, redo: false } }))
    await syncState(qc, 'S20')
    expect([at(qc).checks?.fresh, at(qc).checks?.rows, at(qc).views[0].key, at(qc).undo, at(qc).hash]).toEqual([true, rows, 'k1', { undo: true, redo: false }, 'h0'])
    expect(at(qc).file).toEqual(sp('h0', 1.25).file)
    expect(inv).not.toHaveBeenCalled()
    expect(extremes).not.toHaveBeenCalled() // none held, none there
  })
  it('asks for the Check ends only when the state names a different result', async () => {
    const qc = new QueryClient()
    const mark = { fresh: true, running: false, key: 'e1', at: 5 }
    qc.setQueryData(['species', 'S20'], { ...sp('h0', 1.25), extremes: { ...mark, ends: [], rows: [] } })
    state.mockResolvedValue(stateOf('h0', { extremes: mark }))
    await syncState(qc, 'S20')
    expect(extremes).not.toHaveBeenCalled()
    state.mockResolvedValue(stateOf('h0', { extremes: { ...mark, key: 'e2', at: 9 } }))
    extremes.mockResolvedValue({ id: 'S20', hash: 'h0', extremes: { ...mark, key: 'e2', at: 9, ends: [{ id: 'x' }], rows: [] } })
    await syncState(qc, 'S20')
    expect(extremes).toHaveBeenCalledTimes(1)
    expect(at(qc).extremes?.key).toBe('e2')
    expect(at(qc).extremes?.ends).toEqual([{ id: 'x' }])
  })
  it('refetches the whole species when the state is for another hash, when none is held, and when the call fails', async () => {
    for (const [held, call] of [[sp('hX', 1), () => state.mockResolvedValue(stateOf('h0'))], [undefined, () => state.mockResolvedValue(stateOf('h0'))], [sp('h0', 1), () => state.mockRejectedValue(new Error('offline'))]] as const) {
      state.mockReset()
      call()
      const qc = new QueryClient()
      if (held) qc.setQueryData(['species', 'S20'], held)
      const inv = vi.spyOn(qc, 'invalidateQueries')
      await syncState(qc, 'S20')
      expect(inv).toHaveBeenCalledWith({ queryKey: ['species', 'S20'] })
    }
  })
})

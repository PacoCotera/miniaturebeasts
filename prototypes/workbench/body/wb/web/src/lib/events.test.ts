import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { NO_JOBS, applyEvent, reduceJobs, type JobsState, type WbEvent } from './events'

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
  it('writes the job list, and an edit or a finished job refetches the species', () => {
    const qc = new QueryClient()
    const inv = vi.spyOn(qc, 'invalidateQueries')
    applyEvent(qc, 'S20', ev('queued'), 10)
    expect(qc.getQueryData<JobsState>(['jobs', 'S20'])?.jobs.j1.state).toBe('queued')
    expect(inv).not.toHaveBeenCalled()
    applyEvent(qc, 'S20', ev('edited', { job: undefined, actor: 'agent-3' }))
    applyEvent(qc, 'S20', ev('done'))
    expect(inv).toHaveBeenCalledTimes(7) // the species, the Variety sheet and the goldens, for each; the forms too, for the edit
    expect(inv).toHaveBeenCalledWith({ queryKey: ['species', 'S20'] })
    expect(inv).toHaveBeenCalledWith({ queryKey: ['variety', 'S20'] })
    expect(inv).toHaveBeenCalledWith({ queryKey: ['forms', 'S20'] })
    expect(inv).toHaveBeenLastCalledWith({ queryKey: ['goldens', 'S20'] })
    expect(qc.getQueryData<JobsState>(['jobs', 'S20'])?.jobs).toEqual({})
  })
  it('a superseded job is not a failure to refetch for', () => {
    const qc = new QueryClient()
    const inv = vi.spyOn(qc, 'invalidateQueries')
    applyEvent(qc, 'S20', ev('failed', { superseded: true }))
    expect(inv).not.toHaveBeenCalled()
  })
})

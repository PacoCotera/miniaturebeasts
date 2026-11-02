import { useEffect } from 'react'
import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'

// The server's events (spec 6.3, wb/server.py): queued, running, done, failed, edited.
export type WbEvent = { id: number; type: 'queued' | 'running' | 'done' | 'failed' | 'edited'; species: string; t: string; job?: string; kind?: string; actor?: string | null; progress?: number; superseded?: boolean; key?: string; urls?: string[]; error?: string; field?: string }
export const EVENT_TYPES: WbEvent['type'][] = ['queued', 'running', 'done', 'failed', 'edited']

export type JobRow = { id: string; kind: string; state: 'queued' | 'running'; since: number; actor: string | null; progress?: number }
export type JobsState = { jobs: Record<string, JobRow> }
export const NO_JOBS: JobsState = { jobs: {} }

// queued and running put a job on the indicator; done and failed take it off. Pure, so it is tested alone.
export function reduceJobs(s: JobsState, ev: WbEvent, now: number): JobsState {
  if (!ev.job) return s
  const jobs = { ...s.jobs }
  if (ev.type === 'queued') jobs[ev.job] = { id: ev.job, kind: ev.kind ?? 'job', state: 'queued', since: now, actor: ev.actor ?? null }
  else if (ev.type === 'running') jobs[ev.job] = { id: ev.job, kind: ev.kind ?? jobs[ev.job]?.kind ?? 'job', state: 'running', since: jobs[ev.job]?.since ?? now, actor: ev.actor ?? jobs[ev.job]?.actor ?? null, progress: ev.progress }
  else if (ev.type === 'done' || ev.type === 'failed') delete jobs[ev.job]
  else return s
  return { jobs }
}

// What an event does to the query cache: the job list for the indicator; a finished job or an edit refetches the species (its pictures, its history).
export function applyEvent(qc: QueryClient, species: string, ev: WbEvent, now = Date.now()): void {
  qc.setQueryData<JobsState>(['jobs', species], (prev) => reduceJobs(prev ?? NO_JOBS, ev, now))
  if (ev.type === 'done' || ev.type === 'edited' || (ev.type === 'failed' && !ev.superseded)) void qc.invalidateQueries({ queryKey: ['species', species] })
}

export function useSpeciesEvents(species: string): void {
  const qc = useQueryClient()
  useEffect(() => {
    qc.setQueryData<JobsState>(['jobs', species], NO_JOBS)
    const es = new EventSource(`/events?species=${encodeURIComponent(species)}`)
    const on = (e: MessageEvent) => applyEvent(qc, species, JSON.parse(e.data) as WbEvent)
    for (const t of EVENT_TYPES) es.addEventListener(t, on as EventListener)
    es.onopen = () => qc.setQueryData(['connected', species], true)
    es.onerror = () => qc.setQueryData(['connected', species], false)
    return () => es.close()
  }, [species, qc])
}

export function useJobs(species: string): JobRow[] {
  const { data } = useQuery<JobsState>({ queryKey: ['jobs', species], queryFn: () => NO_JOBS, initialData: NO_JOBS, staleTime: Infinity })
  return Object.values(data.jobs).sort((a, b) => a.since - b.since)
}

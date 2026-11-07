import { useEffect } from 'react'
import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'
import { speciesExtremes, speciesState, type Entry, type Species } from './api'
import { followEdit, sameExtremes } from './patch'
import { apiPath } from './prefix'

// The server's events (spec 6.3, wb/server.py): queued, running, done, failed, edited.
export type WbEvent = { id: number; type: 'queued' | 'running' | 'done' | 'failed' | 'edited' | 'gate'; species: string; t: string; job?: string; kind?: string; actor?: string | null; progress?: number; superseded?: boolean; key?: string; urls?: string[]; error?: string; field?: string
  // an edited event from an API save: the hash before and after, the ops without their tests, the log entries and the undo flags (a direct file edit has none)
  base?: string; hash?: string; ops?: import('./patch').Op[] | null; entries?: Entry[]; undo?: boolean; redo?: boolean }
export const EVENT_TYPES: WbEvent['type'][] = ['queued', 'running', 'done', 'failed', 'edited', 'gate']

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

// When a job lands the file has not moved: only the pictures and the check rows have. The page asks for the species' state (about 4 KB, tagged, so an unchanged one is a 304) and lays it over the copy it holds;
// the Check ends block comes only when the state says there is a new one. A state for another hash, or a failure, is the full refetch.
export async function syncState(qc: QueryClient, species: string): Promise<void> {
  const key = ['species', species]
  const full = () => void qc.invalidateQueries({ queryKey: key })
  try {
    const st = await speciesState(species)
    let s = qc.getQueryData<Species>(key)
    if (!s || s.hash !== st.hash) return full()
    let extremes = s.extremes ?? null
    if (!sameExtremes(extremes, st.extremes)) extremes = (await speciesExtremes(species)).extremes
    s = qc.getQueryData<Species>(key)
    if (!s || s.hash !== st.hash) return full()
    qc.setQueryData<Species>(key, { ...s, views: st.views, checks: st.checks, extremes, undo: st.undo, lease: st.lease, error: st.error })
  } catch { full() }
}
// Jobs of one edit land together, so a sync that follows another within REFETCH_GAP_MS is folded into one more at the end of the gap.
export const REFETCH_GAP_MS = 400
const gaps = new WeakMap<QueryClient, Map<string, { timer: ReturnType<typeof setTimeout>; again: boolean }>>()
export function refetchSpecies(qc: QueryClient, species: string): void {
  const m = gaps.get(qc) ?? gaps.set(qc, new Map()).get(qc)!
  const open = m.get(species)
  if (open) { open.again = true; return }
  void syncState(qc, species)
  const g = { timer: setTimeout(() => { m.delete(species); if (g.again) void syncState(qc, species) }, REFETCH_GAP_MS), again: false }
  m.set(species, g)
}

// The hash of the last edit taken, per species: an edit is taken once, whether the save's answer or the event reached the page first.
const taken = new WeakMap<QueryClient, Map<string, string>>()

// What an event does to the query cache: the job list for the indicator; a finished job refetches the species (its pictures, its check rows); an edit is followed in the copy the page holds when its ops say how (lib/patch.ts) and refetches the species only when they do not.
export function applyEvent(qc: QueryClient, species: string, ev: WbEvent, now = Date.now()): void {
  qc.setQueryData<JobsState>(['jobs', species], (prev) => reduceJobs(prev ?? NO_JOBS, ev, now))
  if (ev.type === 'edited') {
    const m = taken.get(qc) ?? taken.set(qc, new Map()).get(qc)!
    if (ev.hash && m.get(species) === ev.hash) return // this hash was taken already: one invalidation per hash
    if (ev.hash) m.set(species, ev.hash)
    const how = ev.hash && ev.base ? followEdit(qc, species, { base: ev.base, hash: ev.hash, ops: ev.ops ?? null, entries: ev.entries ?? [], undo: !!ev.undo, redo: !!ev.redo }) : 'refetch'
    if (how === 'refetch') void qc.invalidateQueries({ queryKey: ['species', species] })
  } else if (ev.type === 'done' || (ev.type === 'failed' && !ev.superseded)) refetchSpecies(qc, species)
  if (ev.type === 'done' || ev.type === 'edited') void qc.invalidateQueries({ queryKey: ['variety', species] }) // a tile landed, or the file moved on
  if (ev.type === 'done' || ev.type === 'edited') void qc.invalidateQueries({ queryKey: ['goldens', species] }) // goldens made or compared, or the file moved on
  if (ev.type === 'gate' || ev.type === 'edited') void qc.invalidateQueries({ queryKey: ['gate', species] }) // a round asked for, ticked, signed, or voided by an edit
  if (ev.type === 'edited') void qc.invalidateQueries({ queryKey: ['forms', species] }) // the parts and their fields come from the file
}

export function useSpeciesEvents(species: string): void {
  const qc = useQueryClient()
  useEffect(() => {
    qc.setQueryData<JobsState>(['jobs', species], NO_JOBS)
    const es = new EventSource(apiPath(`/events?species=${encodeURIComponent(species)}`))
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

import { queryOptions } from '@tanstack/react-query'
import type { ChecksState } from './checks'
import type { ExtremesState, Genome } from './genes'

export type Entry = { t: string; actor: string; role: string | null; agent: boolean; via: string; op: string; path: string; old: unknown; new: unknown; hash_before: string; hash_after: string }
export type ViewRef = { mode: string; az: number; size: number; key: string; ready: boolean }
export type Lease = { holder: string; agent: boolean; since: string }
export type Species = {
  id: string; hash: string; error: string | null; lease: Lease | null; history: Entry[]; views: ViewRef[]; checks: ChecksState | null; extremes?: ExtremesState | null; labels?: Record<string, string>
  file: { name?: string; species?: string; body_plan?: string; plan?: string; genome?: Genome; expressions?: import("./genes").Expression[] }
}
export type SpeciesRow = { id: string; name?: string; hash: string; error: string | null }

// The page's token lives in the session: `?token=` is read once and removed from the address (spec 6.2). A page without one can read, not edit.
const KEY = 'wb.token'
export function captureToken(): void {
  const u = new URL(window.location.href)
  const t = u.searchParams.get('token')
  if (t) {
    sessionStorage.setItem(KEY, t)
    u.searchParams.delete('token')
    window.history.replaceState(null, '', u.pathname + u.search + u.hash)
  }
}
export const getToken = (): string | null => sessionStorage.getItem(KEY)

export class ApiError extends Error {
  constructor(public status: number, message: string, public field?: string | null) { super(message) }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const tok = getToken()
  if (tok) headers.Authorization = `Bearer ${tok}`
  const r = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new ApiError(r.status, j.error ?? r.statusText, j.field)
  return j as T
}

export const speciesList = () => queryOptions({ queryKey: ['species-list'], queryFn: () => call<SpeciesRow[]>('GET', '/api/species'), staleTime: 30_000 })
export const speciesOne = (id: string) => queryOptions({ queryKey: ['species', id], queryFn: () => call<Species>('GET', `/api/species/${encodeURIComponent(id)}`), staleTime: Infinity })
export const patchSpecies = (id: string, ops: unknown[]) => call('PATCH', `/api/species/${encodeURIComponent(id)}`, ops)
export const renderViews = (id: string, mode: string) => call('POST', `/api/species/${encodeURIComponent(id)}/jobs`, { kind: 'render', args: { modes: [mode], az: [0, 32, 90, 180], sizes: [304, 608] } })
export const casUrl = (key: string) => `/cas/${key}.png`
export type JobAnswer = { id: string; state: string; error?: string; result?: { views?: { mode: string; az: number; size: number; key: string }[] } }
export const postJob = (id: string, kind: string, args: unknown) => call<JobAnswer>('POST', `/api/species/${encodeURIComponent(id)}/jobs`, { kind, args })
export const getJob = (jid: string, wait = 20) => call<JobAnswer>('GET', `/api/jobs/${jid}?wait=${wait}`)
// The clay of one genome at one angle: a render job (a cache hit answers at once), then the key of its picture.
export async function genomePicture(id: string, genome: string, az: number, size = 608): Promise<string | null> {
  let j = await postJob(id, 'render', { genome, modes: ['clay'], az: [az], sizes: [size] })
  for (let n = 0; j.state !== 'done' && n < 12; n++) {
    if (j.state === 'failed' || j.state === 'superseded') return null
    j = await getJob(j.id)
  }
  return j.result?.views?.[0]?.key ?? null
}
export const checkEnds = (id: string) => postJob(id, 'check', { stage: 'extremes' })

// Chapter 9: how often each look shows (spec 4.2) and a mibi's genome string. Both are computed on the server from the file alone (no build, no render), keyed by the file's hash so an edit refetches.
export const freqOne = (id: string, hash: string) => queryOptions({ queryKey: ['freq', id, hash], queryFn: () => call<import('./genes').Freq>('GET', `/api/species/${encodeURIComponent(id)}/freq`), staleTime: 60_000 })
export type GenomeText = { species: string; genome: string; string: string; code: string | null; length: number; version: number }
export const stringOne = (id: string, hash: string, genome: string) => queryOptions({ queryKey: ['string', id, hash, genome], queryFn: () => call<GenomeText>('GET', `/api/species/${encodeURIComponent(id)}/string?genome=${encodeURIComponent(genome)}`), staleTime: 60_000, retry: false })

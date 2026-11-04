import { queryOptions } from '@tanstack/react-query'
import { call, postJob } from './api'
import { apiPath } from './prefix'

// Chapter 12: goldens. The state comes from files alone (`GET /api/species/<id>/goldens`): the golden of every picture in the render set, each `same`, `changed`, `missing` or `stale`.
// A key that moved makes every golden `stale` until a diff has drawn the set again (a `golden` job); then each is `same` or `changed`, with the share of pixels moved and a heat map.
export type GState = 'same' | 'changed' | 'missing' | 'stale'
export type GEntry = { id: string; state: GState; output?: string; variant?: string; style?: string; age?: string; pose?: string; az?: number; size?: number[] | null; kind?: string; group?: string; label?: string; file?: string; pct?: number; maxdiff?: number; now?: string; heat?: string }
export type GCause = { kind: 'file' | 'framework' | 'lookdev'; field?: string | null; old: unknown; new: unknown; by?: string | null; at?: string | null }
export type GStamp = { file: string; framework: string; lookdev: string; key: string; made_by: string; made_at: string; set?: string }
export type Goldens = { species: string; have: boolean; release: boolean; current: { file: string; framework: string; lookdev: string; key: string }; entries: GEntry[]; totals: Record<GState | 'all', number>; stamp: GStamp | null; causes: GCause[]; diffed: { at: string; by?: string } | null }

export const goldensOne = (id: string, hash: string) => queryOptions({ queryKey: ['goldens', id, hash], queryFn: () => call<Goldens>('GET', `/api/species/${encodeURIComponent(id)}/goldens`), staleTime: 10_000 })
export const goldenJob = (id: string, action: 'make' | 'diff') => postJob(id, 'golden', { action })
export const goldenUrl = (id: string, gid: string) => apiPath(`/api/species/${encodeURIComponent(id)}/goldens/file?id=${encodeURIComponent(gid)}`)

export const STATE_ORDER: GState[] = ['same', 'changed', 'missing', 'stale']
// The quiet totals line of the navigator: "58 same · 1 changed · 2 stale" (a state with none is left out).
export const totalsLine = (t: Goldens['totals']) => STATE_ORDER.filter((s) => t[s] > 0).map((s) => `${t[s]} ${s}`).join(' · ')

export type Group = { name: string; rows: GEntry[] }
export const groupsOf = (g: Goldens): Group[] => {
  const out: Group[] = []
  for (const e of g.entries) {
    if (!e.group) continue
    const hit = out.find((x) => x.name === e.group) ?? (out.push({ name: e.group, rows: [] }), out[out.length - 1])
    hit.rows.push(e)
  }
  return out
}
export const pick = (g: Goldens | undefined, sel: string | null): GEntry | null => (g?.entries.filter((e) => e.group) ?? []).find((e) => e.id === sel) ?? g?.entries.find((e) => e.state === 'changed' && e.group) ?? g?.entries.find((e) => e.group) ?? null

// What the inspector says moved the key: the field with its old and new value, or the framework or look-dev.
export const causeText = (c: GCause) => (c.kind === 'file' ? c.field ?? 'the file' : c.kind === 'framework' ? 'Framework' : 'Look-dev')
export const pctText = (p: number) => `${p >= 10 ? p.toFixed(0) : p >= 1 ? p.toFixed(1) : p.toFixed(2)}%`
export const sizeText = (e: GEntry) => (e.size ? `${e.size[0]}×${e.size[1]}` : '')

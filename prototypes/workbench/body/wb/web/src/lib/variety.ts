import { queryOptions } from '@tanstack/react-query'
import { call, postJob } from './api'

// Chapter 10: the Variety sheet. The numbers come from the file alone (`GET /api/species/<id>/variety`); the tiles are clay renders of `seed:N` genomes in the cache, made by a `variety` job.
export type VTile = { key: string; ready: boolean }
export type VFail = { rule: string; label: string; words: string }
export type VInd = { n: number; genome: string; hue: number; loud: string[]; looks: Record<string, string | null>; fails: VFail[]; tiles: Record<'304' | '96' | '48', VTile> }
export type VLook = { id: string; locus: string; look: string; label: string; count: number; who: number[]; age: string | null; wild: number; cross: number; cross_of: number; rule: string | null; order: string[] | null; modifiers: string[] }
export type VRule = { id: string; label: string; fail: string; broken: number[] }
export type VRun = { key: string; t: string; spec_hash: string; n: number; seed: number; tiles: { n: number; genome: string; keys: Record<string, string>; fails: string[] }[]; failing: number[] }
export type Variety = { n: number; seed: number; file_seed: number; max_loud: number; wild_n: number; individuals: VInd[]; looks: VLook[]; rules: VRule[]; failing: number[]; species: string; hash: string; key: string; ran: boolean; previous: VRun | null }

export const varietyOne = (id: string, hash: string, seed: number | null) =>
  queryOptions({ queryKey: ['variety', id, hash, seed], queryFn: () => call<Variety>('GET', `/api/species/${encodeURIComponent(id)}/variety${seed === null ? '' : `?seed=${seed}`}`), staleTime: 30_000 })
export const runSheet = (id: string, seed: number | null) => postJob(id, 'variety', seed === null ? {} : { seed })

// words.md st.var.fail: "No. 7: {the rule's own fail words}"; the same line is the Checks drawer's ck.ember row.
export const failLine = (n: number, f: VFail) => `No. ${n}: ${f.words}`
export const crossCount = (l: VLook) => Math.round((l.cross * l.cross_of) / 100)
export const ofSheet = (l: VLook, n: number) => `${l.count}/${n}`

// The look the address names, `locus=look`, and the tiles it keeps lit. With none picked every tile is lit.
export const lookOf = (v: Variety | undefined, sel: string | null) => v?.looks.find((l) => l.id === sel) ?? null
export const lit = (l: VLook | null, n: number) => !l || l.who.includes(n)
export const litCount = (v: Variety, l: VLook | null) => (l ? l.count : v.n)
export const ready = (v: Variety) => v.individuals.filter((i) => i.tiles['304'].ready).length

// Where a tile's run before is: the previous run's own tile for the same individual (its keys are in the cache or not; the picture says so).
export const previousKey = (v: Variety, n: number, size: '304' | '96' | '48' = '304') => v.previous?.tiles.find((t) => t.n === n)?.keys[size] ?? null

// The seed a new sheet draws: the next after the one on screen.
export const nextSeed = (v: Variety | undefined, url: number | null) => (url ?? v?.seed ?? 0) + 1

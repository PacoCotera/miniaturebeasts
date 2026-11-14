import { queryOptions } from '@tanstack/react-query'
import { call } from './api'

// The family cards of New species (chunk 6): one per family of the language registry, then "From a sculpt". A card is ready when its family has a template; the rest say "not yet".
export type Armature = { layout: string; version: number; spine: number; legs: number; legBones: number; tail: number; sockets: { bone: string; layout: string; mirror: boolean }[] }
export type FamilyCard = {
  id: string; name: string; state: 'ready' | 'not yet'
  plan?: string; path?: 'mesh' | 'hybrid' | 'cage'; template_path?: string | null; legs?: number; contact?: string; gait?: string; fix?: string
  armature?: Armature; bands?: { headShareMin: number; neck: [number, number]; legShareMax: number }; why?: string
}
export const familiesOne = () => queryOptions({ queryKey: ['families'], queryFn: () => call<FamilyCard[]>('GET', '/api/families'), staleTime: Infinity })
export const createSpecies = (id: string, family: string) => call<{ id: string; family: string; path: string; hash: string }>('POST', '/api/species', { id, family })

export const isReady = (c: FamilyCard) => c.state === 'ready'
export const isSculpt = (c: FamilyCard) => c.id === 'sculpt'
export const validId = (id: string) => /^S\d\d$/.test(id)
// The next free species id: S and two digits, above every id there is.
export function nextId(ids: string[]): string {
  const n = Math.max(0, ...ids.map((i) => /^S(\d\d)$/.exec(i)?.[1]).filter(Boolean).map(Number))
  return `S${String(Math.min(99, n + 1)).padStart(2, '0')}`
}
export const pathWord = (p?: string) => (p === 'mesh' ? 'Sculpt' : p === 'hybrid' ? 'Sculpt and rig' : p === 'cage' ? 'Cage' : '')

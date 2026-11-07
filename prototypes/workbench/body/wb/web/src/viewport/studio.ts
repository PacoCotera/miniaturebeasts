import { queryOptions } from '@tanstack/react-query'
import { call } from '../lib/api'
import type { FanLayout } from './fan'

// What the viewport draws a mesh file from (`GET /api/species/<id>/studio`): the studio GLB of the sculpt and of each part, by the sha pinned in its sidecar (served immutable at /cas/<sha>.glb),
// the sculpt's standing height, eye stations and sockets (sculpt units, z up), each part's layouts, and the land's colours for the coat preview.
export type StudioGlb = { id: string; sha256: string; bytes: number; url: string; morph_targets: string[]; bones: string[] }
export type EyeStation = { id: string; point: [number, number, number]; normal: [number, number, number]; radius: number }
export type SocketStation = { id: string; bone: string; point: [number, number, number]; layout: string; mirror?: boolean }
export type StudioSculpt = StudioGlb & { height: number; stations: { eyes: EyeStation[]; sockets: SocketStation[] } }
export type StudioPart = Partial<StudioGlb> & { socket?: string; mirror?: boolean; layouts?: Record<string, FanLayout> }
export type Studio = { sculpt: StudioSculpt | null; parts: StudioPart[]; look: { land: { body: string; marking: string; accent: string } | null; iris: string | null } }

export const studioOne = (id: string) => queryOptions({ queryKey: ['studio', id], queryFn: () => call<Studio>('GET', `/api/species/${encodeURIComponent(id)}/studio`), staleTime: 5 * 60_000 })

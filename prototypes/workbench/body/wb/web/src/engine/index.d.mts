import type { Freq } from '../lib/genes'
import type { SheetNumbers } from '../lib/variety'

export const catalogue: { id: string; version: number; digest: string }
// How often each look shows, from the file alone; null for a file with no genome block.
export function freqOf(doc: unknown, n?: number): Freq | null
// The Variety sheet's numbers and rules (no tiles); null for a species with no sampler (S20 has one).
export function sheet(doc: unknown, n?: number | null, seed?: number | null, wildN?: number): SheetNumbers | null
export function meshCopies(doc: unknown, i: number, seed: number): { values: Record<string, number>; copies: Record<string, [number | string, number | string]> }
export function draw(i: number, seed?: number): unknown
export function genomeOf(ind: unknown): Record<string, [number | string, number | string]>
export function specimen(): unknown
export function freq(genome: unknown, expressions: unknown[], n?: number, seed?: number, docId?: string | null): Omit<Freq, 'species'>

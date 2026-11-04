import { queryOptions } from '@tanstack/react-query'
import { call } from './api'
import type { CheckMeta, CheckRow } from './checks'

// Chapter 21: the Shape forms. The server reads the file and the plan and says which fields a part has (`GET /api/species/<id>/forms`): each one with its schema label, unit, band and kind.
// The page keeps no list of fields: a field's kind picks its control (the registry in ui/Field.tsx), its pointer reads the value from the file, and a JSON patch at that pointer writes it.
export type FieldDesc = {
  id: string // dotted path, as the checks and the messages name it
  ptr: string // JSON pointer into the file
  label: string; full: string; help: string
  type: 'number' | 'int' | 'enum' | 'bool' | 'text' | string
  unit: string
  range?: [number, number] | null; step?: number; options?: string[]
}
export type OutlineRow = { id: string; label: string; kind: 'range' | 'part' | 'section'; under: string | null; sw: string | null }
export type PartForm = { label: string; kind: 'range' | 'part'; fields: FieldDesc[] }
export type Forms = { plan: string; outline: OutlineRow[]; parts: Record<string, PartForm> }

export const formsOne = (id: string) => queryOptions({ queryKey: ['forms', id], queryFn: () => call<Forms>('GET', `/api/species/${encodeURIComponent(id)}/forms`), staleTime: Infinity })

// ---- the file's own value at a pointer, and a copy with another one there (the optimistic write)
const toks = (ptr: string) => ptr.split('/').slice(1).map((t) => t.replace(/~1/g, '/').replace(/~0/g, '~'))
export function getAt(file: unknown, ptr: string): unknown {
  let cur: unknown = file
  for (const t of toks(ptr)) {
    if (cur === null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[t]
  }
  return cur
}
export function setAt<T>(file: T, ptr: string, value: unknown): T {
  const t = toks(ptr)
  const rec = (node: unknown, i: number): unknown => {
    if (i === t.length) return value
    const copy: unknown = Array.isArray(node) ? [...node] : { ...(node as object) }
    ;(copy as Record<string, unknown>)[t[i]] = rec((node as Record<string, unknown>)?.[t[i]], i + 1)
    return copy
  }
  return rec(file, 0) as T
}

// ---- numbers: what a field shows, what a typed or scrubbed value becomes
export const fmtNum = (v: number) => String(Math.round(v * 1e3) / 1e3)
// A typed value: a decimal comma is a point; anything that is not a number is not accepted (null), so the field goes back to what it had.
export function parseNum(text: string): number | null {
  const t = text.trim().replace(',', '.')
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(t)) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}
const decimals = (step: number) => Math.max(0, Math.min(6, Math.ceil(-Math.log10(step) - 1e-9)))
export const snap = (v: number, step: number) => Number(v.toFixed(decimals(step)))
export const clamp = (v: number, r?: [number, number] | null) => (r ? Math.min(r[1], Math.max(r[0], v)) : v)
// Dragging a value sideways: the whole band takes `SCRUB_PX` of travel, a held Shift takes ten times as much for the same band. The result is clamped to the band and lands on the field's step.
export const SCRUB_PX = 240
export function scrub(start: number, dx: number, f: Pick<FieldDesc, 'range' | 'step'>, fine = false): number {
  const step = f.step ?? 0.01
  const span = f.range ? f.range[1] - f.range[0] : step * 100
  return clamp(snap(start + (dx / SCRUB_PX) * span * (fine ? 0.1 : 1), step), f.range)
}
// Where a value sits on its bar, 0 to 100: beyond the band it is pinned to the end it passed.
export const barPos = (v: number, r: [number, number]) => (r[1] === r[0] ? 0 : Math.min(100, Math.max(0, ((v - r[0]) / (r[1] - r[0])) * 100)))

// ---- checks: a field is driven by a check when the check lists it (or a path it sits under), and the mark turns red while that check fails
export const drives = (listed: string, id: string) => listed === id || id.startsWith(listed + '.') || listed.startsWith(id + '.')
export function failingFor(id: string, rows: CheckRow[], metas: Record<string, CheckMeta>): CheckRow | null {
  return rows.find((r) => r.state === 'fail' && (metas[r.id]?.fields ?? []).some((f) => drives(f, id))) ?? null
}

// ---- the registry: a field's kind picks its control
export type Control = 'number' | 'segmented' | 'select' | 'switch' | null
export const SEGMENTED_MAX = 3
export function controlFor(f: Pick<FieldDesc, 'type' | 'options'>): Control {
  if (f.type === 'number' || f.type === 'int') return 'number'
  if (f.type === 'bool') return 'switch'
  if (f.type === 'enum') return (f.options?.length ?? 0) <= SEGMENTED_MAX ? 'segmented' : 'select'
  return null
}

// ---- autosave: a change lands after the last one has rested for 0.6 s, as one patch that first tests the value the page last saw (a hand that changed it meanwhile is not overwritten).
export const AUTOSAVE_MS = 600
export const patchFor = (ptr: string, saved: unknown, next: unknown) => [{ op: 'test', path: ptr, value: saved }, { op: 'replace', path: ptr, value: next }]

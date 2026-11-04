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
  names?: Record<string, [string, string]> // an option's name for the eye and its short word, where the file has them (looks)
}
export type OutlineRow = { id: string; label: string; kind: 'range' | 'part' | 'section'; under: string | null; sw: string | null }
// What the player sees of a part (spec 2.3): the toy it feeds, the picture chips (family and the short word play shows, the one in force on) and the slider with its steps.
export type PlayToy = { toy: string; chips: { family: string; word: string; on: boolean; ptr: string }[]; slider: { ptr: string; range: [number, number]; steps: number } | null }
export type PartForm = { label: string; kind: 'range' | 'part'; fields: FieldDesc[]; play?: PlayToy | null }
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
export type Control = 'number' | 'segmented' | 'select' | 'switch' | 'weights' | null
export const SEGMENTED_MAX = 3
// Up to three options side by side, as long as their names fit the row; look names ("Lantern tail") are long, and a select takes them in a line each.
export const SEGMENTED_CHARS = 24
export function controlFor(f: Pick<FieldDesc, 'type' | 'options' | 'names'>): Control {
  if (f.type === 'number' || f.type === 'int') return 'number'
  if (f.type === 'bool') return 'switch'
  if (f.type === 'weights') return 'weights'
  if (f.type === 'enum') return (f.options?.length ?? 0) <= SEGMENTED_MAX && (f.options ?? []).reduce((n, o) => n + optName(f, o).length, 0) <= SEGMENTED_CHARS ? 'segmented' : 'select'
  return null
}

// ---- autosave: a change lands after the last one has rested for 0.6 s, as one patch that first tests the value the page last saw (a hand that changed it meanwhile is not overwritten).
export const AUTOSAVE_MS = 600
export const patchFor = (ptr: string, saved: unknown, next: unknown) => [{ op: 'test', path: ptr, value: saved }, { op: 'replace', path: ptr, value: next }]

// ---- families: how often each shows, as shares that add up to 1. Moving one takes from (or gives to) the others in proportion to what they have, so a family at 0 stays at 0 until it is moved.
export const WEIGHT_STEP = 0.01
export function rebalance(weights: number[], i: number, to: number): number[] {
  const v = Math.min(1, Math.max(0, snap(to, WEIGHT_STEP)))
  const rest = weights.reduce((a, w, j) => (j === i ? a : a + w), 0)
  const left = 1 - v
  const out = weights.map((w, j) => (j === i ? v : rest > 0 ? snap((w / rest) * left, 0.001) : snap(left / (weights.length - 1), 0.001)))
  const k = out.reduce((a, w) => a + w, 0)
  // the rounding is put on the biggest of the others so the shares add up to 1 exactly
  const others = out.map((w, j) => [w, j] as const).filter(([, j]) => j !== i).sort((a, b) => b[0] - a[0])
  if (others.length) out[others[0][1]] = snap(out[others[0][1]] + (1 - k), 0.001)
  return out
}
// An option as the eye reads it: the file's look name, else the id spelled out.
export const optName = (d: Pick<FieldDesc, 'names'>, o: string) => d.names?.[o]?.[0] ?? o.charAt(0).toUpperCase() + o.slice(1).replace(/-/g, ' ')
export const pct = (w: number) => `${Math.round(w * 100)}%`
// The step a slider of `steps` stops is on (0 to steps-1), for a value in its band.
export const stepOf = (v: number, r: [number, number], steps: number) => Math.round(Math.min(1, Math.max(0, (v - r[0]) / (r[1] - r[0]))) * (steps - 1))

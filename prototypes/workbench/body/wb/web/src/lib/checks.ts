import { queryOptions } from '@tanstack/react-query'
import type { Entry } from './api'

// The check rows the server measured (spec 9) and what the page says about each: one place for the counts, so the pill and the drawer are the same number (studio-ui 8.3).
export type Proof = { mode: string; az: number; key: string; ready: boolean; path?: string | null }
export type CheckRow = { id: string; state: 'pass' | 'warn' | 'fail'; value: number | string | null; limit: number | string | null; measure: string; stage: string; version: number; proof: Proof | null; extra?: { fail?: string | null; parts?: string[]; field?: string } }
export type CheckMeta = { id: string; name: string; fail: string; stage: string; rule: { date: string; words: string }; limit: { text: string; value: unknown }; part: string[]; fields: string[]; play: string | null; az: number; mode: string }
export type ChecksState = { hash: string; fresh: boolean; rows: CheckRow[]; counts: { total: number; fail: number; warn: number; need: number; passed: number } }

export const checkMetas = () => queryOptions({ queryKey: ['checks-meta'], queryFn: async () => (await fetch('/api/checks')).json() as Promise<CheckMeta[]>, staleTime: Infinity })

export const needsYou = (rows: CheckRow[]) => rows.filter((r) => r.state === 'fail' || r.state === 'warn')

// words.md st.att: {n} to fix (fails); {n} need a look (warnings only); both together: {n} need you.
export function pillWords(rows: CheckRow[]): { text: string; kind: 'fail' | 'warn'; n: number } | null {
  const f = rows.filter((r) => r.state === 'fail').length, w = rows.filter((r) => r.state === 'warn').length, n = f + w
  if (!n) return null
  if (w === 0) return { text: `${n} to fix`, kind: 'fail', n }
  if (f === 0) return { text: n === 1 ? '1 needs a look' : `${n} need a look`, kind: 'warn', n }
  return { text: `${n} need you`, kind: 'fail', n }
}

// The fail line (words.md 5.12): the row's own, with its placeholders filled by the check, else the check's, placeholders dropped.
export const failLine = (r: CheckRow, m?: CheckMeta) => (r.extra?.fail ?? (m?.fail ?? r.id).replace(/\s*\{[^}]+\}\s*/g, ' ')).trim()
export const partsOf = (r: CheckRow, m?: CheckMeta) => r.extra?.parts ?? m?.part ?? []
export const dotted = (ptr: string) => ptr.split('/').filter(Boolean).join('.')

export function stateOfPart(rows: CheckRow[], metas: Record<string, CheckMeta>, part: string): 'fail' | 'warn' | null {
  const hit = needsYou(rows).filter((r) => partsOf(r, metas[r.id]).includes(part))
  return hit.some((r) => r.state === 'fail') ? 'fail' : hit.length ? 'warn' : null
}

// Who last moved a driving field: the last undo-log entry at or under its pointer; none means the plan's default (or the file as it came).
export function lastMover(history: Entry[], ptr: string): Entry | null {
  for (let i = history.length - 1; i >= 0; i--) if (history[i].path === ptr || history[i].path.startsWith(ptr + '/')) return history[i]
  return null
}

export const ORDER = { fail: 0, warn: 1, pass: 2 } as const
export const fmtVal = (v: number | string | null) => (v === null || v === undefined ? '–' : typeof v === 'number' ? (Number.isInteger(v) ? v.toLocaleString('en-US') : String(Math.round(v * 1e4) / 1e4)) : v)

import type { QueryClient } from '@tanstack/react-query'
import type { Entry, Species } from './api'
import { entryKey } from './edits'

// Following the server's own saves without asking for the file again. A save's answer and the `edited` event both say what changed (the ops, minus their tests), the hash the file had before (`base`) and the hash it has now.
// The page applies the ops to the copy it holds when that copy is at `base`, and takes the new hash; anything else (a gap, a direct file edit, a save the server could not describe) is a refetch, with If-None-Match.
export type Op = { op: 'add' | 'remove' | 'replace' | 'test'; path: string; value?: unknown }
export type Edit = { base: string; hash: string; ops: Op[] | null; entries: Entry[]; undo: boolean; redo: boolean }

const tokens = (ptr: string): string[] => {
  if (!ptr.startsWith('/')) throw new Error(`patch path '${ptr}' must start with /`)
  return ptr.slice(1).split('/').map((t) => t.replace(/~1/g, '/').replace(/~0/g, '~'))
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// RFC 6902, the subset the server speaks (replace, add, remove, test): a new document, the old one untouched, and only the nodes on the way to a change are copied. A path that is not there throws, as the server's does (400).
export function applyOps<T>(file: T, ops: Op[]): T {
  let doc: unknown = file
  for (const o of ops) {
    const t = tokens(o.path)
    if (!t.length) throw new Error('a patch cannot replace the whole file')
    const rec = (node: unknown, i: number): unknown => {
      const key = t[i]
      const last = i === t.length - 1
      if (node === null || typeof node !== 'object') throw new Error(`${o.path}: no such field`)
      if (Array.isArray(node)) {
        const n = last && o.op === 'add' && key === '-' ? node.length : Number(key)
        if (!Number.isInteger(n) || n < 0 || n > node.length || (n === node.length && !(last && o.op === 'add'))) throw new Error(`${o.path}: no such field`)
        const copy = [...node]
        if (!last) { const child = rec(node[n], i + 1); if (child === node[n]) return node; copy[n] = child } else if (o.op === 'test') { if (!same(node[n], o.value)) throw new Error(`${o.path}: the value is not what the patch tested`) } else if (o.op === 'replace') copy[n] = o.value
        else if (o.op === 'add') copy.splice(n, 0, o.value)
        else if (o.op === 'remove') copy.splice(n, 1)
        else throw new Error(`patch op '${o.op}' is not supported`)
        return o.op === 'test' && last ? node : copy
      }
      const obj = node as Record<string, unknown>
      if (!last) { if (!(key in obj)) throw new Error(`${o.path}: no such field`); const child = rec(obj[key], i + 1); return child === obj[key] ? obj : { ...obj, [key]: child } }
      if (o.op === 'test') { if (!(key in obj) || !same(obj[key], o.value)) throw new Error(`${o.path}: the value is not what the patch tested`); return obj }
      if (o.op === 'add') return { ...obj, [key]: o.value }
      if (!(key in obj)) throw new Error(`${o.path}: no such field`)
      if (o.op === 'replace') return { ...obj, [key]: o.value }
      if (o.op === 'remove') { const { [key]: _gone, ...rest } = obj; return rest }
      throw new Error(`patch op '${o.op}' is not supported`)
    }
    doc = rec(doc, 0)
  }
  return doc as T
}

// Is this the Check ends result the page holds? The state names it by its key, its freshness, whether a run is on it and when it finished.
type ExtremesMark = { fresh: boolean; running: boolean; key: string; at?: number | null }
export const sameExtremes = (a: ExtremesMark | null | undefined, b: ExtremesMark | null | undefined): boolean =>
  !a || !b ? !a === !b : a.fresh === b.fresh && a.running === b.running && a.key === b.key && (a.at ?? null) === (b.at ?? null)

export const HISTORY_KEPT = 5 // the species answer carries the last five log entries

// The species the page holds, after an edit: the file with the ops applied, the hash, the log entries, the undo flags. The check rows and the Check ends block are those of the file before, so they are marked stale until a job lands.
export function followEdit(qc: QueryClient, id: string, e: Edit): 'followed' | 'refetch' {
  const s = qc.getQueryData<Species>(['species', id])
  if (!s) return 'refetch'
  if (s.hash === e.hash) return 'followed' // this page already has it (the answer and the event both say so; the first one in wins)
  if (!e.ops || !e.base || s.hash !== e.base) return 'refetch'
  let file: Species['file']
  try { file = applyOps(s.file, e.ops) } catch { return 'refetch' }
  const seen = new Set(s.history.map(entryKey))
  const history = [...s.history, ...e.entries.filter((x) => !seen.has(entryKey(x)))].slice(-HISTORY_KEPT)
  qc.setQueryData<Species>(['species', id], { ...s, file, hash: e.hash, history, undo: { undo: e.undo, redo: e.redo }, checks: s.checks && { ...s.checks, fresh: false }, extremes: s.extremes && { ...s.extremes, fresh: false } })
  return 'followed'
}

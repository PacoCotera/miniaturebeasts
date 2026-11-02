import type { Entry, Lease } from './api'

// An agent holds the file for 10 minutes after its last edit (spec 6.2). The server's `lease` is used when it has one; until it does the undo log says who edited last.
export const LEASE_MS = 10 * 60 * 1000
export function leaseFrom(lease: Lease | null, history: Entry[], now = Date.now()): Lease | null {
  if (lease) return lease
  const last = history[history.length - 1]
  if (!last || !last.agent) return null
  const t = Date.parse(last.t)
  return now - t <= LEASE_MS ? { holder: last.actor, agent: true, since: last.t } : null
}

export const entryKey = (e: Entry) => `${e.t}|${e.path}|${e.hash_after}`

// Entries of the undo log not seen yet. The first look (seen = null) marks what is there and shows none.
export function newEntries(seen: Set<string> | null, history: Entry[]): Entry[] {
  return seen === null ? [] : history.filter((e) => !seen.has(entryKey(e)))
}

// The undo log's pointer /parts/tail/joints/2/len -> "tail len": containers and list positions dropped, the last two words, dashes and underscores as spaces.
export function fieldLabel(path: string): string {
  return path.split('/').filter((p) => p && !/^(spine|parts|joints|\d+)$/.test(p)).slice(-2).join(' ').replace(/[-_]/g, ' ')
}
export function fmtValue(v: unknown): string {
  if (typeof v === 'number') return String(Math.round(v * 1e4) / 1e4)
  if (typeof v === 'string') return v
  const s = JSON.stringify(v)
  return s.length > 24 ? s.slice(0, 23) + '…' : s
}
export const initials = (name: string) => {
  const m = /^([a-z])[a-z]*-(\d+)$/i.exec(name)
  return m ? m[1].toLowerCase() + m[2] : name.slice(0, 2).toUpperCase()
}
export const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

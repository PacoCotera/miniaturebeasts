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

// The undo log's pointer -> the words of the part and the field. words.md names the parts (body, leg, ear, arm, tail) and has "length" for len;
// the rest follow the same plain vocabulary. Until the species file has a schema (chunk 6) with a label on every field this is the whole mapping; with one,
// `labels` (dotted path -> label, from the server) wins.
const PART: Record<string, string> = { torso: 'body', 'leg.L': 'leg', 'leg.R': 'leg', 'arm.L': 'arm', 'arm.R': 'arm', 'ear.L': 'ear', 'ear.R': 'ear', tail: 'tail', crown: 'crown', face: 'face' }
const FIELD: Record<string, string> = { len: 'length', r: 'radius', pitch: 'bend', yaw: 'turn', at: 'place', ring: 'rings', edge: 'edge', fillet: 'roundness', push: 'sink', size: 'size', width: 'width', amp: 'sway', period: 'period', lift: 'lift', curl: 'curl', taper: 'taper', root: 'root', length: 'length', tip_r: 'tip radius', root_flare: 'root flare' }
export const dotted = (path: string) => path.split('/').filter(Boolean).join('.')
export function fieldLabel(path: string, labels?: Record<string, string>): string {
  const exact = labels?.[dotted(path)]
  if (exact) return exact.toLowerCase()
  const toks = path.split('/').filter(Boolean).map((t) => t.replace(/~1/g, '/').replace(/~0/g, '~'))
  const words: string[] = []
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]
    if (t === 'parts' || t === 'spine') continue
    if (t === 'joints') { const n = toks[i + 1]; if (n !== undefined && /^\d+$/.test(n)) { words.push(`joint ${n}`); i++ } continue }
    if (/^\d+$/.test(t)) { words.push(`#${t}`); continue }
    words.push(PART[t] ?? FIELD[t] ?? t.replace(/[-_]/g, ' '))
  }
  return words.slice(-3).join(' ')
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
// Times are shown in the viewer's own time zone (the browser's), never the server's; `tz` is for tests and for a shot taken on purpose in another zone.
export const clock = (iso: string, tz?: string) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz }).format(new Date(iso))

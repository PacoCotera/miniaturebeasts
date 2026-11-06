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

// The undo log's pointer -> the words of the part and the field. the copywriter's word list names the parts (body, leg, ear, arm, tail) and has "length" for len;
// the rest follow the same plain vocabulary. Until the species file has a schema (chunk 6) with a label on every field this is the whole mapping; with one,
// `labels` (dotted path -> label, from the server) wins.
const PART: Record<string, string> = { torso: 'body', 'leg.L': 'leg', 'leg.R': 'leg', 'arm.L': 'arm', 'arm.R': 'arm', 'ear.L': 'ear', 'ear.R': 'ear', tail: 'tail', crown: 'crown', face: 'face' }
const FIELD: Record<string, string> = { len: 'length', r: 'radius', pitch: 'bend', yaw: 'turn', at: 'place', ring: 'rings', edge: 'edge', fillet: 'roundness', push: 'sink', size: 'size', width: 'width', amp: 'sway', period: 'period', lift: 'lift', curl: 'curl', taper: 'taper', root: 'root', length: 'length', tip_r: 'tip radius', root_flare: 'root flare' }
export const dotted = (path: string) => path.split('/').filter(Boolean).join('.')

// The undo log's pointer (/parts/0/chain/1/len) as the schema's dotted path (parts.leg.L.chain.1.len): a list element is written by its id, name or joint when it has one, else by position.
export function dottedPath(ptr: string, file: unknown): string {
  let cur: unknown = file
  const out: string[] = []
  for (const raw of ptr.split('/').filter(Boolean)) {
    const t = raw.replace(/~1/g, '/').replace(/~0/g, '~')
    if (Array.isArray(cur)) {
      const el = cur[Number(t)] as Record<string, unknown> | undefined
      const name = el && typeof el === 'object' ? (el.id ?? el.name ?? el.joint) : undefined
      out.push(typeof name === 'string' ? name : t)
      cur = el
    } else {
      out.push(t)
      cur = cur && typeof cur === 'object' ? (cur as Record<string, unknown>)[t] : undefined
    }
  }
  return out.join('.')
}

// The schema's label for a dotted path. `labels` has `*` for a list item (an item may be a position or an id with dots in it), as the server writes it.
export function labelOf(path: string, labels: Record<string, string>): string | null {
  const toks = path.split('.')
  const keys = Object.keys(labels).sort((a, b) => b.length - a.length)
  for (let i = toks.length; i > 0; i--) {
    const cand = toks.slice(0, i).join('.')
    for (const k of keys) if (new RegExp('^' + k.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^.]+(?:\\.[^.]+){0,2}') + '$').test(cand)) return labels[k]
  }
  return null
}

// What a toast calls the field: the schema's label when the file has one for it (with the part and joint it sits in: "leg ankle length"); else the part and field words from the copywriter's word list.
export function fieldLabel(path: string, labels?: Record<string, string>, file?: unknown): string {
  const locus = file ? locusLabel(path, file) : null
  if (locus) return locus
  if (labels && file) {
    const d = dottedPath(path, file)
    const lab = labelOf(d, labels)
    if (lab) {
      const items: string[] = []
      let cur: unknown = file
      for (const raw of path.split('/').filter(Boolean)) {
        const t = raw.replace(/~1/g, '/').replace(/~0/g, '~')
        if (Array.isArray(cur)) { const el = cur[Number(t)] as Record<string, unknown>; const n = el?.id ?? el?.name ?? el?.joint; if (typeof n === 'string') items.push(PART[n] ?? n); cur = el } else cur = (cur as Record<string, unknown> | undefined)?.[t]
      }
      const l = lab.toLowerCase()
      return [...items.filter((x) => !l.startsWith(x)), l].join(' ')
    }
  }
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
// A locus (a family's weights, or the trait's type): the locus' own label, and for a weight the family it belongs to.
function locusLabel(path: string, file: unknown): string | null {
  const toks = path.split('/').filter(Boolean)
  if (toks[0] !== 'genome' || toks[1] !== 'loci') return null
  const l = ((file as { genome?: { loci?: { label?: string; locus?: string; limits?: string[] }[] } }).genome?.loci ?? [])[Number(toks[2])]
  if (!l?.label) return null
  if (toks[3] === 'weights' && toks[4] !== undefined) {
    const look = l.limits?.[Number(toks[4])]
    const words = (file as { variety?: { look_words?: Record<string, Record<string, string[]>> } }).variety?.look_words?.[l.locus ?? '']
    return `${(look && words?.[look]?.[0] ? words[look][0] : [look, l.label].filter(Boolean).join(' ')).toLowerCase()} wild odds`
  }
  return l.label.toLowerCase()
}
// A value as History says it: a share as a percentage, a look by its short word, anything else as fmtValue.
export function fieldValue(path: string, v: unknown, file?: unknown): string {
  const toks = path.split('/').filter(Boolean)
  if (toks[0] === 'genome' && toks[3] === 'weights' && typeof v === 'number') return `${Math.round(v * 100)}%`
  if (toks[0] === 'sockets' && toks[3] === 'default' && typeof v === 'string' && file) {
    const sid = ((file as { sockets?: { id?: string }[] }).sockets ?? [])[Number(toks[1])]?.id
    const locus = sid === 'ear.L' ? 'form.ear-kind' : sid === 'tail.tip' ? 'anatomy.tail-tip-form' : ''
    const w = (file as { variety?: { look_words?: Record<string, Record<string, string[]>> } }).variety?.look_words?.[locus]?.[v]
    if (w?.[1]) return w[1]
  }
  return fmtValue(v)
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

// An edit this page made itself is not announced to it: the toast is for edits made elsewhere. A save notes the path and the value it is about to write; the entry that comes back in the undo log is that one.
const own = new Map<string, number>()
const ownKey = (path: string, value: unknown) => `${path}|${JSON.stringify(value)}`
export const noteOwn = (path: string, value: unknown, now = Date.now()) => { own.set(ownKey(path, value), now + 30_000) }
export function isOwn(e: Pick<Entry, 'path' | 'new'>, now = Date.now()): boolean {
  const k = ownKey(e.path, e.new)
  const t = own.get(k)
  if (t === undefined) return false
  own.delete(k)
  return t >= now
}

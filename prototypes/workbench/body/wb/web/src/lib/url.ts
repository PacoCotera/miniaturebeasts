// The whole view lives in the URL: /studio/S20/shape?sel=tail&az=32&view=clay&drawer=checks&proof=tail.size (studio-ui.md 2). `proof` is the check whose picture is on the stage.
export const MODES = ['shape', 'genes', 'variety', 'goldens', 'gate'] as const
export type Mode = (typeof MODES)[number]
export const AZS = [0, 32, 90, 180] as const
export type Az = (typeof AZS)[number]
export const VIEWS = ['plush', 'clay', 'normal', 'parts', 'wire'] as const
export type View = (typeof VIEWS)[number]

export type StudioUrl = { species: string; mode: Mode; sel: string | null; az: Az; view: View; drawer: string | null; proof: string | null; ind: number | null }
export const DEFAULT_AZ: Az = 32
export const DEFAULT_VIEW: View = 'clay' // plush is the design's default; it is not served yet

export function parseStudioUrl(pathname: string, search: string): StudioUrl | null {
  const m = /^\/studio\/([^/]+)(?:\/([^/]+))?\/?$/.exec(pathname)
  if (!m) return null
  const q = new URLSearchParams(search)
  const mode = MODES.find((x) => x === m[2]) ?? 'shape'
  const az = Number(q.get('az') ?? DEFAULT_AZ)
  const view = VIEWS.find((x) => x === q.get('view')) ?? DEFAULT_VIEW
  return { species: decodeURIComponent(m[1]), mode, sel: q.get('sel') || null, az: (AZS as readonly number[]).includes(az) ? (az as Az) : DEFAULT_AZ, view, drawer: q.get('drawer') || null, proof: q.get('proof') || null, ind: Number.isInteger(Number(q.get('ind'))) && Number(q.get('ind')) > 0 ? Number(q.get('ind')) : null }
}

// Defaults are left out, so a link stays short.
export function buildStudioUrl(s: StudioUrl): string {
  const q = new URLSearchParams()
  if (s.sel) q.set('sel', s.sel)
  if (s.az !== DEFAULT_AZ) q.set('az', String(s.az))
  if (s.view !== DEFAULT_VIEW) q.set('view', s.view)
  if (s.drawer) q.set('drawer', s.drawer)
  if (s.proof) q.set('proof', s.proof)
  if (s.ind) q.set('ind', String(s.ind))
  const qs = q.toString()
  return `/studio/${encodeURIComponent(s.species)}/${s.mode}${qs ? '?' + qs : ''}`
}

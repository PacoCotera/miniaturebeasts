import gains from './coatGain.json'
import cells from './coatCells.json'

// The coat of the live viewport: the same table as the 2D game (art desk R21-COAT-V8, tools/palette-S01-v8.json): coat = the mibi's Tint x Shade cell (coat_main), markings = the coat moved in lightness, cream and the leaf crest fixed.
// Land colours never drive the Loika. Values copied from the palette file; the studio does not read it at run time.
export const COATS: Record<string, string> = {
  'redder-dark': '#482a1e', 'redder-between': '#864d2b', 'redder-light': '#a26b4f',
  'between-dark': '#2e2a2d', 'between-between': '#585e67', 'between-light': '#8e98a4',
  'yellower-dark': '#3e301f', 'yellower-between': '#72583b', 'yellower-light': '#9f805a',
}
export const DEFAULT_CELL = 'between-dark' // the painted master: used while the file carries no Tint and Shade
export const CREAM = '#a98b6d' // muzzle, chest and belly patch, the eye ring and the toe pads: fixed, never from the land or the coat
export const CREST = '#757944' // the leaf crest: its own sage
export const IRISES: Record<string, string> = { amber: '#c47a2c', honey: '#d9a441', copper: '#a8562a' }
export const PUPIL = '#16131a'
export const RIM = '#2b211d' // the thin dark rim round the eye

// OKLab (Ottosson), from sRGB hex or from linear sRGB
const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const gam = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055)
export const hexToLinear = (h: string): [number, number, number] => [1, 3, 5].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255)) as [number, number, number]
export const linearToHex = (c: number[]): string => '#' + c.map((v) => Math.round(Math.min(1, Math.max(0, gam(Math.min(1, Math.max(0, v))))) * 255).toString(16).padStart(2, '0')).join('')
export function oklabOfLinear([r, g, b]: number[]): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]
}
export function linearOfOklab([L, a, b]: number[]): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
}
export const lightness = (hex: string) => oklabOfLinear(hexToLinear(hex))[0]

/** Markings, where a mesh has zones for them: the coat moved +0.08 L on a dark coat, -0.10 L on the rest, the same hue. */
export function markingOf(coatHex: string, dark: boolean): string {
  const [L, a, b] = oklabOfLinear(hexToLinear(coatHex))
  return linearToHex(linearOfOklab([L + (dark ? 0.08 : -0.1), a, b]))
}

export type CoatLook = { loika?: boolean; tint?: string | null; shade?: string | null; iris?: string | null; eyes?: string | null }

/** The target hex of every zone of a Loika. `cell` is the mibi's Tint-Shade cell; a file without them gets the painted master and amber. */
export function loikaTargets(look: CoatLook) {
  const cell = look.tint && look.shade && `${look.tint}-${look.shade}` in COATS ? `${look.tint}-${look.shade}` : DEFAULT_CELL
  const coat = COATS[cell]
  return { cell, coat, marking: markingOf(coat, cell.endsWith('-dark')), cream: CREAM, toe: CREAM, ring: CREAM, crest: CREST, iris: IRISES[look.iris ?? ''] ?? IRISES.amber }
}
export type ZoneName = 'coat' | 'cream' | 'toe' | 'ring' | 'iris' | 'crest'
export const ZONES: ZoneName[] = ['coat', 'cream', 'toe', 'ring', 'iris', 'crest']

/** The albedo that lands a zone's rendered median on its hex under the studio key: the hex over the zone's median irradiance (coatGain.json, measured by scripts/coat_gain.mjs from a white-albedo render at az 32). Linear sRGB. */
export function albedoOf(zone: ZoneName, hex: string): [number, number, number] {
  const g = (gains as Record<string, number[]>)[zone] ?? [1, 1, 1]
  return hexToLinear(hex).map((v, i) => Math.min(1, v * g[i])) as [number, number, number]
}

// The coat's own tuning per Tint-Shade cell (shots/coatcells.mjs measures it): the albedo gain that lands the cell's median, and the exponent of the spread curve that gives it the master's spread scaled to its own median without clipping (p95 L at most 0.92).
export type Tune = { gain: number[]; gamma: number }
export const DEFAULT_GAMMA = 1.85
export function coatTune(look: CoatLook & { tune?: Tune | null }, cell: string): Tune {
  return look.tune ?? (cells as Record<string, Tune>)[cell] ?? { gain: (gains as Record<string, number[]>).coat, gamma: DEFAULT_GAMMA }
}
export const SPREAD = { p5: 0.17 / 0.29, p95: 0.47 / 0.29, p95Cap: 0.92 } // the master's L ratios to its median, and the highest p95 any cell may have

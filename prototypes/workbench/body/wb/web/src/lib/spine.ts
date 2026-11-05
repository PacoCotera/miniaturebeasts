import { queryOptions } from '@tanstack/react-query'
import { call } from './api'
import { clamp, snap } from './forms'

// Chapter 22: the spine on the stage. The server answers in the plan's terms and in the hero camera's frame (`GET /api/species/<id>/spine`): the page projects points and knows neither plan.
export type Camera = { az: number; el: number; w: number; h: number; ppH: number; centre: [number, number, number]; right: [number, number, number]; up: [number, number, number] }
export type V3 = [number, number, number]
export type SpineRange = { name: string; lo: number; hi: number; id: string | null; ptr: string | null; value: number | null; band: [number, number] | null; sw: string | null; tangent: V3 }
export type SpineKnob = { name: string; part: string; id: string; ptr: string; at: V3; axis: V3; gain: number; value: number; band: [number, number]; unit?: string }
export type SpineView = { plan: string; built: boolean; camera: Camera; step: number; path: V3[]; ranges: SpineRange[]; knobs: SpineKnob[]; outline: { back: [number, number][]; front: [number, number][] } | null }

export const spineOne = (id: string, hash: string) => queryOptions({ queryKey: ['spine', id, hash], queryFn: () => call<SpineView>('GET', `/api/species/${encodeURIComponent(id)}/spine`), staleTime: Infinity })

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
// A point in H to the 608 x 624 frame the hero is drawn in (an orthographic camera: the centre of the frame is the camera's centre).
export const project = (c: Camera, p: V3): [number, number] => {
  const d: V3 = [p[0] - c.centre[0], p[1] - c.centre[1], p[2] - c.centre[2]]
  return [c.w / 2 + dot(d, c.right) * c.ppH, c.h / 2 - dot(d, c.up) * c.ppH]
}
// A move in H along an axis, as the pixels it takes on the frame: the drag's own direction on the screen.
export const screenAxis = (c: Camera, axis: V3): [number, number] => [dot(axis, c.right) * c.ppH, -dot(axis, c.up) * c.ppH]
// The point on the path `u` H from its head end.
export function pointAt(path: V3[], step: number, u: number): V3 {
  const f = Math.min(Math.max(u / step, 0), path.length - 1)
  const i = Math.min(Math.floor(f), path.length - 2), t = f - i
  const a = path[i], b = path[i + 1] ?? a
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}
// Where each range ends along the spine for the lengths now on screen (a length being dragged takes the place of the file's); the last range runs to the end of the path.
export function ends(ranges: SpineRange[], lens: (number | null)[], total: number): number[] {
  let at = 0
  return ranges.map((_, i) => { const L = lens[i]; at = L === null || L === undefined ? total : at + L; return at })
}
// A drag of `dx, dy` screen pixels (from where it started) along `axis`: how far along the axis it went, in H.
export function along(c: Camera, axis: V3, dx: number, dy: number): number {
  const [sx, sy] = screenAxis(c, axis)
  const n2 = sx * sx + sy * sy
  return n2 < 1e-9 ? 0 : (dx * sx + dy * sy) / n2
}
// What a knob's value becomes when its handle moves `h` H along its axis from the value `v0`: inside the plan's band, on the field's step.
export const knobValue = (v0: number, h: number, gain: number, band: [number, number], step: number) => clamp(snap(v0 + h * gain, step), band)

// Where the labels of the profile knobs stand. A knob's value (and, on the selected one, its name) goes beside it, and no label may sit on another label, on a handle or on a range's name: each takes the first
// of its places that is clear, the selected knob first. Sizes are in the frame's own units; `px` is what one screen pixel is in them (a label is 14 px on the screen, whatever the plate's size).
export type Box = { x0: number; y0: number; x1: number; y1: number }
export type KnobLabel = { id: string; x: number; y: number; text: string; name?: string; selected: boolean }
export type Placed = { id: string; value: { dx: number; dy: number; anchor: 'start' | 'middle' | 'end' }; name: { dx: number; dy: number } | null }
const hits = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
export const textWidth = (s: string, px: number) => s.length * 7.8 * px
export function placeKnobLabels(knobs: KnobLabel[], blocked: Box[], px: number, frame: { w: number; h: number }): Placed[] {
  const H = 16 * px, glyph = 21 * px, gy = 10 * px
  const taken: Box[] = [...blocked, ...knobs.map((k) => ({ x0: k.x - glyph, y0: k.y - gy, x1: k.x + glyph, y1: k.y + gy }))]
  const out = new Map<string, Placed>()
  const inside = (b: Box) => b.x0 >= 2 && b.x1 <= frame.w - 2 && b.y0 >= 2 && b.y1 <= frame.h - 2
  const free = (b: Box) => inside(b) && !taken.some((t) => hits(t, b))
  const order = [...knobs].sort((a, b) => Number(b.selected) - Number(a.selected))
  for (const k of order) {
    const text = k.selected && k.name ? `${k.name}  ${k.text}` : k.text
    const w = textWidth(text, px)
    // [dx of the text's anchor, baseline dy, anchor] around the knob
    const cands: ['start' | 'middle' | 'end', number, number][] = [
      ['end', -26 * px, 5 * px], ['start', 26 * px, 5 * px],
      ['middle', 0, -17 * px], ['middle', 0, 31 * px], ['middle', 0, -35 * px], ['middle', 0, 49 * px], ['middle', 0, -53 * px], ['middle', 0, 67 * px],
    ]
    if (k.selected) { const up = cands.splice(2, 4); cands.unshift(...up) }
    const box = (c: (typeof cands)[number]): Box => {
      const x0 = k.x + c[1] - (c[0] === 'end' ? w : c[0] === 'middle' ? w / 2 : 0)
      return { x0, y0: k.y + c[2] - H * 0.8, x1: x0 + w, y1: k.y + c[2] + H * 0.25 }
    }
    const at = cands.find((c) => free(box(c))) ?? cands[0]
    taken.push(box(at))
    out.set(k.id, { id: k.id, value: { dx: at[1], dy: at[2], anchor: at[0] }, name: null })
  }
  return knobs.map((k) => out.get(k.id)!)
}

import { queryOptions } from '@tanstack/react-query'
import { call } from './api'
import { clamp, snap } from './forms'

// Chapter 22: the spine on the stage. The server answers in the plan's terms and in the hero camera's frame (`GET /api/species/<id>/spine`): the page projects points and knows neither plan.
export type Camera = { az: number; el: number; w: number; h: number; ppH: number; centre: [number, number, number]; right: [number, number, number]; up: [number, number, number] }
export type V3 = [number, number, number]
export type SpineRange = { name: string; lo: number; hi: number; id: string | null; ptr: string | null; value: number | null; band: [number, number] | null; sw: string | null; tangent: V3 }
export type SpineKnob = { name: string; part: string; id: string; ptr: string; at: V3; axis: V3; gain: number; value: number; band: [number, number] }
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

import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Species } from '../lib/api'
import { fmtNum, fmtVal, getAt, snap, clamp, valText } from '../lib/forms'
import { along, ends, knobName, knobValue, placeKnobLabels, pointAt, project, spineOne, textWidth, type Box, type Placed, type SpineKnob, type SpineRange, type SpineView, type V3 } from '../lib/spine'
import { useField, useLive } from '../lib/useField'
import s_ from './SpineOverlay.module.css'

// The spine on the stage: over the az 90 clay, the range bar along the spine with a handle at each range's end, and the profile knobs at the neck, head, chest and rump, each dragged where it sits.
// A handle and the inspector's field are one value: a drag shows in the inspector as it happens, and the save follows the last move by 0.6 s like any other field. The thin line is the loft's section table, worked out from the knobs.
const STEP_LEN = 0.005
type Go = (p: { sel: string }, replace?: boolean) => void

export function SpineOverlay({ species, id, sel, scale, editable, go }: { species: Species; id: string; sel: string | null; scale: number; editable: boolean; go: Go }) {
  const q = useQuery({ ...spineOne(id, species.hash), enabled: !!species.hash })
  const live = useLive((l) => l.live)
  const v = q.data
  if (!v) return null
  const val = (ptr: string, fallback: number) => { const l = live[ptr]; return typeof l?.v === 'number' ? l.v : Number(getAt(species.file, ptr) ?? fallback) }
  const total = v.ranges[v.ranges.length - 1].hi
  const lens = v.ranges.map((r) => (r.ptr ? val(r.ptr, r.value ?? 0) : null))
  const hi = ends(v.ranges, lens, total)
  const c = v.camera
  const at = (u: number) => project(c, pointAt(v.path, v.step, u))
  const poly = (a: number, b: number) => { const n = Math.max(2, Math.round((b - a) / v.step)); return Array.from({ length: n + 1 }, (_, i) => at(a + ((b - a) * i) / n).map((x) => x.toFixed(1)).join(',')).join(' ') }
  const lo = (i: number) => (i ? hi[i - 1] : 0)
  const px = 1 / scale                                                       // one screen pixel in the frame's units
  const nameOf = (r: SpineRange, i: number) => `${r.name.charAt(0).toUpperCase()}${r.name.slice(1)}${lens[i] !== null ? ` ${fmtNum(lens[i]!)}` : ''}`
  const colW = Math.max(...v.ranges.map((r, i) => textWidth(nameOf(r, i), px)))
  const colLeft = c.w - 8 * px - colW - 6 * px
  const edge: [number, number][] = [...Array.from({ length: Math.round(total / v.step) + 1 }, (_, i) => at(i * v.step)), ...(v.outline ? [...v.outline.back, ...v.outline.front].map(([x, z]) => project(c, [x, 0, z])) : [])]
  const floor = Math.max(-Infinity, ...edge.filter(([x]) => x > colLeft).map(([, y]) => y + 18 * px))           // the names stand clear of what reaches into their margin (a tail's tip)
  const rows = labelRows(v.ranges.map((r, i) => ({ r, i, xy: at((lo(i) + hi[i]) / 2) })), px, floor)
  const blocked: Box[] = [
    ...rows.map(({ r, i, y }) => ({ x0: c.w - 8 * px - textWidth(nameOf(r, i), px), y0: y - 14 * px, x1: c.w - 8 * px, y1: y + 5 * px })),
    ...v.ranges.map((_, i) => { const [x, y] = at(hi[i]); return { x0: x - 12 * px, y0: y - 12 * px, x1: x + 12 * px, y1: y + 12 * px } }),
  ]
  const knobAt = (k: SpineKnob) => { const value = val(k.ptr, k.value), h = (value - k.value) / k.gain; const [x, y] = project(c, [k.at[0] + k.axis[0] * h, k.at[1] + k.axis[1] * h, k.at[2] + k.axis[2] * h]); return { k, value, x, y } }
  const kn = v.knobs.map(knobAt)
  const placed = placeKnobLabels(kn.map(({ k, value, x, y }) => ({ id: k.id, x, y, text: fmtVal(value, k.unit), name: knobName(k, species.labels), selected: sel === k.part })), blocked, px, { w: c.w, h: c.h })
  return (
    <div className={s_.wrap} style={{ ['--k' as string]: scale }}>
      <svg className={s_.svg} viewBox={`0 0 ${c.w} ${c.h}`} aria-label="The spine: its ranges and profile knobs" role="group">
        {v.outline && (['back', 'front'] as const).map((e) => <polyline key={e} className={s_.outline} points={v.outline![e].map(([x, z]) => project(c, [x, 0, z]).map((n) => n.toFixed(1)).join(',')).join(' ')} />)}
        {v.ranges.map((r, i) => <g key={r.name}><polyline className={s_.casing} points={poly(lo(i), hi[i])} /><polyline className={s_.seg} stroke={r.sw ?? '#999'} points={poly(lo(i), hi[i])} /></g>)}
        {rows.map(({ r, i, xy, y }) => (
          <g key={`l${r.name}`}>
            <line className={s_.lead} x1={xy[0]} y1={xy[1]} x2={colLeft - 4 * px} y2={y - 5 * px} />
            <text className={s_.lab} x={c.w - 8 * px} y={y} textAnchor="end" data-range={r.name}>{r.name.charAt(0).toUpperCase() + r.name.slice(1)}{lens[i] !== null && <tspan className={s_.num} dx={6 * px}>{fmtNum(lens[i]!)}</tspan>}</text>
          </g>
        ))}
        {v.ranges.map((r, i) => r.ptr && <RangeHandle key={`h${r.name}`} species={species} id={id} view={v} r={r} len={lens[i]!} xy={at(hi[i])} scale={scale} editable={editable} go={go} />)}
        {kn.map(({ k, value }, i) => <KnobHandle key={k.name} species={species} id={id} view={v} k={k} value={value} scale={scale} editable={editable} go={go} on={sel === k.part} place={placed[i]} />)}
      </svg>
    </div>
  )
}

// The range names stand in the margin on the right in the spine's order, each level with its range, kept clear of the one above (a name is 14 px on the screen, whatever the plate's size) and below `floor`, where the spine and its outline reach into the margin.
function labelRows<T extends { xy: [number, number] }>(rows: T[], px: number, floor: number): (T & { y: number })[] {
  const gap = 22 * px
  let prev = floor - gap
  return rows.map((r) => { const y = Math.max(r.xy[1] + 5 * px, prev + gap); prev = y; return { ...r, y } })
}

// A press, and the moves after it as pixels from where it began, in the frame's own units (the plate is scaled to the screen).
function useDrag(scale: number, start: () => number, move: (dx: number, dy: number, v0: number, fine: boolean) => void, begin: () => void) {
  const d = useRef<{ x: number; y: number; v0: number } | null>(null)
  const [on, setOn] = useState(false)
  return {
    dragging: on,
    bind: {
      onPointerDown: (e: React.PointerEvent) => { if (e.button !== 0) return; e.stopPropagation(); (e.currentTarget as Element).setPointerCapture(e.pointerId); d.current = { x: e.clientX, y: e.clientY, v0: start() }; setOn(true); begin() },
      onPointerMove: (e: React.PointerEvent) => { const p = d.current; if (p) move((e.clientX - p.x) / scale, (e.clientY - p.y) / scale, p.v0, e.shiftKey) },
      onPointerUp: () => { d.current = null; setOn(false) },
      onPointerCancel: () => { d.current = null; setOn(false) },
    },
  }
}

function RangeHandle({ species, id, view, r, len, xy, scale, editable, go }: { species: Species; id: string; view: SpineView; r: SpineRange; len: number; xy: [number, number]; scale: number; editable: boolean; go: Go }) {
  const f = useField<number>(species, id, r.ptr!)
  const band = r.band ?? [0, 2]
  const set = (n: number) => f.set(clamp(snap(n, STEP_LEN), band))
  const { dragging, bind } = useDrag(scale, () => len, (dx, dy, v0, fine) => set(v0 + along(view.camera, r.tangent as V3, dx, dy) * (fine ? 0.1 : 1)), () => go({ sel: r.name }, true))
  return (
    <g className={s_.hand} data-kind="range" data-drag={dragging || undefined} data-disabled={!editable || undefined} transform={`translate(${xy[0].toFixed(1)} ${xy[1].toFixed(1)})`}
      role="slider" tabIndex={editable ? 0 : -1} aria-label={`${r.name.charAt(0).toUpperCase()}${r.name.slice(1)} length`} aria-valuemin={band[0]} aria-valuemax={band[1]} aria-valuenow={len} aria-valuetext={`${fmtNum(len)} H`} aria-disabled={!editable}
      onKeyDown={(e) => { const dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0; if (editable && dir) { e.preventDefault(); set(len + dir * STEP_LEN * (e.shiftKey ? 10 : 1)) } }}
      {...(editable ? bind : {})}>
      <circle className={s_.hit} r={18} />
      <circle className={s_.dot} r={8} stroke={r.sw ?? '#999'} />
    </g>
  )
}

function KnobHandle({ species, id, view, k, value, scale, editable, go, on, place }: { species: Species; id: string; view: SpineView; k: SpineKnob; value: number; scale: number; editable: boolean; go: Go; on: boolean; place: Placed }) {
  const f = useField<number>(species, id, k.ptr)
  const step = (k.band[1] - k.band[0]) / 120
  const nice = (n: number) => knobValue(n, 0, k.gain, k.band, Math.max(0.001, Math.round(step * 1000) / 1000))
  const { dragging, bind } = useDrag(scale, () => value, (dx, dy, v0, fine) => f.set(knobValue(v0, along(view.camera, k.axis, dx, dy) * (fine ? 0.1 : 1), k.gain, k.band, Math.max(0.001, Math.round(step * 1000) / 1000))), () => go({ sel: k.part }, true))
  const h = (value - k.value) / k.gain                                      // how far the handle has moved along its axis from where the file put it
  const [x, y] = project(view.camera, [k.at[0] + k.axis[0] * h, k.at[1] + k.axis[1] * h, k.at[2] + k.axis[2] * h])
  const lab = knobName(k, species.labels)
  return (
    <g className={s_.hand} data-kind="knob" data-on={on || undefined} data-drag={dragging || undefined} data-disabled={!editable || undefined} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}
      role="slider" tabIndex={editable ? 0 : -1} aria-label={lab} aria-valuemin={k.band[0]} aria-valuemax={k.band[1]} aria-valuenow={value} aria-valuetext={valText(value, k.unit)} aria-disabled={!editable}
      onKeyDown={(e) => { const dir = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -1 : 0; if (editable && dir) { e.preventDefault(); f.set(nice(value + dir * Math.max(0.001, step) * (e.shiftKey ? 10 : 1))) } }}
      {...(editable ? bind : {})}>
      <circle className={s_.hit} r={20} />
      <path className={s_.arrows} d="M-17 0 L-9 -5 M-17 0 L-9 5 M17 0 L9 -5 M17 0 L9 5 M-17 0 H17" />
      <rect className={s_.knob} x={-7} y={-7} width={14} height={14} rx={4} />
      <text className={s_.klab} x={place.value.dx} y={place.value.dy} textAnchor={place.value.anchor}>{on && <tspan className={s_.kname}>{lab}  </tspan>}{fmtVal(value, k.unit)}</text>
      {!on && <text className={`${s_.klab} ${s_.hovername}`} x={0} y={-17 / scale} textAnchor="middle">{lab}</text>}
    </g>
  )
}

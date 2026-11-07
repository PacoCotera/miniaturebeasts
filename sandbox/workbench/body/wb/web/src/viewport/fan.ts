import { Matrix3, Matrix4, Vector3 } from 'three'

// A library part on its socket, as meshbody.py places it (the fan layout of the part's sidecar): the crest's units, each tilted and sunk about the socket point.
// The server works in the sculpt's frame (z up, front +x, left +y); the GLBs and the scene are glTF's (y up). C takes one to the other: (x, y, z) -> (x, z, -y).
export type FanLayout = { step_deg: Record<string, number>; tilt_back_deg: number; side_back_deg: number; twist_deg: number; base_r: number; stagger: number; sink: number; size_of_body?: number; centre_scale?: number }
export type Placement = { R: Matrix3; off: Vector3; L: number }

const rad = (d: number) => (d * Math.PI) / 180
const rx = (a: number) => new Matrix3().set(1, 0, 0, 0, Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a))
const ry = (a: number) => new Matrix3().set(Math.cos(a), 0, Math.sin(a), 0, 1, 0, -Math.sin(a), 0, Math.cos(a))
const rz = (a: number) => new Matrix3().set(Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a), 0, 0, 0, 1)
const mul = (...ms: Matrix3[]) => ms.reduce((a, b) => a.clone().multiply(b))
// the leaf's own frame (front -y, left +x) to the studio's (front +x, left +y)
const C_TRIAL = new Matrix3().set(0, -1, 0, 1, 0, 0, 0, 0, 1)
export const C = new Matrix3().set(1, 0, 0, 0, 0, 1, 0, -1, 0)

/** The placements of `count` units of a fan on a socket, in the sculpt's frame, relative to the socket point (meshbody.fan_placements). `bodyH` is the sculpt's standing height. */
export function fanPlacements(count: number, sizeOfBody: number, bodyH: number, lay: FanLayout): Placement[] {
  const n = Math.max(1, Math.floor(count))
  const tilt = rad(lay.tilt_back_deg)
  const L = (sizeOfBody * bodyH) / (Math.cos(tilt) * (1 - lay.sink))
  const step = n > 1 ? rad(lay.step_deg[String(n)] ?? 0) : 0
  const out: Placement[] = []
  for (let i = 0; i < n; i++) {
    const k = i - (n - 1) / 2
    const ang = k * step
    const R = mul(rx(-tilt - rad(lay.side_back_deg) * Math.min(1, Math.abs(k))), ry(ang), rz(rad(lay.twist_deg) * Math.sign(k)))
    const Lk = L * (k === 0 ? lay.centre_scale ?? 1 : 1)
    const off = new Vector3(Math.sin(ang) * lay.base_r * L, Math.abs(k) * lay.stagger * L, -lay.sink * Lk)
    out.push({ R: mul(C_TRIAL, R), off: off.applyMatrix3(C_TRIAL), L: Lk })
  }
  return out
}

/** The matrix that puts a part (its GLB in glTF's frame) at `socketPoint` (sculpt frame): the placement turned into the scene's frame, in the rest pose. */
export function placeMatrix(p: Placement, socketPoint: [number, number, number]): Matrix4 {
  const toScene = (v: Vector3) => v.applyMatrix3(C)
  const t = toScene(new Vector3(...socketPoint).add(p.off))
  const R = mul(C, p.R, C.clone().transpose()) // C R C^-1 (C is a rotation: its inverse is its transpose)
  const e = R.elements // column-major
  return new Matrix4().set(e[0] * p.L, e[3] * p.L, e[6] * p.L, t.x, e[1] * p.L, e[4] * p.L, e[7] * p.L, t.y, e[2] * p.L, e[5] * p.L, e[8] * p.L, t.z, 0, 0, 0, 1)
}

/** The signature's count as the file gives it: a number, or a band [lo, hi, type] (the type is the default). */
export function signatureCount(file: Record<string, unknown>, dflt = 3): number {
  const sig = file.signature as { count?: unknown } | undefined
  const c = sig?.count
  if (typeof c === 'number') return Math.round(c)
  if (Array.isArray(c) && c.length === 3 && typeof c[2] === 'number') return Math.round(c[2])
  return dflt
}

import { Matrix4, Vector3 } from 'three'

// How the file's rig acts on the studio GLB, as meshrig.py does it (the same numbers drive the Blender build): a bone is scaled in the rest pose, along its axis for length and across it for girth, and a child bone keeps its own size
// (it inherits no scale: it rides on the parent's moved joint), so the paws and the signature socket stay round and keep their size when a leg or the head is scaled. three.js bones inherit scale, so the bones are not left in their
// hierarchy: each bone's world matrix is set directly (`poseBones`) and the skeleton skins with it.
// Axes are three's (y up, the creature facing +x): the torso and the head scale along x, a leg along y, the socket's crest along y.
export type BoneScale = { len: number; girth: number }
export const axisOf = (name: string): 0 | 1 | 2 => (name === 'rear' || name === 'front' || name === 'head' ? 0 : 1)

/** The file's `rig.bones` as {bone id: scale}; a bone the file does not list stays at 1. */
export function scalesOf(rig: unknown): Record<string, BoneScale> {
  const out: Record<string, BoneScale> = {}
  const bones = (rig as { bones?: { id?: unknown; len?: unknown; girth?: unknown }[] } | undefined)?.bones
  for (const b of bones ?? []) {
    if (typeof b?.id !== 'string') continue
    const len = Number(b.len ?? 1), girth = Number(b.girth ?? 1)
    out[b.id] = { len: Number.isFinite(len) && len > 0 ? len : 1, girth: Number.isFinite(girth) && girth > 0 ? girth : 1 }
  }
  return out
}

/** The 3x3 (as the diagonal of a Matrix4) of a bone's own scale: `girth` on every axis, `len` on its own. */
export function scaleOf(name: string, s: BoneScale | undefined): Vector3 {
  const v = new Vector3(1, 1, 1)
  if (!s) return v
  v.set(s.girth, s.girth, s.girth)
  v.setComponent(axisOf(name), s.len)
  return v
}

/**
 * The world matrix of each bone in its pose: the joint carried by the parents' scales, then the bone's own scale about the joint, then the bind pose.
 * `bind[i]` is bone i's world matrix at rest (the inverse of the skeleton's bone inverse), `parent[i]` its parent's index or null. Returns D with skin = D[i] * boneInverse[i].
 */
export function poseBones(names: string[], parent: (number | null)[], bind: Matrix4[], scales: Record<string, BoneScale>): Matrix4[] {
  const n = names.length
  const head = bind.map((m) => new Vector3().setFromMatrixPosition(m))
  const S = names.map((nm) => scaleOf(nm, scales[nm]))
  const hw: (Vector3 | null)[] = new Array(n).fill(null)
  const joint = (i: number): Vector3 => {
    const done = hw[i]
    if (done) return done
    const p = parent[i]
    const h = p === null ? head[i].clone() : joint(p).clone().add(head[i].clone().sub(head[p]).multiply(S[p]))
    hw[i] = h
    return h
  }
  return names.map((_, i) => {
    // T(joint) S T(-rest joint) bind
    const m = new Matrix4().makeTranslation(-head[i].x, -head[i].y, -head[i].z)
    m.premultiply(new Matrix4().makeScale(S[i].x, S[i].y, S[i].z))
    m.premultiply(new Matrix4().makeTranslation(joint(i).x, joint(i).y, joint(i).z))
    return m.multiply(bind[i])
  })
}

import { use, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { apiPath } from '../lib/prefix'
import { fanPlacements, placeMatrix, signatureCount, type FanLayout } from './fan'
import { coatPalette, makeMaterials, zoneTexture, type Gltf, type Mats } from './materials'
import type { ViewMode } from './views'
import { poseBones, scalesOf } from './rig'
import type { Studio, StudioSculpt } from './studio'

// A camera put on the figure exactly as the server's proxy renderer frames it (wb/renderset.py, meshbody.frame): an orthographic camera at the house elevation, the azimuth from the front (0) towards the creature's left,
// the centre of the figure's extent, and the scale that fits the whole figure across a plate with a margin. Distances are the sculpt's units; the sculpt's frame is z up, the scene's is y up.
export const EL = 10
export type Frame = { centre: [number, number, number]; ortho: number; az: number; el: number } // a server camera (centre in the sculpt's frame); the gate draws the same view
const PX_PER_H = 210, PLATE = 608, PLATE_H = 624 // the 608 x 624 hero canvas of renderset.CAMERAS, 210 px per H
export const sceneOf = (p: [number, number, number]) => new THREE.Vector3(p[0], p[2], -p[1])
export const dirOf = (az: number, el = EL) => {
  const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el)
  return new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), -Math.sin(a) * Math.cos(e))
}

type Rigged = { root: THREE.Group; mesh: THREE.SkinnedMesh; bones: THREE.Bone[]; names: string[]; parent: (number | null)[]; bind: THREE.Matrix4[]; floor0: number }

// One viewport's creature: the sculpt's studio GLB with the file's `rig` and `keys` applied, the library parts at their sockets by layout. The file is the document: a field changed in the form arrives here as a new `file` and the next frame shows it.
export type CreatureProps = { file: Record<string, unknown>; studio: Studio; view: ViewMode; az: number; held: number | null; frame?: Frame; flat?: boolean; onMetrics?: (m: Record<string, number>) => void }

const zoneCache = new Map<string, Promise<THREE.Texture | null>>()
const zoneFor = (gltf: Gltf, sha: string, palette: [number, number, number][], nearest = false) => {
  const k = `${sha}:${nearest}:${palette.join(',')}`
  if (!zoneCache.has(k)) zoneCache.set(k, zoneTexture(gltf, palette, nearest))
  return zoneCache.get(k)!
}

export function Creature({ file, studio, view, az, held, frame, flat, onMetrics }: CreatureProps) {
  const sculpt = studio.sculpt as StudioSculpt
  const partDefs = useMemo(() => studio.parts.filter((p) => p.url && p.socket && p.layouts), [studio.parts])
  const body = useGLTF(apiPath(sculpt.url), false)
  const partGltfs = useGLTF(partDefs.map((p) => apiPath(p.url!)), false) as unknown as { scene: THREE.Object3D }[]
  const partKey = partGltfs.map((g) => g.scene.uuid).join()
  const palette = useMemo(() => coatPalette(studio.look).zones, [studio.look])
  const zone = use(zoneFor(body as unknown as Gltf, sculpt.sha256, palette))
  // the measurements' views (white, ids) need their own maps; the person's views never ask for them
  const measure = view === 'white' || view === 'zones'
  const white = measure ? use(zoneFor(body as unknown as Gltf, sculpt.sha256, coatPalette(studio.look, 'white').zones)) : null
  const ids = measure ? use(zoneFor(body as unknown as Gltf, sculpt.sha256, coatPalette(studio.look, 'ids').zones, true)) : null
  const { camera, invalidate, size } = useThree()
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update(): void } | null
  const t0 = useRef(performance.now())

  // the rig: the GLB cloned (one viewport must not pose another's skeleton), its bones taken out of their hierarchy so the poses of `rig.ts` are the skin's, the rest floor
  const rig = useMemo<Rigged>(() => {
    const root = cloneSkinned(body.scene) as THREE.Group
    let mesh: THREE.SkinnedMesh | undefined
    root.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) mesh = o as THREE.SkinnedMesh })
    if (!mesh) throw new Error('The studio GLB has no skinned mesh.')
    const bones = mesh.skeleton.bones
    const parent = bones.map((b) => { const i = bones.indexOf(b.parent as THREE.Bone); return i < 0 ? null : i })
    const names = bones.map((b) => (b.userData.name as string | undefined) ?? b.name) // the loader drops the dots of a bone's name, keeping the original in userData
    const bind = mesh.skeleton.boneInverses.map((m) => m.clone().invert())
    for (const b of bones) { root.add(b); b.matrixAutoUpdate = false }
    const pos = mesh.geometry.getAttribute("position") // the rest floor is the lowest rest vertex (the geometry's own box also spans the morph target)
    let floor0 = Infinity
    for (let i = 0; i < pos.count; i++) floor0 = Math.min(floor0, pos.getY(i))
    mesh.frustumCulled = false
    return { root, mesh, bones, names, parent, bind, floor0 }
  }, [body.scene])
  useEffect(() => () => rig.mesh.skeleton.dispose(), [rig])

  const mats = useMemo<Mats>(() => makeMaterials({ eyes: sculpt.stations.eyes, zone, white, ids, look: studio.look }), [sculpt, zone, white, ids, studio.look])
  useEffect(() => () => { mats.all.forEach((m) => m.dispose()); mats.textures.forEach((t) => t.dispose()) }, [mats])

  const insts = useRef<THREE.Mesh[]>([])
  const wire = useMemo(() => {
    const m = rig.mesh
    const w = new THREE.SkinnedMesh(m.geometry, new THREE.MeshBasicMaterial({ color: '#3d5bd0', wireframe: true, transparent: true, opacity: 0.35 }))
    w.bind(m.skeleton, m.bindMatrix)
    w.morphTargetInfluences = m.morphTargetInfluences
    w.morphTargetDictionary = m.morphTargetDictionary
    w.frustumCulled = false
    w.visible = false
    m.parent!.add(w)
    return w
  }, [rig])
  useEffect(() => () => { wire.parent?.remove(wire); (wire.material as THREE.Material).dispose() }, [wire])

  const ghost = useMemo(() => new THREE.Group(), [])
  const frameRef = useRef<{ centre: THREE.Vector3; ppu: number } | null>(null)

  const place = (dir?: THREE.Vector3) => {
    const f = frameRef.current
    if (!f) return
    const c = camera as THREE.OrthographicCamera
    const d = dir ?? c.position.clone().sub(controls?.target ?? f.centre).normalize()
    c.position.copy(f.centre).addScaledVector(d, 12)
    c.zoom = f.ppu
    c.near = 0.1
    c.far = 100
    c.updateProjectionMatrix()
    controls?.target.copy(f.centre)
    controls?.update()
    c.lookAt(f.centre)
    invalidate()
  }

  // The pose: the file's rig and keys on the bones and the morph target, the feet on the floor, the parts on their sockets, then the camera on the figure.
  const rigJson = JSON.stringify(file.rig ?? null), keysJson = JSON.stringify(file.keys ?? null), sigJson = JSON.stringify(file.signature ?? null)
  useLayoutEffect(() => {
    const T0 = performance.now()
    const { root, mesh, bones, names, parent, bind, floor0 } = rig
    const D = poseBones(names, parent, bind, scalesOf(JSON.parse(rigJson)))
    bones.forEach((b, i) => { b.matrix.copy(D[i]); b.matrixWorldNeedsUpdate = true })
    const dict = mesh.morphTargetDictionary ?? {}
    const keys = (JSON.parse(keysJson) as { id: string; amount?: number }[] | null) ?? []
    mesh.morphTargetInfluences?.fill(0)
    for (const k of keys) if (k.id in dict && mesh.morphTargetInfluences) mesh.morphTargetInfluences[dict[k.id]] = Number(k.amount ?? 0)
    // the parts: the library part's fan on its socket's bone, rigid with it
    insts.current.forEach((i) => i.parent?.remove(i))
    insts.current = []
    const n = signatureCount({ signature: JSON.parse(sigJson) })
    partDefs.forEach((p, k) => {
      const sock = sculpt.stations.sockets.find((s) => s.id === p.socket)
      const lay = sock && (p.layouts as Record<string, FanLayout>)[sock.layout]
      const geo = partGltfs[k] && firstGeometry(partGltfs[k].scene)
      const bi = sock ? names.indexOf(sock.bone) : -1
      if (!sock || !lay || !geo || bi < 0) return
      for (const pl of fanPlacements(n, lay.size_of_body ?? 0.34, sculpt.height, lay)) {
        const inst = new THREE.Mesh(geo, mats.part[view])
        inst.userData.part = true
        inst.matrixAutoUpdate = false
        inst.matrix.copy(placeMatrix(pl, sock.point)).premultiply(bind[bi].clone().invert()) // the rest placement in the socket bone's frame: the bone's pose then carries it, rigid
        inst.frustumCulled = false
        bones[bi].add(inst)
        insts.current.push(inst)
      }
    })
    root.position.y = 0
    root.updateMatrixWorld(true)
    mesh.skeleton.update()
    const lo = new THREE.Box3().setFromObject(mesh, true).min.y
    root.position.y = floor0 - lo // the feet on the floor (the rest sculpt's floor), as meshrig.rest does
    root.updateMatrixWorld(true)
    mesh.skeleton.update()
    // the camera: the server's, or the figure's own extent as meshbody.frame takes it
    if (frame) {
      frameRef.current = { centre: sceneOf(frame.centre), ppu: PLATE_H / frame.ortho }
    } else {
      const box = new THREE.Box3()
      root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m !== wire) box.union(new THREE.Box3().setFromObject(m, true)) })
      const xlo = box.min.x - 0.1, xhi = box.max.x + 0.1
      const fit = ((304 / 95) * (1 - 2 * 0.1)) / (xhi - xlo)
      const s = Math.min(1, fit)
      const ppu = ((PLATE_H * PX_PER_H) / PLATE) * s * Math.min(size.width / PLATE, size.height / PLATE_H)
      frameRef.current = { centre: new THREE.Vector3((xlo + xhi) / 2, 0.5 * box.max.y + 0.05, 0), ppu }
    }
    place()
    onMetrics?.({ poseMs: performance.now() - T0 })
    const w = window as unknown as { __vp?: Record<string, unknown> }
    w.__vp = { ...(w.__vp ?? {}), poseMs: performance.now() - T0, frame: { centre: frameRef.current!.centre.toArray(), ppu: frameRef.current!.ppu, floor: root.position.y, floor0, lo } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig, rigJson, keysJson, sigJson, sculpt, partDefs, partKey, frame, size.width, size.height])

  // the angle: the house azimuth (the frame's own for the gate); the camera keeps what the person orbited to until the next one is asked for
  useLayoutEffect(() => { place(dirOf(frame?.az ?? az, frame?.el ?? EL)) }, [az, frame, rig, controls]) // eslint-disable-line react-hooks/exhaustive-deps

  // the view: a material switch
  useLayoutEffect(() => {
    const m = flat ? 'flat' : view
    rig.mesh.material = mats.body[m]
    wire.visible = view === 'wire' && !flat
    rig.root.traverse((o) => { if (o.userData.part) (o as THREE.Mesh).material = mats.part[m] })
    invalidate()
  }, [view, flat, mats, rig, wire, invalidate, rigJson, keysJson, sigJson, partDefs, partKey])

  // hold for before: the posed surface at the press, drawn as a translucent ghost behind the live one
  useLayoutEffect(() => {
    ghost.children.forEach((c) => (c as THREE.Mesh).geometry.dispose())
    ghost.clear()
    if (held !== null) {
      const gs: THREE.BufferGeometry[] = []
      const v = new THREE.Vector3()
      rig.root.updateMatrixWorld(true)
      rig.root.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh || m === wire) return
        const pos = m.geometry.getAttribute('position')
        const out = new Float32Array(pos.count * 3)
        for (let i = 0; i < pos.count; i++) {
          const sk = m as THREE.SkinnedMesh
          sk.isSkinnedMesh ? sk.getVertexPosition(i, v) : v.fromBufferAttribute(pos, i)
          v.applyMatrix4(m.matrixWorld).toArray(out, i * 3)
        }
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.BufferAttribute(out, 3))
        g.setIndex(m.geometry.getIndex())
        gs.push(g)
      })
      const merged = mergeGeometries(gs)
      gs.forEach((g) => g.dispose())
      if (merged) { const g = new THREE.Mesh(merged, mats.ghost); g.renderOrder = 2; g.frustumCulled = false; ghost.add(g) }
    }
    invalidate()
  }, [held]) // eslint-disable-line react-hooks/exhaustive-deps

  // a frame drawn after the first pose: the page's measure of "first paint" and the marker the shots and the gate wait for
  const drawn = useRef(0)
  useFrame(({ gl }) => {
    drawn.current += 1
    gl.domElement.dataset.frames = String(drawn.current)
    if (drawn.current === 1) {
      const now = performance.now()
      const w = window as unknown as { __vp?: Record<string, number> }
      w.__vp = { ...(w.__vp ?? {}), creatureMs: now - t0.current, firstFrame: now }
      gl.domElement.dataset.ready = '1'
    }
  })

  return (
    <>
      <primitive object={rig.root} />
      <primitive object={ghost} />
    </>
  )
}

function firstGeometry(o: THREE.Object3D): THREE.BufferGeometry | null {
  let g: THREE.BufferGeometry | null = null
  o.traverse((c) => { if (!g && (c as THREE.Mesh).isMesh) g = (c as THREE.Mesh).geometry })
  return g
}

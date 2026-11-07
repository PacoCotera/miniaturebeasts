import * as THREE from 'three'
// the part of a loaded GLTF the zone map needs (drei's useGLTF gives more)
export type Gltf = { parser: { json: unknown; getDependency(type: string, index: number): Promise<unknown> } }
import type { EyeStation, Studio } from './studio'
import type { ViewMode } from './views'

// The views of the live creature. All are materials: a view switch costs no bytes (R5).

// The house clay: a matcap drawn once in a canvas (warm light from the upper left, a cool rim), as the proxy renderer's clay.
export function clayMatcap(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(96, 84, 8, 128, 128, 128)
  grd.addColorStop(0, '#f4efe7')
  grd.addColorStop(0.45, '#c9c1b6')
  grd.addColorStop(0.8, '#8f8a86')
  grd.addColorStop(1, '#5b6170')
  g.fillStyle = grd
  g.fillRect(0, 0, 256, 256)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// The house eye at the sculpt's eye stations (the sidecar's points and radius, in the rest pose so it rides the skin): an iris disc, a dark pupil, one catch light up and back.
// The stations are in the sculpt's frame (z up); the scene is glTF's (y up): (x, y, z) -> (x, z, -y).
export const eyeAt = (e: EyeStation) => new THREE.Vector3(e.point[0], e.point[2], -e.point[1])
const EYE_GLSL = `
vec3 houseEye(vec3 base, vec3 iris, bool useIris) {
  for (int i = 0; i < 2; i++) {
    vec3 d = vRest - eyeP[i];
    float r = length(d);
    if (useIris && r < eyeR * 0.95) base = vec3(0.04, 0.035, 0.045);
    if (useIris && r < eyeR * 0.84) base = iris;
    if (r < eyeR * 0.46) base = vec3(0.07, 0.06, 0.08);
    vec3 cp = eyeP[i] + vec3(-0.02, 0.32 * eyeR, 0.0) + vec3(0.0, 0.0, (eyeP[i].z > 0.0 ? -1.0 : 1.0) * 0.3 * eyeR);
    vec3 dc = vRest - cp;
    if (length(dc.yz) < eyeR * 0.15 && abs(dc.x) < eyeR * 0.8) base = vec3(0.98, 0.97, 0.95);
  }
  return base;
}`
function withEyes(sh: THREE.WebGLProgramParametersWithUniforms, eyes: EyeStation[]) {
  const pts = [0, 1].map((i) => eyeAt(eyes[Math.min(i, eyes.length - 1)]))
  sh.uniforms.eyeP = { value: pts }
  sh.uniforms.eyeR = { value: eyes[0].radius }
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRest;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = position;')
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nuniform vec3 eyeP[2];\nuniform float eyeR;\nvarying vec3 vRest;\n${EYE_GLSL}`)
}

export const IRIS: Record<string, string> = { amber: '#c47a2c', brown: '#5a3a22', green: '#5f8f4a', blue: '#4f7fb0', grey: '#8a8f99', black: '#26242c' }

// The coat preview: the zone map is an index atlas (0 coat, 1 cream, 2 toe pad, 3 eye ring, 4 eye disc); it is painted once to a palette texture from the land's colours and then filtered like any texture, so the edges between zones are clean at any size.
export function coatPalette(look: Studio['look']): string[] {
  const land = look.land ?? { body: '#9a8f86', marking: '#5e5560', accent: '#e2d3b4' }
  return [land.body, land.accent, land.marking, land.accent, IRIS[look.iris ?? ''] ?? IRIS.amber]
}

/** The zone map of a sculpt GLB (an image no material uses), painted to the palette. Null when the GLB has no zone map. */
export async function zoneTexture(gltf: Gltf, palette: string[]): Promise<THREE.Texture | null> {
  const json = gltf.parser.json as { asset?: { extras?: { zonemap?: { image?: number } } }; images?: { bufferView?: number }[] }
  const zi = json.asset?.extras?.zonemap?.image ?? 0
  const bv = json.images?.[zi]?.bufferView
  if (bv === undefined) return null
  const buf = (await gltf.parser.getDependency('bufferView', bv)) as ArrayBuffer
  const bmp = await createImageBitmap(new Blob([buf], { type: 'image/png' }), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })
  const c = document.createElement('canvas')
  c.width = bmp.width
  c.height = bmp.height
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.drawImage(bmp, 0, 0)
  const px = g.getImageData(0, 0, c.width, c.height)
  const rgb = palette.map((h) => new THREE.Color(h).convertLinearToSRGB()).map((col) => [Math.round(col.r * 255), Math.round(col.g * 255), Math.round(col.b * 255)])
  for (let i = 0; i < px.data.length; i += 4) {
    const z = Math.min(px.data[i], rgb.length - 1)
    px.data[i] = rgb[z][0]
    px.data[i + 1] = rgb[z][1]
    px.data[i + 2] = rgb[z][2]
    px.data[i + 3] = 255
  }
  g.putImageData(px, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.flipY = false // glTF's uv origin is the top left
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.magFilter = THREE.LinearFilter
  t.anisotropy = 8
  return t
}

export type Mats = { body: Record<ViewMode | 'flat', THREE.Material>; part: Record<ViewMode | 'flat', THREE.Material>; ghost: THREE.Material; all: THREE.Material[]; textures: THREE.Texture[] }

/** The materials of every view, for the body (with the house eye) and for the parts (without: their local frame is not the sculpt's). */
export function makeMaterials(opts: { eyes: EyeStation[]; zone: THREE.Texture | null; look: Studio['look']; partColour?: string }): Mats {
  const mc = clayMatcap()
  const pal = coatPalette(opts.look)
  const irisClay = new THREE.Color(pal[4])
  const clay = (eyes: boolean) => {
    const m = new THREE.MeshMatcapMaterial({ matcap: mc, color: '#f2f2f2', polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })
    if (eyes && opts.eyes.length) {
      m.onBeforeCompile = (sh) => {
        withEyes(sh, opts.eyes)
        sh.fragmentShader = sh.fragmentShader
          .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `vec4 diffuseColor = vec4( houseEye(diffuse, vec3(${irisClay.r}, ${irisClay.g}, ${irisClay.b}), true), opacity );`)
          .replace('vec4 matcapColor = texture2D( matcap, uv );', 'vec4 matcapColor = texture2D( matcap, uv );\nif (diffuseColor.r < 0.5 || diffuseColor.r > 0.97) matcapColor = vec4(1.0);')
      }
    }
    return m
  }
  const coat = (eyes: boolean) => {
    const m = new THREE.MeshStandardMaterial({ map: opts.zone, color: opts.zone ? '#ffffff' : pal[0], roughness: 0.92, metalness: 0 })
    if (eyes && opts.eyes.length) {
      m.onBeforeCompile = (sh) => {
        withEyes(sh, opts.eyes)
        sh.uniforms.irisCol = { value: new THREE.Color(pal[4]) }
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 irisCol;').replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = houseEye(diffuseColor.rgb, irisCol, false);')
      }
    }
    return m
  }
  const parts = new THREE.MeshStandardMaterial({ color: opts.partColour ?? pal[1], roughness: 0.9 })
  const partsBody = new THREE.MeshMatcapMaterial({ matcap: mc, color: '#d9a35f' })
  const flat = new THREE.MeshBasicMaterial({ color: '#1a1a1f' })
  const normal = new THREE.MeshNormalMaterial()
  const body = { coat: coat(true), clay: clay(true), normal, parts: new THREE.MeshMatcapMaterial({ matcap: mc, color: '#9fb4d6' }), wire: clay(true), flat }
  const part = { coat: parts, clay: clay(false), normal, parts: partsBody, wire: clay(false), flat }
  const ghost = new THREE.MeshBasicMaterial({ color: '#3d5bd0', transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide })
  return { body, part, ghost, all: [...new Set<THREE.Material>([...Object.values(body), ...Object.values(part), ghost])], textures: [mc] }
}

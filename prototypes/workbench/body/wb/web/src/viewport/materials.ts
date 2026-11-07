import * as THREE from 'three'
import { albedoOf, coatTune, DEFAULT_GAMMA, hexToLinear, loikaTargets, PUPIL, RIM, type ZoneName } from './coat'
// the part of a loaded GLTF the zone map needs (drei's useGLTF gives more)
export type Gltf = { parser: { json: unknown; getDependency(type: string, index: number): Promise<unknown> } }
import type { EyeStation, Studio } from './studio'
import type { ViewMode } from './views'

// The views of the live creature. All are materials: a view switch costs no bytes (R5).

// The house clay: a matcap drawn once in a canvas (warm light from the upper left, a warm shade at the edge: nothing cool, the key is warm), as the proxy renderer's clay.
export function clayMatcap(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(96, 84, 8, 128, 128, 128)
  grd.addColorStop(0, '#f4efe7')
  grd.addColorStop(0.45, '#cbc2b6')
  grd.addColorStop(0.8, '#948b84')
  grd.addColorStop(1, '#6a615c')
  g.fillStyle = grd
  g.fillRect(0, 0, 256, 256)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// The house eye at the sculpt's eye stations (the sidecar's points, normals and radius, in the rest pose so it rides the skin), drawn as a flat decal in the tangent plane of the station, as Blender's face lies on the head:
// from the outside a thin dark rim, the cream ring, the iris, the pupil, and one catch light up and back. The decal is drawn flat in its own colours (a decal is not lit), so the ring is the same cream whatever the light does on the head.
// The stations are in the sculpt's frame (z up); the scene is glTF's (y up): (x, y, z) -> (x, z, -y).
export const eyeAt = (e: EyeStation) => new THREE.Vector3(e.point[0], e.point[2], -e.point[1])
export const eyeNormal = (e: EyeStation) => new THREE.Vector3(e.normal[0], e.normal[2], -e.normal[1]).normalize()
export const EYE_SCALE = 1.27 // the decal's unit radius is this far past the station radius: where the zone map paints its eye ring (the decal covers it, a thinner ring puts the coat back over the rest)
export const IRIS_R = 0.62 // the iris's outer radius in decal units: large, whatever the ring
export const PUPIL_R = 0.31
/** The ring band over the iris radius by the Eyes trait (art desk, R5b): thin rings 0.20, between 0.35, wide pale rings 0.50. A file with no Eyes value gets between. */
export const RING_OVER_IRIS: Record<string, number> = { thin: 0.2, between: 0.35, wide: 0.5 }
export const ringOver = (eyes?: string | null) => RING_OVER_IRIS[eyes ?? ''] ?? RING_OVER_IRIS.between
export const ringOuter = (eyes?: string | null) => IRIS_R * (1 + ringOver(eyes)) // outer radius of the ring in decal units
const EYE_GLSL = `
// level: 0 nothing, 1 the decal (flat colour col), 3 the ring (the decal lit with the head's light, as the muzzle is), 2 the coat put back over the zone map's ring where the decal's ring is thinner
vec3 houseEye(vec3 base, out float hit, out vec3 col) {
  hit = 0.0;
  col = base;
  for (int i = 0; i < 2; i++) {
    vec3 d = vRest - eyeP[i];
    float h = dot(d, eyeN[i]);
    if (abs(h) > 0.8 * eyeR) continue;
    vec3 t = d - eyeN[i] * h;
    float r = length(t) / (eyeR * ${EYE_SCALE.toFixed(2)});
    if (r > 1.1) continue;
    if (r > ringOut + 0.03 && fillCoat > 0.5) { hit = 2.0; return coatAlb; }
    if (r > ringOut + 0.03) continue;
    vec3 up = normalize(vec3(0.0, 1.0, 0.0) - eyeN[i] * eyeN[i].y);
    vec3 back = normalize(vec3(-1.0, 0.0, 0.0) + eyeN[i] * eyeN[i].x);
    bool lit = false;
    col = ringCol;
    if (r > ringOut - 0.04) { col = rimCol; lit = fillCoat > 0.5; }
    else if (r < ${PUPIL_R.toFixed(2)}) col = pupilCol;
    else if (r < ${IRIS_R.toFixed(2)}) col = irisCol;
    else lit = true;
    if (length(t - up * 0.40 * eyeR - back * 0.30 * eyeR) < 0.17 * eyeR) { col = hiCol; lit = false; }
    base = col;
    hit = lit ? 3.0 : 1.0;
  }
  return base;
}`
type EyeCols = { ring: THREE.Color; iris: THREE.Color; pupil: THREE.Color; rim: THREE.Color; hi: THREE.Color }
type EyeOpts = { ringOut: number; fillCoat: boolean; coatAlb: THREE.Color }
function withEyes(sh: THREE.WebGLProgramParametersWithUniforms, eyes: EyeStation[], cols: EyeCols, o: EyeOpts) {
  const at = (i: number) => eyes[Math.min(i, eyes.length - 1)]
  sh.uniforms.eyeP = { value: [0, 1].map((i) => eyeAt(at(i))) }
  sh.uniforms.eyeN = { value: [0, 1].map((i) => eyeNormal(at(i))) }
  sh.uniforms.eyeR = { value: eyes[0].radius }
  sh.uniforms.ringOut = { value: o.ringOut }
  sh.uniforms.fillCoat = { value: o.fillCoat ? 1 : 0 }
  sh.uniforms.coatAlb = { value: o.coatAlb }
  for (const [k, v] of Object.entries(cols)) sh.uniforms[`${k}Col`] = { value: v }
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRest;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = position;')
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nuniform vec3 eyeP[2];\nuniform vec3 eyeN[2];\nuniform float eyeR;\nuniform float ringOut;\nuniform float fillCoat;\nuniform vec3 coatAlb;\nuniform vec3 ringCol;\nuniform vec3 irisCol;\nuniform vec3 pupilCol;\nuniform vec3 rimCol;\nuniform vec3 hiCol;\nvarying vec3 vRest;\n${EYE_GLSL}`)
}

// The coat's spread (art desk, R5b): the painted master's coat runs L p5 0.17, median 0.29, p95 0.47, fur sheen on the lit side and deep shade in the creases. The light alone gives a narrower coat, so the coat's own pixels
// (those the zone map paints with the coat) are put through a contrast curve about the coat's median, per channel: the median stays where the landing put it, the lit side brightens and the shade deepens in the coat's own hue (nothing white, nothing blue).
// The exponent is the cell's own (coatCells.json): its spread is the master's ratios to its own median, with p95 held at or under 0.92 so a light cell does not clip.
// The cream zones (muzzle, chest, belly, toe pads, the lit eye ring) ease their chroma from L 0.6 (fully by 0.9), so a highlight goes warm-white, not peach.
const CURVE_GLSL = `
if (coatGamma > 1.0) {
  float w = 1.0 - smoothstep(0.0, 0.03, distance(diffuseColor.rgb, coatAlb));
  vec3 c0 = gl_FragColor.rgb;
  vec3 c1 = pow(max(c0, vec3(1e-5)) / coatMed, vec3(coatGamma)) * coatMed;
  gl_FragColor.rgb = mix(c0, c1, w);
}
{
  float dc = min(distance(diffuseColor.rgb, creamA[0]), min(distance(diffuseColor.rgb, creamA[1]), distance(diffuseColor.rgb, creamA[2])));
  float wc = 1.0 - smoothstep(0.0, 0.03, dc);
  float Y = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  float Lq = pow(max(Y, 0.0), 1.0 / 3.0);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(Y), smoothstep(0.6, 0.9, Lq) * 0.95 * wc);
}`

export const IRIS: Record<string, string> = { amber: '#c47a2c', brown: '#5a3a22', green: '#5f8f4a', blue: '#4f7fb0', grey: '#8a8f99', black: '#26242c' }

type Lin = [number, number, number]
const colourOf = ([r, g, b]: Lin) => new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace)
const HI: Lin = [0.97, 0.95, 0.9]
export const WHITE = 0.35 // the albedo of the light-measuring render: a grey that the key does not clip

/** The ids of the zones view: a grey per zone, read back from a render to say which zone a pixel is (scripts/coat_gain.mjs and the landing test). */
export const ZONE_ID = { coat: 0, cream: 1, toe: 2, ring: 3, iris: 4, pupil: 5, rim: 6, hi: 7, crest: 8 } as const
export const idGrey = (i: number) => (i + 1) * 25

export type Palette = { zones: Lin[]; eye: Record<keyof EyeCols, Lin>; crest: Lin; med?: Lin; gamma?: number; cream?: Lin[] } // med: the coat hex, linear, where the spread curve pivots; gamma: its exponent; cream: the albedos of the cream zones (the Loika only)
export type PaletteMode = 'coat' | 'white' | 'ids'

/** The coat's colours, linear. For the Loika: the zone table of the art desk (coat = the mibi's Tint x Shade cell; cream on muzzle, chest and belly, the toe pads and the eye ring; sage crest; the Iris trait), each set to the albedo that lands its rendered median on the hex.
 * Other kinds keep the land's colours (the preview they had). 'white': every zone white, for measuring the light. 'ids': every zone its id grey. The atlas is 0 coat, 1 cream, 2 toe pad, 3 eye ring, 4 eye disc. */
export function coatPalette(look: Studio['look'], mode: PaletteMode = 'coat'): Palette {
  if (mode !== 'coat') {
    const W: Lin = [WHITE, WHITE, WHITE]
    const g = (i: number): Lin => (mode === 'white' ? W : (hexToLinear(`#${idGrey(i).toString(16).padStart(2, '0').repeat(3)}`)))
    return { zones: [0, 1, 2, 3, 4].map(g), eye: { ring: g(3), iris: g(4), pupil: mode === "white" ? W : g(5), rim: mode === "white" ? W : g(6), hi: mode === "white" ? W : g(7) }, crest: g(8) }
  }
  if (look.loika) {
    const t = loikaTargets(look)
    const a = (z: ZoneName, h: string) => albedoOf(z, h)
    const tn = coatTune(look, t.cell)
    const coat = hexToLinear(t.coat).map((v, i) => Math.min(1, v * tn.gain[i])) as Lin
    // the ring is lit with the head's light, as the muzzle is (the iris, pupil and catch light are flat); the cream albedos are what the ease of chroma recognises
    return { zones: [coat, a('cream', t.cream), a('toe', t.toe), a('ring', t.ring), a('iris', t.iris)], eye: { ring: a('ring', t.ring), iris: hexToLinear(t.iris), pupil: hexToLinear(PUPIL), rim: a('ring', t.ring), hi: HI }, crest: a('crest', t.crest), med: hexToLinear(t.coat), gamma: tn.gamma, cream: [a('cream', t.cream), a('toe', t.toe), a('ring', t.ring)] }
  }
  const land = look.land ?? { body: '#9a8f86', marking: '#5e5560', accent: '#e2d3b4' }
  const iris = hexToLinear(IRIS[look.iris ?? ''] ?? IRIS.amber)
  return { zones: [land.body, land.accent, land.marking, land.accent].map(hexToLinear).concat([iris]) as Lin[], eye: { ring: hexToLinear(land.accent), iris, pupil: hexToLinear(PUPIL), rim: hexToLinear(land.accent), hi: HI }, crest: hexToLinear(land.accent) }
}

/** The zone map of a sculpt GLB (an image no material uses), painted to the palette. Null when the GLB has no zone map. */
export async function zoneTexture(gltf: Gltf, palette: Lin[], nearest = false): Promise<THREE.Texture | null> {
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
  const rgb = palette.map((p) => colourOf(p).convertLinearToSRGB()).map((col) => [Math.round(col.r * 255), Math.round(col.g * 255), Math.round(col.b * 255)])
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
  t.minFilter = nearest ? THREE.NearestFilter : THREE.LinearMipmapLinearFilter
  t.magFilter = nearest ? THREE.NearestFilter : THREE.LinearFilter
  t.generateMipmaps = !nearest
  t.anisotropy = nearest ? 1 : 8
  return t
}

export type Mats = { body: Record<ViewMode | 'flat', THREE.Material>; part: Record<ViewMode | 'flat', THREE.Material>; ghost: THREE.Material; all: THREE.Material[]; textures: THREE.Texture[] }

/** The materials of every view, for the body (with the house eye) and for the parts (without: their local frame is not the sculpt's). `zone` is the coat's zone texture, `white` and `ids` the same map painted for the measurements. */
export function makeMaterials(opts: { eyes: EyeStation[]; zone: THREE.Texture | null; white?: THREE.Texture | null; ids?: THREE.Texture | null; look: Studio['look']; partColour?: string }): Mats {
  const mc = clayMatcap()
  const pal = coatPalette(opts.look)
  const cols = (p: Palette): EyeCols => ({ ring: colourOf(p.eye.ring), iris: colourOf(p.eye.iris), pupil: colourOf(p.eye.pupil), rim: colourOf(p.eye.rim), hi: colourOf(p.eye.hi) })
  const clayCols = cols(pal)
  clayCols.rim.set(RIM) // the clay's eye has its thin dark rim
  if (opts.look.loika) clayCols.ring.set(loikaTargets(opts.look).ring) // flat in the clay: the hex itself
  const ringOut = ringOuter(opts.look.eyes)
  const clay = (eyes: boolean) => {
    const m = new THREE.MeshMatcapMaterial({ matcap: mc, color: '#f2f2f2', polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })
    if (eyes && opts.eyes.length) {
      m.onBeforeCompile = (sh) => {
        withEyes(sh, opts.eyes, clayCols, { ringOut, fillCoat: false, coatAlb: new THREE.Color() })
        sh.fragmentShader = sh.fragmentShader
          .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'float eyeHit; vec3 eyeCol; vec4 diffuseColor = vec4( houseEye(diffuse, eyeHit, eyeCol), opacity );')
          .replace('vec4 matcapColor = texture2D( matcap, uv );', 'vec4 matcapColor = texture2D( matcap, uv );\nif (eyeHit > 0.5) matcapColor = vec4(1.0);')
      }
    }
    return m
  }
  // the coat: the eye decal is flat in its own colours (the ring is the same cream wherever the light falls), the coat's own pixels go through the spread curve about the coat's median
  const coat = (map: THREE.Texture | null, p: Palette, basic = false) => {
    const m: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial = basic ? new THREE.MeshBasicMaterial({ map, color: map ? '#ffffff' : colourOf(p.zones[0]) }) : new THREE.MeshStandardMaterial({ map, color: map ? '#ffffff' : colourOf(p.zones[0]), roughness: 0.92, metalness: 0 })
    if (opts.eyes.length) {
      m.onBeforeCompile = (sh) => {
        withEyes(sh, opts.eyes, cols(p), { ringOut, fillCoat: true, coatAlb: colourOf(p.zones[0]) })
        sh.uniforms.coatMed = { value: colourOf(p.med ?? [1, 1, 1]) }
        sh.uniforms.coatGamma = { value: p.med ? p.gamma ?? DEFAULT_GAMMA : 1 }
        sh.uniforms.creamA = { value: (p.cream ?? [[-9, -9, -9], [-9, -9, -9], [-9, -9, -9]]).map(colourOf) }
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform vec3 coatMed;\nuniform float coatGamma;\nuniform vec3 creamA[3];')
          .replace('#include <map_fragment>', '#include <map_fragment>\nfloat eyeHit; vec3 eyeCol; diffuseColor.rgb = houseEye(diffuseColor.rgb, eyeHit, eyeCol);')
          .replace('#include <opaque_fragment>', `#include <opaque_fragment>\n${CURVE_GLSL}\nif (eyeHit > 0.5 && eyeHit < 1.5) gl_FragColor.rgb = eyeCol;`)
      }
    }
    return m
  }
  const palWhite = coatPalette(opts.look, 'white'), palIds = coatPalette(opts.look, 'ids')
  const partMat = (p: Palette, basic = false) => (basic ? new THREE.MeshBasicMaterial({ color: colourOf(p.crest) }) : new THREE.MeshStandardMaterial({ color: opts.partColour ?? colourOf(p.crest), roughness: 0.9 }))
  const partsBody = new THREE.MeshMatcapMaterial({ matcap: mc, color: '#d9a35f' })
  const flat = new THREE.MeshBasicMaterial({ color: '#1a1a1f' })
  const normal = new THREE.MeshNormalMaterial()
  const body = { coat: coat(opts.zone, pal), white: coat(opts.white ?? null, palWhite), zones: coat(opts.ids ?? null, palIds, true), clay: clay(true), normal, parts: new THREE.MeshMatcapMaterial({ matcap: mc, color: '#9fb4d6' }), wire: clay(true), flat }
  const part = { coat: partMat(pal), white: partMat(palWhite), zones: partMat(palIds, true), clay: clay(false), normal, parts: partsBody, wire: clay(false), flat }
  const ghost = new THREE.MeshBasicMaterial({ color: '#3d5bd0', transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide })
  return { body, part, ghost, all: [...new Set<THREE.Material>([...Object.values(body), ...Object.values(part), ghost])], textures: [mc] }
}

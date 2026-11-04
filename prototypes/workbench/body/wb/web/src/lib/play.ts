import { ApiError, call, getToken } from './api'
import { apiPath } from './prefix'

// Play (spec 2): the pick and the shape. Everything the page shows comes from the server: the starters, each toy's steps with their pictures, the plush of the mibi as it stands, and the wait's jobs.
export type Pic = { key: string | null; ready: boolean }
export type Step = { i: number; value: number; ok: boolean; why: string[]; end: { genome: string } & Pic; now: { genome: string } & Pic }
export type Option = { id: string; word: string; ok: boolean; why: string[]; end: { genome: string } & Pic; now: { genome: string } & Pic }
export type Axis = { id: string; locus: string; kind: 'range' | 'choice'; label: string; cage: boolean; virtual?: boolean; unit?: string; home: number | string; steps?: Step[]; options?: Option[] }
export type Toy = { id: string; label: string; plain: string; hidden: boolean; kind: string; screen?: 'shape' | 'pods'; axes: Axis[] }
export type Warm = { state: 'none' | 'running' | 'done'; done: number; total: number | null; result?: { frames: number; bytes: number; seconds: number; draw_seconds: number } }
export type PlayToys = { built: boolean; toys: Toy[]; genome: string; name: string; species: string; sentences: Record<string, string>; by_toy?: Record<string, Record<string, string>>; hold: string; warm: Warm }
export type Starter = { id: string; name: string; species: string; plan: string; built: boolean; genome: string; plush: Pic; warm: Warm | null; mine?: boolean }
export type Refusal = { ok: false; refused: true; sentence: string; back_to: number | string | null; toy: string; axis: string; why: string }
export type Saved = { ok: true; genome: string; plush: Pic & { job: string | null }; clay_job: string | null; undo: boolean; redo: boolean }
export type Job = { id: string; state: 'queued' | 'running' | 'done' | 'failed' | 'superseded'; error?: string; result?: { views?: { key: string }[] } }
export type Look = { genome: string; key: string | null; ready: boolean; job: string | null; clay_job: string | null }

// The pods of a make (spec 2.2, P3): each a whole genome of the file with its plush as it is drawn (or the job that draws it), the age gates it carries, the strip of this family's looks and the Grow toy's two end pictures.
export type Dial = 'alike' | 'some' | 'wild'
export type Stage = 'juvenile' | 'adult' | 'elder'
export type PodPic = Pic & { job: string | null }
export type Pod = { i: number; tries: number; genome: string; gated: { id: string; label: string; now: boolean }[] } & PodPic
export type FamilyRow = { id: string; label: string; locus: string; look: string; how: 'often' | 'sometimes' | 'rarely' | 'grown'; share: number; pic: PodPic }
export type Pods = { round: number; diff: Dial; grow: Stage; name: string; species: string; pods: Pod[]; grow_ends: ({ stage: Stage } & PodPic)[]; family: FamilyRow[]; names: string[] }
export type Kept = { id: string; name: string; species: string; parents: string[] }

export const picUrl = (key: string) => apiPath(`/cas/${key}.png`)
const id = (s: string) => encodeURIComponent(s)

export const getStarters = () => call<Starter[]>('GET', '/api/play/starters')
export const getToys = (s: string) => call<PlayToys>('GET', `/api/species/${id(s)}/toys`)
export const getSpecies = (s: string) => call<{ undo?: { undo: boolean; redo: boolean } }>('GET', `/api/species/${id(s)}`)
export const getLook = (s: string, genome?: string) => call<Look>('GET', `/api/species/${id(s)}/plush${genome ? `?genome=${encodeURIComponent(genome)}` : ''}`)
export const getBig = (s: string, genome: string) => call<Look>('GET', `/api/species/${id(s)}/plush?size=big&genome=${encodeURIComponent(genome)}`)
export const getJob = (j: string, wait = 2) => call<Job>('GET', `/api/jobs/${j}?wait=${wait}`)
export const getPods = (s: string, round: number, diff?: Dial, grow?: Stage) => call<Pods>('GET', `/api/species/${id(s)}/pods?round=${round}${diff ? `&diff=${diff}` : ''}${grow ? `&grow=${grow}` : ''}`)
// A clip of a genome (chunk 16): the strips of its frames side by side, the clay first and the plush after it; each is {key, ready}, and `frame_s` is how long one frame is shown.
export type ClipStrip = { key: string; ready: boolean; job: string | null }
export type Clip = { clip: 'walk' | 'idle'; genome: string; frames: number; period: number; frame_s: number; size: [number, number]; clay: ClipStrip; plush: ClipStrip }
export const getClip = (s: string, genome: string, clip: 'walk' | 'idle' = 'walk') => call<Clip>('GET', `/api/species/${id(s)}/clip?clip=${clip}&genome=${encodeURIComponent(genome)}`)
export const keepPod = (s: string, pod: { round: number; i: number; tries: number; diff: Dial; grow: Stage; name: string }) => call<Kept>('POST', `/api/species/${id(s)}/keep`, pod)
export const undoMove = (s: string) => call<{ undo: boolean; redo: boolean }>('POST', `/api/species/${id(s)}/undo`)

// A play save answers 200 with the new setting or 409 with the one sentence the mibi says; both are answers, not errors.
export async function saveMove(s: string, toy: string, axis: string, to: number | string): Promise<Saved | Refusal> {
  const tok = getToken()
  const r = await fetch(apiPath(`/api/species/${id(s)}/play`), { method: 'POST', headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) }, body: JSON.stringify({ toy, axis, to }) })
  const j = await r.json().catch(() => ({}))
  if (r.status === 200 || r.status === 409) return j as Saved | Refusal
  throw new ApiError(r.status, j.error ?? r.statusText, j.field)
}

// The mean colour of a toy's picture, for a paint pot: the pixels that are the body (opaque, and coloured rather than grey shadow).
export function potColour(src: string): Promise<string | null> {
  return new Promise((res) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = c.height = 48
      const g = c.getContext('2d')
      if (!g) return res(null)
      g.drawImage(img, 0, 0, 48, 48)
      const d = g.getImageData(0, 0, 48, 48).data
      let r = 0, gg = 0, b = 0, n = 0
      for (let i = 0; i < d.length; i += 4) {
        const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2])
        if (d[i + 3] > 240 && mx - mn > 40) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++ }
      }
      res(n > 8 ? `rgb(${Math.round(r / n)} ${Math.round(gg / n)} ${Math.round(b / n)})` : null)
    }
    img.onerror = () => res(null)
    img.src = src
  })
}

export const stepOf = (a: Axis, to: number | string): Step | Option | undefined => (a.kind === 'range' ? a.steps?.[to as number] : a.options?.find((o) => o.id === to))
export const homeKey = (a: Axis) => (a.kind === 'range' ? (a.home as number) : (a.home as string))
// Which sentence a trimmed step says: the first check that refused it, else the default.
export const sentenceFor = (p: PlayToys, toy: string, why: string[]) => p.by_toy?.[toy]?.[why[0] ?? 'default'] ?? p.sentences[why[0] ?? 'default'] ?? p.sentences.default ?? p.hold

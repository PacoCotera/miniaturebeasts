import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { casUrl, genomePicture, type Species } from '../lib/api'
import { useFrames } from '../lib/frames'
import { endDot, endsOf, fmt, proofEnd, selectedLocus, stageEnds, unitText, type Dot } from '../lib/genes'
import type { StudioUrl } from '../lib/url'
import { Plate } from './Plate'
import s from './GenesStage.module.css'

const RATIO = 304 / 312
const END = { w: 240, h: Math.round(240 / RATIO) }, MID = { w: 300, h: Math.round(300 / RATIO) }
const PROOF_RATIO = 608 / 780

function useEndPicture(species: Species | undefined, genome: string, az: number) {
  return useQuery({ queryKey: ['endpic', species?.id, species?.hash, genome, az], enabled: !!species, staleTime: Infinity, retry: false, queryFn: () => genomePicture(species!.id, genome, az) }).data ?? null
}

function Caption({ dot, value, word }: { dot: Dot; value: string; word: string }) {
  return (
    <figcaption className={s.cap}>
      {dot && <i className={s.dot} data-kind={dot} aria-label={dot === 'fail' ? 'fails at this end' : dot === 'pass' ? 'passes at this end' : 'measured on an older file'} />}
      <b className={s.val}>{value}</b><span className={s.word}>{word}</span>
    </figcaption>
  )
}

function End({ species, genome, az, value, caption, dot, proofSrc, stale }: { species: Species; genome: string; az: number; value: string; caption: string; dot: Dot; proofSrc: string | null; stale: boolean }) {
  const key = useEndPicture(species, genome, az)
  const w = END.w, h = proofSrc ? Math.round(w / PROOF_RATIO) : END.h
  return (
    <figure className={s.fig}>
      <Plate src={proofSrc ?? (key ? casUrl(key) : null)} kind="clay" width={w} height={h} stale={stale} tag={proofSrc ? 'proof' : undefined} tagKind={proofSrc ? 'proof' : undefined} alt={`${genome}, az ${az}`} />
      <Caption dot={dot} value={value} word={caption} />
    </figure>
  )
}

// The gene's two ends in clay with the type between them, so a limit is judged by looking (studio-ui 4.3). A failing end can show its proof in place of its clay.
export function GenesStage({ url, species, inset = 0 }: { url: StudioUrl; species: Species | undefined; inset?: number }) {
  const g = species?.file.genome
  const l = selectedLocus(g, url.sel)
  const frames = useFrames(species, url.view, [608, 304])
  const hero = frames[url.az]
  const ext = species?.extremes
  const ref = useRef<HTMLElement>(null)
  const [w, setW] = useState(0)
  useEffect(() => { const el = ref.current; if (!el) return; const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); return () => ro.disconnect() }, [])
  if (!species || !l) return <main className={s.stage} ref={ref} />
  const ends = stageEnds(l)
  const shown = proofEnd(ext, l.locus, url.proof)
  const scale = w ? Math.min(1, (w - 48 - 2 * 24) / (2 * END.w + MID.w)) : 1
  const first = ends[0], second = ends[1]
  const slot = (e: (typeof ends)[number]) => {
    const hit = endsOf(ext, l.locus).find((n) => n.genome === e.genome)
    const proof = hit && hit.id === shown?.id && hit.proof?.ready ? casUrl(hit.proof.key) : null
    return <End key={e.genome} species={species} genome={e.genome} az={url.az} value={typeof e.value === 'number' ? unitText(e.value, l.unit) : e.value} caption={e.caption} dot={endDot(ext, e, l.locus)} proofSrc={proof} stale={!!ext && !ext.fresh && !!hit} />
  }
  return (
    <main className={s.stage} ref={ref} style={inset ? { paddingBottom: inset + 8, justifyContent: 'flex-start' } : undefined}>
      <div className={s.ends} style={{ transform: scale < 1 ? `scale(${scale})` : undefined }}>
        {first && slot(first)}
        <figure className={s.fig}>
          <Plate src={hero?.src ?? null} kind="plush" width={MID.w} height={MID.h} stale={!!hero?.stale} alt={`${species.file.name}, the type, az ${url.az}`} />
          <Caption dot={null} value={typeof l.type === 'number' ? unitText(l.type, l.unit) : String(l.type)} word="type" />
        </figure>
        {second && slot(second)}
      </div>
      {l.op === 'blend' && <p className={s.note}>Limits {fmt((l.limits as number[])[0])} – {unitText((l.limits as number[])[1], l.unit)}; every other trait stays at its type value.</p>}
    </main>
  )
}

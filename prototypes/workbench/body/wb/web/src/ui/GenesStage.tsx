import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { casUrl, genomePicture, type Species } from '../lib/api'
import { endDot, endsOf, fmt, proofEnd, selectedLocus, stageEnds, stageView, unitText, type Dot, type StageView } from '../lib/genes'
import type { StudioUrl } from '../lib/url'
import { Plate } from './Plate'
import s from './GenesStage.module.css'

const RATIO = 304 / 312
const END = { w: 268, h: Math.round(268 / RATIO) }, MID = END // one scale for all three tiles: a difference in length reads as a length, and no tile crops the figure
const BAND = 156 / 608, FRAME = 624 / 608 // a proof picture is 608 wide: the frame, then a band for its chart

function useEndPicture(species: Species | undefined, genome: string, az: number) {
  return useQuery({ queryKey: ['endpic', species?.id, species?.hash, genome, az], enabled: !!species, staleTime: Infinity, retry: false, queryFn: () => genomePicture(species!.id, genome, az) }).data ?? null
}

function TypeTile({ species, view }: { species: Species; view: StageView }) {
  const key = useEndPicture(species, 'type', view.az)
  return <Plate src={key ? casUrl(key) : null} kind="clay" width={MID.w} height={MID.h} alt={`${species.file.name}, the type, az ${view.az}`} />
}

function Caption({ dot, value, word }: { dot: Dot; value: string; word: string }) {
  return (
    <figcaption className={s.cap}>
      {dot && <i className={s.dot} data-kind={dot} aria-label={dot === 'fail' ? 'fails at this end' : dot === 'pass' ? 'passes at this end' : 'measured on an older file'} />}
      <b className={s.val}>{value}</b><span className={s.word}>{word}</span>
    </figcaption>
  )
}

// A tile: the genome's clay from the locus's camera, the whole figure (the house frame, no crop). With a proof shown, the tile takes the proof's picture part (the frame with its callouts); its chart band goes under the row, where the labels are readable.
function End({ species, genome, view, w, h, value, caption, dot, proofSrc, stale }: { species: Species; genome: string; view: StageView; w: number; h: number; value: string; caption: string; dot: Dot; proofSrc: string | null; stale: boolean }) {
  const key = useEndPicture(species, genome, view.az)
  return (
    <figure className={s.fig}>
      <Plate src={proofSrc ? null : key ? casUrl(key) : null} kind="clay" width={w} height={h} stale={stale} tag={proofSrc ? 'proof' : undefined} tagKind={proofSrc ? 'proof' : undefined} alt={`${genome}, az ${view.az}`}>
        {proofSrc && <img src={proofSrc} alt="" draggable={false} style={{ position: 'absolute', left: 0, top: 0, width: '100%' }} />}
      </Plate>
      <Caption dot={dot} value={value} word={caption} />
    </figure>
  )
}

// The gene's two ends in clay with the type between them, so a limit is judged by looking (studio-ui 4.3). A failing end can show its proof in place of its clay.
export function GenesStage({ url, species, inset = 0 }: { url: StudioUrl; species: Species | undefined; inset?: number }) {
  const g = species?.file.genome
  const l = selectedLocus(g, url.sel)
  const ext = species?.extremes
  const ref = useRef<HTMLElement>(null)
  const [w, setW] = useState(0)
  useEffect(() => { const el = ref.current; if (!el) return; const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); return () => ro.disconnect() }, [])
  if (!species || !l) return <main className={s.stage} ref={ref} />
  const view = stageView(l)
  const ends = stageEnds(l)
  const shown = proofEnd(ext, l.locus, url.proof)
  const scale = w ? Math.min(1, (w - 48 - 2 * 24) / (2 * END.w + MID.w)) : 1
  void scale
  const first = ends[0], second = ends[1]
  const slot = (e: (typeof ends)[number]) => {
    const hit = endsOf(ext, l.locus).find((n) => n.genome === e.genome)
    const proof = hit && hit.id === shown?.id && hit.proof?.ready ? casUrl(hit.proof.key) : null
    return <End key={e.genome} species={species} genome={e.genome} view={view} w={END.w} h={END.h} value={typeof e.value === 'number' ? unitText(e.value, l.unit) : e.value} caption={e.caption} dot={endDot(ext, e, l.locus)} proofSrc={proof} stale={!!ext && !ext.fresh && !!hit} />
  }
  return (
    <main className={s.stage} ref={ref} style={inset ? { paddingBottom: inset + 8, justifyContent: 'flex-start' } : undefined}>
      <div className={s.ends} style={{ transform: scale < 1 ? `scale(${scale})` : undefined }}>
        {first && slot(first)}
        <figure className={s.fig}>
          <TypeTile species={species} view={view} />
          <Caption dot={null} value={typeof l.type === 'number' ? unitText(l.type, l.unit) : String(l.type)} word="type" />
        </figure>
        {second && slot(second)}
      </div>
      {shown?.proof?.ready && (
        <div className={s.band} style={{ width: 560, height: Math.round(560 * BAND) }} aria-label={`The proof's numbers for ${shown.id}`}>
          <img src={casUrl(shown.proof.key)} alt="" draggable={false} style={{ width: 560, marginTop: -Math.round(560 * FRAME) }} />
        </div>
      )}
      {l.op === 'blend' && <p className={s.note}>Limits {fmt((l.limits as number[])[0])} – {unitText((l.limits as number[])[1], l.unit)}; every other trait stays at its type value.</p>}
    </main>
  )
}

import { useEffect, useRef, useState } from 'react'
import type { Species } from '../lib/api'
import { renderViews, getToken, casUrl } from '../lib/api'
import { useFrames } from '../lib/frames'
import { useJobs } from '../lib/events'
import { useUI } from '../lib/store'
import { useTouch } from '../lib/useStudio'
import type { StudioUrl, View } from '../lib/url'
import { Plate } from './Plate'
import { ViewBar } from './ViewBar'
import { AngleStrip } from './AngleStrip'
import { W } from '../lib/words'
import s from './Stage.module.css'

const RATIO = 304 / 312 // the proxy frame, on its own light backdrop; the hero is its 608 x 624 render, the strip and the goldens use 304
const PROOF_RATIO = 608 / 780
const HERO_SIZES = [608, 304] // the hero shows the 304 until the 608 lands
const HERO = { w: 480, h: Math.round(480 / RATIO) }
const FOOT = 52 // the plate's own band under the figure, where the view bar floats, so it never covers the mibi's feet
const STRIP_W = 92, STRIP_H = Math.round(STRIP_W / RATIO)

export function Stage({ url, species, go, inset = 0 }: { url: StudioUrl; species: Species | undefined; go: (p: Partial<StudioUrl>, replace?: boolean) => void; inset?: number }) {
  const ref = useRef<HTMLElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const [tapped, setTapped] = useState(false)
  const [hover, setHover] = useState(false)
  const touch = useTouch()
  useEffect(() => { if (!tapped) return; const t = setTimeout(() => setTapped(false), 4000); return () => clearTimeout(t) }, [tapped])

  const frames = useFrames(species, url.view, HERO_SIZES)
  const clay = useFrames(species, 'clay')
  const jobs = useJobs(url.species)
  const before = useUI((u) => u.before)
  const setBefore = useUI((u) => u.setBefore)

  if (url.mode !== 'shape') return <main className={s.stage} ref={ref} />

  const pad = 24, gap = 16, label = 22
  const strip = inset === 0 // the angle strip steps aside while the Checks drawer is open
  const availH = Math.max(0, box.h - inset - 2 * pad - (strip ? gap + STRIP_H + label : 0) - FOOT)
  const availW = Math.max(0, box.w - 2 * pad)
  const scale = Math.min(1, availW / HERO.w, availH / HERO.h)
  const hw = Math.round(HERO.w * scale), hh = Math.round(HERO.h * scale)

  const hero = frames[url.az]
  const proofRow = species?.checks?.rows.find((r) => r.id === url.proof)
  const proof = proofRow?.proof?.ready ? proofRow.proof : null
  const pw = proof ? Math.min(hw, Math.round((availH + FOOT) * PROOF_RATIO)) : hw // a proof is the frame with its chart band under the figure (608 x 780): the plate takes its shape
  const ph = proof ? Math.round(pw / PROOF_RATIO) : hh + FOOT
  const progress = jobs.some((j) => j.state === 'running') ? (jobs.find((j) => j.state === 'running' && j.progress != null)?.progress ?? 'indeterminate') : null
  const showBefore = before && hero?.before && !proof
  const src = proof ? casUrl(proof.key) : showBefore ? hero.before : hero?.src ?? null
  const ready = (v: View) => !!species?.views.some((x) => x.mode === v && x.az === url.az && x.ready) || !!getToken()
  const pick = (v: View) => {
    go({ view: v })
    if (!species?.views.some((x) => x.mode === v && x.ready) && getToken()) void renderViews(url.species, v)
  }
  return (
    <main className={s.stage} ref={ref} style={inset ? { paddingBottom: inset + 8, justifyContent: 'flex-start' } : undefined}>
      <div className={s.hero}>
        <Plate onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)} onPointerDown={() => touch && setTapped(true)} src={src} kind="clay" width={pw} height={ph} footer={proof ? 0 : FOOT} stale={!proof && !!hero?.src && hero.stale && !showBefore} progress={!proof && hero?.stale ? progress : null} tag={proof ? `proof · az ${proof.az}` : showBefore ? W.before : undefined} tagKind={proof ? 'proof' : undefined} alt={`${species?.file.name ?? url.species}, ${url.view}, az ${url.az}`} className={s.heroPlate}>
          <ViewBar view={url.view} onView={pick} available={ready} onBefore={setBefore} canBefore={!!hero?.before} show={tapped || hover} />
        </Plate>
      </div>
      {strip && <AngleStrip az={url.az} onAz={(a) => go({ az: a }, true)} frames={clay} progress={progress} w={STRIP_W} h={STRIP_H} />}
    </main>
  )
}

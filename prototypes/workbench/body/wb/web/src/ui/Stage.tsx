import { useEffect, useRef, useState } from 'react'
import type { Species } from '../lib/api'
import { renderViews, getToken } from '../lib/api'
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
const HERO_SIZES = [608, 304] // the hero shows the 304 until the 608 lands
const HERO = { w: 480, h: Math.round(480 / RATIO) }
const FOOT = 52 // the plate's own band under the figure, where the view bar floats, so it never covers the mibi's feet
const STRIP_W = 92, STRIP_H = Math.round(STRIP_W / RATIO)

export function Stage({ url, species, go }: { url: StudioUrl; species: Species | undefined; go: (p: Partial<StudioUrl>, replace?: boolean) => void }) {
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
  const availH = Math.max(0, box.h - 2 * pad - gap - STRIP_H - label - FOOT)
  const availW = Math.max(0, box.w - 2 * pad)
  const scale = Math.min(1, availW / HERO.w, availH / HERO.h)
  const hw = Math.round(HERO.w * scale), hh = Math.round(HERO.h * scale)

  const hero = frames[url.az]
  const progress = jobs.some((j) => j.state === 'running') ? (jobs.find((j) => j.state === 'running' && j.progress != null)?.progress ?? 'indeterminate') : null
  const showBefore = before && hero?.before
  const src = showBefore ? hero.before : hero?.src ?? null
  const ready = (v: View) => !!species?.views.some((x) => x.mode === v && x.az === url.az && x.ready) || !!getToken()
  const pick = (v: View) => {
    go({ view: v })
    if (!species?.views.some((x) => x.mode === v && x.ready) && getToken()) void renderViews(url.species, v)
  }
  return (
    <main className={s.stage} ref={ref}>
      <div className={s.hero}>
        <Plate onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)} onPointerDown={() => touch && setTapped(true)} src={src} kind="clay" width={hw} height={hh + FOOT} footer={FOOT} stale={!!hero?.src && hero.stale && !showBefore} progress={hero?.stale ? progress : null} tag={showBefore ? W.before : undefined} alt={`${species?.file.name ?? url.species}, ${url.view}, az ${url.az}`} className={s.heroPlate}>
          <ViewBar view={url.view} onView={pick} available={ready} onBefore={setBefore} canBefore={!!hero?.before} show={tapped || hover} />
        </Plate>
      </div>
      <AngleStrip az={url.az} onAz={(a) => go({ az: a }, true)} frames={clay} progress={progress} w={STRIP_W} h={STRIP_H} />
    </main>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { casUrl, getToken, type Species } from '../lib/api'
import { goldenJob, goldensOne, goldenUrl, pick, type GEntry } from '../lib/goldens'
import { GVIEWS, type GView, type StudioUrl } from '../lib/url'
import { W } from '../lib/words'
import s from './GoldensStage.module.css'

// Goldens mode's stage (studio-ui 4.3): the golden and now, split by a handle (Side by side and Diff in the hover bar), the small game sizes at 1x under it.
// `now` of a golden whose key has not moved is the golden itself (the same key draws the same bytes). Once the key has moved the set is drawn again (a diff job, started when the mode opens), and `now` is that picture.
function Img({ src, alt, w, h }: { src: string | null; alt: string; w: number; h: number }) {
  const [bad, setBad] = useState(false)
  useEffect(() => setBad(false), [src])
  return src && !bad ? <img className={s.img} src={src} alt={alt} width={w} height={h} draggable={false} onError={() => setBad(true)} /> : <span className={s.none} role="img" aria-label={`${alt}: no picture`} />
}

const nowOf = (id: string, e: GEntry): string | null => (e.state === 'same' && !e.now ? goldenUrl(id, e.id) : e.now ? casUrl(e.now) : null)
export const label = (v: GView) => W.gold.views[GVIEWS.indexOf(v)]

function Split({ gold, now, h }: { gold: string | null; now: string | null; h: number }) {
  const [x, setX] = useState(50)
  const box = useRef<HTMLDivElement>(null)
  const move = (cx: number) => { const r = box.current!.getBoundingClientRect(); setX(Math.max(2, Math.min(98, ((cx - r.left) / r.width) * 100))) }
  return (
    <div ref={box} className={s.split} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); move(e.clientX) }} onPointerMove={(e) => { if (e.buttons) move(e.clientX) }}>
      <Img src={gold} alt={W.gold.golden} w={304} h={h} />
      <div className={s.nowClip} style={{ clipPath: `inset(0 0 0 ${x}%)` }}><Img src={now} alt={W.gold.now} w={304} h={h} /></div>
      <span className={s.line} style={{ left: `${x}%` }} />
      <span className={s.handle} style={{ left: `${x}%` }} role="slider" aria-label="Split handle" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(x)} tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'ArrowLeft') setX((v) => Math.max(2, v - 5)); if (e.key === 'ArrowRight') setX((v) => Math.min(98, v + 5)) }} />
      <span className={s.tag}>{W.gold.golden}</span><span className={`${s.tag} ${s.r}`}>{W.gold.now}</span>
    </div>
  )
}

export function GoldensStage({ url, species, go, inset = 0 }: { url: StudioUrl; species: Species | undefined; go: (p: Partial<StudioUrl>, r?: boolean) => void; inset?: number }) {
  const q = useQuery({ ...goldensOne(url.species, species?.hash ?? ''), enabled: !!species })
  const g = q.data
  const asked = useRef(new Set<string>())
  // A set whose key has moved is drawn again as soon as the mode opens (the page may write); the done event refetches the states.
  useEffect(() => {
    if (!g || !g.have || g.totals.stale === 0 || !getToken() || asked.current.has(g.current.key)) return
    asked.current.add(g.current.key)
    void goldenJob(url.species, 'diff')
  }, [g, url.species])
  if (!species || !g) return <main className={s.stage}>{q.isError && <p className={s.note}>{(q.error as Error).message}</p>}</main>
  const e = pick(g, url.sel)
  if (!e) return <main className={s.stage} />
  const w = e.size?.[0] ?? 304
  const h = e.size?.[1] ?? 312
  const gold = e.state === 'missing' ? null : goldenUrl(url.species, e.id)
  const now = nowOf(url.species, e)
  const small = ['card/adult-calm', 'thumb/adult-calm'].map((id) => g.entries.find((x) => x.id === id)).filter((x): x is GEntry => !!x && x.id !== e.id)
  return (
    <main className={s.stage} style={inset ? { paddingBottom: inset + 8 } : undefined}>
      <div className={s.plate} data-view={url.gv} style={{ aspectRatio: `${w} / ${h}` }}>
        {url.gv === 'split' && <Split gold={gold} now={now} h={h} />}
        {url.gv === 'side' && <div className={s.side}><figure><Img src={gold} alt={W.gold.golden} w={w} h={h} /><span className={s.tag}>{W.gold.golden}</span></figure><figure><Img src={now} alt={W.gold.now} w={w} h={h} /><span className={`${s.tag} ${s.l}`}>{W.gold.now}</span></figure></div>}
        {url.gv === 'diff' && <Img src={e.heat ? casUrl(e.heat) : gold} alt="Diff" w={w} h={h} />}
        <div className={s.bar} role="group" aria-label="View">
          {GVIEWS.map((v) => <button key={v} className={s.item} data-state={url.gv === v ? 'on' : 'off'} aria-pressed={url.gv === v} onClick={() => go({ gv: v }, true)}>{label(v)}</button>)}
        </div>
      </div>
      {small.length > 0 && (
        <div className={s.small}>
          {small.map((x) => (
            <figure key={x.id}>
              <div className={s.sp} style={{ width: x.size?.[0], height: x.size?.[1] }}><Img src={x.now ? casUrl(x.now) : goldenUrl(url.species, x.id)} alt={x.label ?? x.id} w={x.size?.[0] ?? 48} h={x.size?.[1] ?? 48} /></div>
              <figcaption>{x.size?.[0]}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </main>
  )
}

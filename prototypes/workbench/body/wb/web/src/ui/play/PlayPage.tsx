import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getStarters, picUrl, potColour, type Axis, type Option, type Pic, type Starter, type Step, type Toy } from '../../lib/play'
import { P } from '../../lib/words'
import { useBench } from './useBench'
import { withEyes } from '../../lib/eyes'
import s from './play.module.css'

// P1 and P2 (spec 2.2). Play shows no number, no dot of a check and no drawer: a picture at each end of a toy, chips with pictures, paint pots, and the mibi's own sentence when something stops.
const Arrow = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 7H15a5 5 0 0 1 0 10H8" /><path d="M12 3.5 8.5 7 12 10.5" /></svg>
export const Chevron = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
const Note = () => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 3v11.3A3.5 3.5 0 1 0 11 17.5V7.5l8-2v8.8A3.5 3.5 0 1 0 21 17.5V3z" transform="translate(-2 1) scale(.95)" /></svg>
const Dice = () => <svg className={s.dice} viewBox="0 0 128 128" aria-hidden="true"><g transform="rotate(-9 64 64)"><rect x="14" y="20" width="100" height="96" rx="22" fill="#d8c7a3" /><rect x="14" y="14" width="100" height="96" rx="22" fill="#f1ebdf" />{[[40, 40], [88, 40], [64, 62], [40, 84], [88, 84]].map(([x, y]) => <circle key={x + '-' + y} cx={x} cy={y} r="9" fill="#814398" />)}</g></svg>

// Play lives at /play, and behind the site's proxy at /studio/play: a move inside it keeps the prefix it came in by.
export const root = () => (window.location.pathname.startsWith('/studio/') ? '/studio/play' : '/play')

export function Frame({ children }: { children: ReactNode }) {
  return <div className={s.root}><div className={s.frame}>{children}</div></div>
}

// ---- P1: pick a mibi
export function Pick() {
  const nav = useNavigate()
  const [starters, setStarters] = useState<Starter[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    let dead = false
    const tick = async () => {
      try {
        const l = await getStarters()
        if (dead) return
        setStarters(l)
        if (l.some((x) => x.built && !x.plush.ready)) window.setTimeout(tick, 3000)       // a cushion still waiting for its picture: ask again
      } catch (e) { if (!dead) setErr(String((e as Error).message)) }
    }
    void tick()
    return () => { dead = true }
  }, [])
  const [shelfOpen, setShelfOpen] = useState(false)             // on a phone the shelf is a panel that My mibis opens: nothing of it peeks in at the edge
  const mineList = (starters ?? []).filter((x) => x.mine && x.built)
  const surprise = () => {
    const l = (starters ?? []).filter((x) => x.built)
    if (l.length) nav(`${root()}/${l[Math.floor(Math.random() * l.length)].id}?surprise=1`)
  }
  return (
    <Frame>
      <div className={s.bar}><div className={s.mine} role="button" tabIndex={0} onClick={() => setShelfOpen((o) => !o)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShelfOpen((o) => !o) }}>{P.mine}<span className={s.count} aria-label={mineList.length ? P.mine : P.noMibis}>{mineList.length}</span></div></div>
      <div className={s.pick}>
        <div className={s.head}><h1>{P.title}</h1><p>{P.sub}</p></div>
        {err ? <p className={s.err}>{P.noBench}</p> : (
          <div className={s.cushions}>
            {(starters ?? []).filter((x) => x.built && !x.mine).map((x) => (
              <div key={x.id} className={s.cushion} role="button" tabIndex={0} aria-label={`${x.name}, ${P.species(x.species)}`} onClick={() => nav(`${root()}/${x.id}`)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') nav(`${root()}/${x.id}`) }}>
                <div className={s.box}><div className={s.pad} />
                  {x.plush.ready && x.plush.key ? <img className={s.fig} src={picUrl(x.plush.key)} alt="" draggable={false} /> : <div className={s.wait}><div className={s.yarn} /></div>}</div>
                <div className={s.nm}>{x.name}</div>
                <div className={s.sp}>{P.species(x.species)}</div>
              </div>
            ))}
            <div className={s.cushion} role="button" tabIndex={0} aria-label={P.surprise} onClick={surprise} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') surprise() }}>
              <div className={s.box}><div className={s.pad} /><div className={s.wait}><Dice /></div></div>
              <div className={s.nm}>{P.surprise}</div>
            </div>
          </div>
        )}
        <div className={s.shelf} data-open={shelfOpen || undefined}><b>{P.mine}</b>{mineList.length ? mineList.map((x) => (
          <div key={x.id} className={s.mini} role="button" tabIndex={0} aria-label={`${x.name}, ${P.species(x.species)}`} onClick={() => nav(`${root()}/${x.id}`)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') nav(`${root()}/${x.id}`) }}>
            {x.plush.ready && x.plush.key ? <img src={picUrl(x.plush.key)} alt="" draggable={false} /> : <span className={s.yarn} />}{x.name}</div>
        )) : <span>{P.shelfEmpty}</span>}</div>
      </div>
    </Frame>
  )
}

// ---- the toys
// Each picture of a toy is cropped to the part it changes (a whole mibi at 48 px tells nothing): the head for the ears, the tail for its tip, the back and flank for a pattern, the body for the Body toy. A crop is a window on the 304 x 312 plush, in
// fractions of it: left, top, width. Both ends of a slider use the same window, so "small" really is smaller.
const W_ = 304, H_ = 312
export const CROP: Record<string, [number, number, number]> = {
  'ears.kind': [0.16, 0.12, 0.58], 'ears.size': [0.16, 0.12, 0.58], 'tail.tip': [0.55, 0.42, 0.27], 'tail.length': [0.5, 0.36, 0.34], 'tail.curl': [0.5, 0.36, 0.34],
  'pattern.kind': [0.36, 0.4, 0.44], 'body.size': [0.14, 0.2, 0.7],
}
export function crop(key: string, box = 1): CSSProperties {
  const c = CROP[key]
  if (!c) return { backgroundSize: '122%', backgroundPosition: '46% 64%' }
  const [cx, cy, cw] = c
  const iw = 100 / cw, ih = iw * (H_ / W_)                              // the picture's width and height, as a share of the (square) window
  const px = cx * iw / (iw - 100) * 100, py = (cy * ih) / (ih - 100) * 100
  return { backgroundSize: `${iw}%`, backgroundPosition: `${Math.min(100, Math.max(0, px))}% ${Math.min(100, Math.max(0, py))}%`, ...(box ? {} : {}) }
}

function End({ p, label, at }: { p: Pic; label: string; at: string }) {
  return p.ready && p.key ? <span className={s.end} role="img" aria-label={label} style={{ backgroundImage: `url(${picUrl(p.key)})`, ...crop(at) }} /> : <span className={s.end} data-blank role="img" aria-label={label}><i className={s.yarn} /></span>
}

function Slider({ toy, axis, at, spring, onPick }: { toy: Toy; axis: Axis; at: number; spring: number; onPick: (i: number) => void }) {
  const steps = axis.steps ?? []
  const ok = steps.map((x, i) => (x.ok ? i : -1)).filter((i) => i >= 0)
  const first = steps[ok[0] ?? 0], last = steps[ok[ok.length - 1] ?? steps.length - 1]
  const track = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<number | null>(null)                       // the knob's own position while a finger is on it, as a fraction of the track
  const asked = useRef(at)
  const pct = (i: number) => (steps.length > 1 ? (i / (steps.length - 1)) * 100 : 0)
  const at_ = (e: React.PointerEvent) => { const r = track.current!.getBoundingClientRect(); return Math.min(1, Math.max(0, (e.clientX - r.left - 18) / (r.width - 36))) }
  const near = (f: number) => Math.round(f * (steps.length - 1))
  const send = (i: number) => { if (i !== asked.current) { asked.current = i; onPick(i) } }
  useEffect(() => { asked.current = at }, [at])
  const key = `${toy.id}.${axis.id}`
  return (
    <div className={s.slide} data-toy={key}>
      {first && <End p={first.end} at={`${toy.id}.${axis.id}`} label={P.toyEnd(toy.label, 'first')} />}
      <div ref={track} className={s.track} role="slider" tabIndex={0} aria-label={P.axis[`${toy.id}.${axis.id}`]?.sr ?? `${toy.label} ${axis.id}`} aria-valuemin={0} aria-valuemax={steps.length - 1} aria-valuenow={at}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); const f = at_(e); setDrag(f); send(near(f)) }}
        onPointerMove={(e) => { if (drag === null) return; const f = at_(e); setDrag(f); send(near(f)) }}
        onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}
        onKeyDown={(e) => { const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0; if (d) { e.preventDefault(); send(Math.min(steps.length - 1, Math.max(0, at + d))) } }}>
        {steps.map((x: Step) => <i key={x.i} data-trim={!x.ok || undefined} />)}
        <span key={spring} className={s.knob} data-drag={drag !== null || undefined} style={{ left: drag !== null ? `calc(18px + (100% - 36px) * ${drag})` : `calc(18px + (100% - 36px) * ${pct(at) / 100})` }} />
      </div>
      {last && <End p={last.end} at={`${toy.id}.${axis.id}`} label={P.toyEnd(toy.label, 'last')} />}
    </div>
  )
}

function Chips({ toy, axis, at, onPick }: { toy: Toy; axis: Axis; at: string; onPick: (o: string) => void }) {
  return (
    <div className={s.chips} role="radiogroup" aria-label={P.axis[`${toy.id}.${axis.id}`]?.sr ?? toy.label}>
      {(axis.options ?? []).map((o: Option) => (
        <button key={o.id} className={s.chip} role="radio" aria-checked={o.id === at} data-on={o.id === at || undefined} data-trim={!o.ok || undefined} onClick={() => onPick(o.id)}>
          <span className={`${s.pic} ${o.end.ready && o.end.key ? '' : s.blank}`} style={o.end.ready && o.end.key ? { backgroundImage: `url(${picUrl(o.end.key)})`, ...crop(`${toy.id}.${axis.id}`) } : undefined}>{!(o.end.ready && o.end.key) && <i className={s.yarn} />}</span>
          {o.word}
        </button>
      ))}
    </div>
  )
}

function Pots({ axis, at, onPick }: { axis: Axis; at: number; onPick: (i: number) => void }) {
  const steps = axis.steps ?? []
  const [col, setCol] = useState<Record<number, string>>({})
  const urls = useMemo(() => steps.map((x) => (x.end.ready && x.end.key ? picUrl(x.end.key) : null)), [steps])
  useEffect(() => { urls.forEach((u, i) => { if (u) void potColour(u).then((c) => { if (c) setCol((o) => ({ ...o, [i]: c })) }) }) }, [urls])
  return (
    <div className={s.pots} role="radiogroup" aria-label={P.axis["paint.hue"].sr}>
      {steps.map((x, i) => <button key={x.i} className={s.pot} role="radio" aria-checked={i === at} aria-label={P.pot(i + 1)} data-on={i === at || undefined} style={{ background: col[i] ?? `hsl(${x.value} 45% 58%)` }} onClick={() => onPick(i)} />)}
    </div>
  )
}

// The clay under the sculpting hands: solid warm clay with eyes that have a catch light.
function ClayFigure({ src, name, className }: { src: string; name: string; className: string }) {
  const [eyes, setEyes] = useState<string | null>(null)
  useEffect(() => { let dead = false; setEyes(null); void withEyes(src).then((u) => { if (!dead) setEyes(u) }); return () => { dead = true } }, [src])
  return <img src={eyes ?? src} alt={name} className={className} draggable={false} />
}

// ---- P2: shape
export function Shape() {
  const { species = '' } = useParams()
  const nav = useNavigate()
  const [q] = useSearchParams()
  const b = useBench(species)
  const [starter, setStarter] = useState<Starter | null>(null)
  useEffect(() => { void getStarters().then((l) => setStarter(l.find((x) => x.id === species) ?? null)).catch(() => undefined) }, [species])
  const [wag, setWag] = useState(0)
  const figure = useRef<HTMLDivElement>(null)
  const [under, setUnder] = useState<string | null>(null)                       // the picture that was on the stage before this one: it stays under the new one while that fades in, so the stage is never blank
  useEffect(() => { const t = window.setTimeout(() => setUnder(b.shown.kind === 'plush' ? b.shown.src : under), 360); return () => window.clearTimeout(t) }, [b.shown.src, b.shown.kind]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (b.squish) figure.current?.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.05, .93)', offset: 0.45 }, { transform: 'scale(1)' }], { duration: 100, easing: 'ease-out' }) }, [b.squish])
  useEffect(() => { if (wag) figure.current?.animate?.([{ transform: 'rotate(0)' }, { transform: 'rotate(-3deg)', offset: .2 }, { transform: 'rotate(3deg)', offset: .45 }, { transform: 'rotate(-2deg)', offset: .7 }, { transform: 'rotate(0)' }], { duration: 900, easing: 'ease-in-out' }) }, [wag])
  // "Surprise me": the toys of a starter picked at random, one paint pot at random.
  const did = useRef(false)
  useEffect(() => {
    if (did.current || !b.toys || !q.get('surprise')) return
    const paint = b.toys.toys.find((t) => t.id === 'paint')?.axes[0]
    if (paint?.steps) { did.current = true; const ok = paint.steps.filter((x) => x.ok); void b.move('paint', paint, ok[Math.floor(Math.random() * ok.length)].i) }
  }, [b, q])
  const name = starter?.name ?? b.toys?.name ?? species
  const sp = starter?.species ?? b.toys?.species
  const w = b.wait
  const sharp = b.shown.kind === 'plush' && !!b.sharp && b.sharp.genome === b.shown.genome
  const stageSrc = sharp ? b.sharp!.src : b.shown.src
  const say = b.say
  const bubble = (toy: string) => say && say.toy === toy ? (
    <div className={s.bubble} role="status" ref={(el) => el?.scrollIntoView?.({ block: 'nearest' })}>{b.shown.src && <img className={s.tiny} src={b.shown.src} alt="" />}<p>{say.text}</p></div>
  ) : null
  const toyView = (t: Toy) => (
    <section key={t.id} className={s.toy} aria-label={t.label}>
      <h2>{t.label}</h2>
      {t.axes.map((a) => {
        const key = `${t.id}.${a.id}`
        const at = b.pos[key] ?? a.home
        const lab = P.axis[key]?.on
        const one = (el: ReactNode) => (lab ? <div key={key}><h3 className={s.q}>{lab}</h3>{el}</div> : el)
        if (t.id === 'paint') return <Pots key={key} axis={a} at={at as number} onPick={(i) => void b.move(t.id, a, i)} />
        if (a.kind === 'choice') return <Chips key={key} toy={t} axis={a} at={at as string} onPick={(o) => void b.move(t.id, a, o)} />
        return one(<Slider key={key} toy={t} axis={a} at={at as number} spring={b.spring[key] ?? 0} onPick={(i) => void b.move(t.id, a, i)} />)
      })}
      {bubble(t.id)}
    </section>
  )
  return (
    <Frame>
      <div className={s.bar}>
        <button className={s.round} aria-label={P.back} onClick={() => nav(root())}><Chevron /></button>
        <div className={s.titles}><span className={s.name}>{name}</span>{sp && <span className={s.of}>{P.species(sp)}</span>}</div>
        <button className={s.round} aria-label={P.undo} disabled={!b.undo} onClick={() => void b.doUndo()}><Arrow /></button>
        <button className={s.go} onClick={() => nav(`${root()}/${species}/pods`)}>{P.go}</button>
      </div>
      {b.error ? <p className={s.err}>{P.noBench}</p> : (
        <div className={s.shape}>
          <div className={s.stage}>
            {w && (
              <div className={s.pill} role="status">
                <span className={s.yarn} style={{ width: 32, height: 32 }} />
                {w.phase === 'sculpt' ? P.sculpt : w.phase === 'fluff' ? P.fluff : P.busy}
                <span className={s.dots}><i data-on="done" /><i data-on={w.dots >= 2 ? 'done' : 'now'} /><i data-on={w.dots >= 3 ? 'done' : w.dots === 2 ? 'now' : undefined} /></span>
              </div>
            )}
            {say && !say.toy && <div className={s.says}><div className={s.bubble}><p>{say.text}</p></div></div>}
            <div className={s.holder}>
              <div className={s.cush} />
              <div className={s.figure} ref={figure}>
                {under && under !== b.shown.src && b.shown.kind === 'plush' && <img src={under} alt="" data-soft className={s.breathe} draggable={false} />}
                {b.shown.src && b.shown.kind === 'clay' && <ClayFigure key={b.shown.src} src={b.shown.src} name={name} className={[s.clay, s.fadein].join(' ')} />}
                {b.shown.src && b.shown.kind === 'plush' && <img key={stageSrc!} src={stageSrc!} alt={name} data-soft={!sharp || undefined} className={[s.breathe, b.puff === b.shown.src ? s.puff : s.fadein].join(' ')} draggable={false} />}
              </div>
            </div>
            <div className={s.tools}><button className={s.round} aria-label={P.wiggle} onClick={() => setWag((x) => x + 1)}><Note /></button></div>
          </div>
          <div className={s.tray}>{(b.toys?.toys ?? []).filter((t) => !t.hidden && t.screen !== 'pods').map(toyView)}</div>
        </div>
      )}
    </Frame>
  )
}

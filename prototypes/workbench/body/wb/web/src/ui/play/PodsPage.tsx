import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getPods, keepPod, picUrl, saveMove, type Dial, type FamilyRow, type Pod, type Pods, type Stage } from '../../lib/play'
import { P } from '../../lib/words'
import { Chevron, Frame, crop, root } from './PlayPage'
import s from './play.module.css'
import p from './pods.module.css'

// P3, pods (spec 2.2, 2.1 from 3:00). Six pods drop into the nest at once and wobble; each hatches as its plush is drawn. The Grow toy shows the babies at an age (a look that waits for an age shows only from it), How different? is the width
// of the pool the pods are drawn from, and the strip says how often each look runs in this family. Keep (the heart) names a pod and puts it in My mibis.
const STAGES: Stage[] = ['juvenile', 'adult', 'elder']
const DIALS: Dial[] = ['alike', 'some', 'wild']
const Play = () => <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z" /></svg>
const Heart = ({ on }: { on: boolean }) => <svg viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" aria-hidden="true"><path d="M12 20.5C5 15.4 3 12.2 3 9a4.7 4.7 0 0 1 9-1.9A4.7 4.7 0 0 1 21 9c0 3.200-2 6.400-9 11.500z" /></svg>
const EggMark = () => <svg viewBox="0 0 24 28" aria-hidden="true"><path d="M12 2C6.500 2 3 9.500 3 16c0 5.500 4 9.500 9 9.500s9-4 9-9.500C21 9.500 17.500 2 12 2z" fill="#fff8e8" stroke="#814398" strokeWidth="2" /><ellipse cx="9" cy="12" rx="2" ry="3.500" fill="#fff" opacity=".7" /><circle cx="14.500" cy="18" r="1.600" fill="#a468b8" /></svg>
const Egg = () => (
  <svg className={p.egg} viewBox="0 0 120 150" aria-hidden="true">
    <defs><clipPath id="eggc"><path d="M60 8C28 8 8 62 8 96c0 30 24 46 52 46s52-16 52-46C112 62 92 8 60 8z" /></clipPath></defs>
    <path d="M60 8C28 8 8 62 8 96c0 30 24 46 52 46s52-16 52-46C112 62 92 8 60 8z" fill="#8b5fc9" />
    <g clipPath="url(#eggc)">{[34, 54, 74, 94, 114, 134].map((y, i) => <rect key={y} x="0" y={y} width="120" height="10" fill={i % 2 ? '#7a4fb8' : '#9a72d6'} />)}<ellipse cx="86" cy="100" rx="30" ry="50" fill="#5f3a96" opacity=".35" /></g>
  </svg>
)

// The pods of one make: asked for again every 2 s while any is still being drawn (the server answers from the cache, so a picture that has landed shows at once).
function usePods(id: string) {
  const [q] = useSearchParams()
  const [data, setData] = useState<Pods | null>(null)
  const [round, setRound] = useState(() => Math.max(0, Number(q.get('round')) || 0))
  const [dial, setDial] = useState<Dial | undefined>(undefined)
  const [grow, setGrow] = useState<Stage | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    const n = ++seq.current
    let timer = 0
    const tick = async () => {
      try {
        const r = await getPods(id, round, dial, grow)
        if (!alive.current || seq.current !== n) return
        setData(r)
        if (r.pods.some((x) => !x.ready) || r.grow_ends.some((x) => !x.ready) || r.family.some((x) => !x.pic.ready)) timer = window.setTimeout(() => void tick(), 1500)
      } catch (e) { if (alive.current && seq.current === n) setError(String((e as Error).message ?? e)) }
    }
    void tick()
    return () => { window.clearTimeout(timer) }
  }, [id, round, dial, grow])
  const set = useCallback((toy: 'diff' | 'grow', axis: string, to: string) => { void saveMove(id, toy, axis, to).catch(() => undefined) }, [id])
  return {
    data, error, round,
    again: () => { setData((d) => (d ? { ...d, pods: d.pods.map((x) => ({ ...x, ready: false, key: null })) } : d)); setRound((r) => r + 1) },
    setDial: (d: Dial) => { set('diff', 'width', d); setData((x) => (x ? { ...x, diff: d, pods: x.pods.map((q) => ({ ...q, ready: false, key: null })) } : x)); setDial(d) },
    setGrow: (g: Stage) => { set('grow', 'age', g); setData((x) => (x ? { ...x, grow: g } : x)); setGrow(g) },
  }
}

function Card({ pod, name, on, kept, onPick, onKeep }: { pod: Pod; name: string; on: boolean; kept: boolean; onPick: () => void; onKeep: () => void }) {
  const [walk, setWalk] = useState(0)
  const hatched = pod.ready && !!pod.key
  return (
    <div className={p.card} data-on={on || undefined} data-hatched={hatched || undefined} role="group" aria-label={P.pod(pod.i + 1)} onClick={onPick}>
      <div className={p.fig}>
        {hatched ? <img key={pod.key} src={picUrl(pod.key!)} alt={name} className={[p.baby, p.hatch, walk ? p.toddle : ''].join(' ')} data-walk={walk || undefined} draggable={false} onAnimationEnd={(e) => { if (e.animationName.includes('toddle')) setWalk(0) }} />
          : <div className={p.nestling}><Egg /><span className={p.wob}>{P.wobble}</span></div>}
      </div>
      <div className={p.btns}>
        <button className={s.round} aria-label={P.walk} disabled={!hatched} onClick={(e) => { e.stopPropagation(); setWalk((w) => w + 1) }}><Play /></button>
        <button className={s.round} data-kept={kept || undefined} aria-label={P.keep} aria-pressed={kept} disabled={!hatched || kept} onClick={(e) => { e.stopPropagation(); onKeep() }}><Heart on={kept} /></button>
      </div>
    </div>
  )
}

function GrowToy({ at, ends, onPick }: { at: Stage; ends: Pods['grow_ends']; onPick: (g: Stage) => void }) {
  const i = STAGES.indexOf(at)
  const track = useRef<HTMLDivElement>(null)
  const near = (e: React.PointerEvent) => { const r = track.current!.getBoundingClientRect(); return STAGES[Math.round(Math.min(1, Math.max(0, (e.clientX - r.left - 18) / (r.width - 36))) * 2)] }
  const [drag, setDrag] = useState(false)
  const end = (st: Stage) => ends.find((x) => x.stage === st)
  const E = (st: Stage) => { const e = end(st); return <Disc cls={s.end} url={e?.ready && e.key ? picUrl(e.key) : null} label={P.growSteps[st]} small={22} /> }
  return (
    <section className={s.toy} aria-label={P.grow}>
      <h2>{P.grow}</h2>
      <div className={s.slide}>
        {E('juvenile')}
        <div ref={track} className={s.track} role="slider" tabIndex={0} aria-label={P.growSr} aria-valuemin={0} aria-valuemax={2} aria-valuenow={i} aria-valuetext={P.growSteps[at]}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDrag(true); const g = near(e); if (g !== at) onPick(g) }}
          onPointerMove={(e) => { if (!drag) return; const g = near(e); if (g !== at) onPick(g) }} onPointerUp={() => setDrag(false)} onPointerCancel={() => setDrag(false)}
          onKeyDown={(e) => { const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0; if (d) { e.preventDefault(); onPick(STAGES[Math.min(2, Math.max(0, i + d))]) } }}>
          {STAGES.map((g) => <i key={g} />)}
          <span className={s.knob} data-drag={drag || undefined} style={{ left: `calc(18px + (100% - 36px) * ${i / 2})` }} />
        </div>
        {E('elder')}
      </div>
      <div className={p.steps} aria-hidden="true">{STAGES.map((g) => <span key={g} data-on={g === at || undefined}>{P.growSteps[g]}</span>)}</div>
    </section>
  )
}

// A picture that has been asked for is not a picture that has arrived: until the file has loaded the disc shows the yarn ball, never an empty cream disc.
function useLoaded(url: string | null) {
  const [got, setGot] = useState<string | null>(null)
  useEffect(() => {
    if (!url) return
    let live = true
    const im = new Image()
    im.onload = () => { if (live) setGot(url) }
    im.onerror = () => { if (live) setGot(null) }
    im.src = url
    return () => { live = false }
  }, [url])
  return !!url && got === url
}

function Disc({ cls, url, crop: c, label, small }: { cls: string; url: string | null; crop?: React.CSSProperties; label: string; small: number }) {
  const ok = useLoaded(url)
  return ok ? <span className={cls} style={{ backgroundImage: `url(${url})`, ...c }} role="img" aria-label={label} />
    : <span className={cls} data-blank role="img" aria-label={label}><i className={s.yarn} style={{ width: small, height: small }} /></span>
}

// A row's picture is a crop of the part its look is on: the tail, the head, the back and flank.
const cropOf = (r: FamilyRow) => (r.locus.includes('tail') ? 'tail.tip' : r.locus.includes('pattern') ? 'pattern.kind' : 'ears.kind')

function Family({ rows }: { rows: FamilyRow[] }) {
  return (
    <section className={s.toy} aria-label={P.family}>
      <h2>{P.family}</h2>
      <ul className={p.rows}>
        {rows.map((r) => (
          <li key={r.id}>
            <Disc cls={p.look} url={r.pic.ready && r.pic.key ? picUrl(r.pic.key) : null} crop={crop(cropOf(r))} label={r.label} small={18} />
            <span className={p.lab}>{r.label}</span><b>{P.how[r.how]}</b>
          </li>
        ))}
      </ul>
    </section>
  )
}

// After the heart: the namer's three offers and a dice, and one button that keeps the mibi under the name picked. Typing is a parent's setting and is not here.
function NameSheet({ names, onKeep, onClose }: { names: string[]; onKeep: (n: string) => void; onClose: () => void }) {
  const [page, setPage] = useState(0)
  const three = [0, 1, 2].map((k) => names[(page * 3 + k) % names.length])
  const [pick, setPick] = useState(three[0])
  useEffect(() => { setPick(three[0]) }, [page]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={p.veil} onClick={onClose}>
      <div className={p.sheet} role="dialog" aria-label={P.nameTitle} onClick={(e) => e.stopPropagation()}>
        <h2>{P.nameTitle}</h2>
        <div className={p.picks} role="radiogroup" aria-label={P.nameTitle}>
          {three.map((n) => <button key={n} role="radio" aria-checked={n === pick} data-on={n === pick || undefined} className={p.name} onClick={() => setPick(n)}>{n}</button>)}
          <button className={s.round} aria-label={P.dice} onClick={() => setPage((x) => x + 1)}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="#f1ebdf" stroke="currentColor" strokeWidth="2" />{[[8, 8], [16, 8], [12, 12], [8, 16], [16, 16]].map(([x, y]) => <circle key={x + '-' + y} cx={x} cy={y} r="1.6" fill="#814398" />)}</svg></button>
        </div>
        <button className={p.keepgo} onClick={() => onKeep(pick)}>{P.nameKeep(pick)}</button>
      </div>
    </div>
  )
}

export function PodsPage() {
  const { species = '' } = useParams()
  const nav = useNavigate()
  const b = usePods(species)
  const [sel, setSel] = useState(0)
  const [naming, setNaming] = useState<Pod | null>(null)
  const [kept, setKept] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<string | null>(null)
  const d = b.data
  const keepKey = (x: Pod) => `${d?.round}.${x.i}.${x.tries}.${d?.diff}`
  const keep = async (name: string) => {
    if (!d || !naming) return
    const pod = naming
    setNaming(null)
    try {
      const k = await keepPod(species, { round: d.round, i: pod.i, tries: pod.tries, diff: d.diff, grow: d.grow, name })
      setKept((o) => ({ ...o, [keepKey(pod)]: k.id }))
      setToast(P.kept(k.name))
      window.setTimeout(() => setToast(null), 4000)
    } catch { setToast(P.fail); window.setTimeout(() => setToast(null), 4000) }
  }
  return (
    <Frame>
      <div className={s.bar}>
        <button className={s.round} aria-label={P.back} onClick={() => nav(`${root()}/${species}`)}><Chevron /></button>
        <div className={s.titles}><span className={s.name}>{P.podsTitle(d?.name ?? '')}</span>{d && <span className={s.of}>{P.species(d.species)}</span>}</div>
        <button className={s.go} onClick={b.again}><span className={p.eggmark}><EggMark /></span>{P.again}</button>
      </div>
      {b.error ? <p className={s.err}>{P.noBench}</p> : (
        <div className={p.body}>
          <div className={p.nest} role="group" aria-label={P.nest}>
            <div className={p.felt} />
            <div className={p.grid}>
              {(d?.pods ?? []).map((x, k) => <Card key={`${d?.round}.${x.i}.${x.tries}`} pod={x} name={d?.name ?? ''} on={sel === k} kept={!!kept[keepKey(x)]} onPick={() => setSel(k)} onKeep={() => setNaming(x)} />)}
            </div>
          </div>
          <div className={p.side}>
            {d && <GrowToy at={d.grow} ends={d.grow_ends} onPick={b.setGrow} />}
            {d && (
              <section className={s.toy} aria-label={P.diff}>
                <h2>{P.diff}</h2>
                <div className={p.seg} role="radiogroup" aria-label={P.diff}>
                  {DIALS.map((x) => <button key={x} role="radio" aria-checked={d.diff === x} data-on={d.diff === x || undefined} onClick={() => b.setDial(x)}>{P.diffSteps[x]}</button>)}
                </div>
              </section>
            )}
            {d && <Family rows={d.family} />}
          </div>
        </div>
      )}
      {toast && <div className={p.toast} role="status">{toast}</div>}
      {naming && d && <NameSheet names={d.names} onKeep={(n) => void keep(n)} onClose={() => setNaming(null)} />}
    </Frame>
  )
}

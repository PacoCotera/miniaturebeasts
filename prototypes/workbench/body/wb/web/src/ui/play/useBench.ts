import { P } from '../../lib/words'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getBig, getJob, getLook, getSpecies, getToys, picUrl, saveMove, stepOf, undoMove, sentenceFor, type Axis, type PlayToys, type Saved } from '../../lib/play'

// The bench of one mibi (spec 2.5, waiting honestly). The page shows one picture at a time and keeps the last good one until a better one is ready:
//   0 to 0.1 s   the toy clicks and the picture squishes;
//   already drawn  the plush at once (the step's `now` picture, or the answer's);
//   about 3 s    the clay of the new shape crossfades in under the yarn;
//   about 10 s   the plush fluffs in;   over 15 s  "Busy bench, yours is next." and the last good picture stays.
// Every move takes a number; a picture or a sentence that belongs to an older move is dropped, so the latest move wins.
export type Shown = { src: string | null; kind: 'plush' | 'clay'; genome?: string | null }
export type Sharp = { genome: string; src: string }          // the stage's own picture, twice the size: it takes the place of the 304 one when it is drawn
export type Wait = null | { phase: 'sculpt' | 'fluff' | 'busy'; dots: 1 | 2 | 3 }
export type Say = { toy: string; text: string; n: number } | null

const BUSY_MS = 15000

export function useBench(id: string) {
  const [toys, setToys] = useState<PlayToys | null>(null)
  const [shown, setShown] = useState<Shown>({ src: null, kind: 'plush' })
  const [sharp, setSharp] = useState<Sharp | null>(null)
  const [puff, setPuff] = useState<string | null>(null)                      // the plush that arrived after a wait: it fluffs in
  const [squish, setSquish] = useState(0)
  const [wait, setWait] = useState<Wait>(null)
  const [say, setSay] = useState<Say>(null)
  const [pos, setPos] = useState<Record<string, number | string>>({})        // where each toy's knob stands while a move is on its way (key: toy.axis)
  const [spring, setSpring] = useState<Record<string, number>>({})           // a refused toy: counts up so the knob's bounce replays
  const [undo, setUndo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)
  const good = useRef<Shown>({ src: null, kind: 'plush' })                    // the last plush that was on the stage
  const alive = useRef(true)
  const saving = useRef<Promise<unknown>>(Promise.resolve())               // the saves go to the server one after another, in the order the toys moved
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  const refresh = useCallback(async () => {
    const t = await getToys(id)
    if (alive.current) setToys(t)
    return t
  }, [id])

  const showPlush = useCallback((key: string, puffed: boolean, genome?: string | null) => {
    const s: Shown = { src: picUrl(key), kind: 'plush', genome: genome ?? null }
    good.current = s
    setShown(s)
    setPuff(puffed ? s.src : null)
  }, [])

  // Follow the jobs of one look until the plush is in: clay first, then plush. `n` is the move they belong to.
  const follow = useCallback(async (n: number, clay: string | null, plush: string | null, genome?: string | null) => {
    const t0 = Date.now()
    setWait({ phase: 'sculpt', dots: 1 })
    let clayDone = !clay
    const mine = () => alive.current && seq.current === n
    const busyTimer = setInterval(() => { if (mine() && Date.now() - t0 > BUSY_MS) setWait((w) => (w ? { phase: 'busy', dots: w.dots } : w)) }, 500)
    try {
      while (mine()) {
        if (!clayDone && clay) {
          const c = await getJob(clay, 1)
          if (!mine()) return
          if (c.state === 'done') {
            clayDone = true
            const k = c.result?.views?.[0]?.key
            if (k) { setShown({ src: picUrl(k), kind: 'clay' }); setWait({ phase: 'fluff', dots: 2 }) }
          } else if (c.state === 'failed' || c.state === 'superseded') clayDone = true
        }
        if (plush) {
          const p = await getJob(plush, clayDone ? 2 : 0)
          if (!mine()) return
          if (p.state === 'done') {
            const k = p.result?.views?.[0]?.key
            if (k) showPlush(k, true, genome)
            setWait(null)
            return
          }
          if (p.state === 'failed') { setWait(null); setSay({ toy: '', text: P.fail, n }); return }
          if (p.state === 'superseded') return
        } else if (clayDone) { setWait(null); return }
        await new Promise((r) => setTimeout(r, 250))
      }
    } finally { clearInterval(busyTimer) }
  }, [showPlush])

  // The mibi as it stands: its plush now, or the wait for it.
  const look = useCallback(async (n: number, genome?: string) => {
    const l = await getLook(id, genome)
    if (!alive.current || seq.current !== n) return
    if (l.ready && l.key) { setWait(null); showPlush(l.key, false, l.genome) } else await follow(n, l.clay_job, l.job, l.genome)
  }, [id, showPlush])

  useEffect(() => {
    const n = ++seq.current
    setToys(null); setShown({ src: null, kind: 'plush' }); setWait(null); setSay(null); setPos({})
    getToys(id).then(async (t) => { if (!alive.current || seq.current !== n) return; setToys(t); await look(n, undefined) }).catch((e) => { if (alive.current) setError(String(e.message ?? e)) })
    getSpecies(id).then((s) => { if (alive.current) setUndo(!!s.undo?.undo) }).catch(() => undefined)
  }, [id, look])

  // The stage's sharp picture: once a 304 plush has stood on the stage for a moment, the same mibi is asked for at twice the size (behind every move and every pod) and takes its place.
  useEffect(() => {
    const g = shown.genome
    if (!g || shown.kind !== 'plush') return
    let dead = false
    const t = window.setTimeout(async () => {
      try {
        const r = await getBig(id, g)
        if (dead) return
        if (r.ready && r.key) { setSharp({ genome: g, src: picUrl(r.key) }); return }
        while (!dead && r.job) {
          const j = await getJob(r.job, 3)
          if (j.state === 'done') { const k = j.result?.views?.[0]?.key; if (k && !dead) setSharp({ genome: g, src: picUrl(k) }); return }
          if (j.state === 'failed' || j.state === 'superseded') return
        }
      } catch { /* the 304 picture stays */ }
    }, 600)
    return () => { dead = true; window.clearTimeout(t) }
  }, [shown.genome, shown.kind, id])

  const sayIt = useCallback((n: number, toy: string, text: string) => { setSay({ toy, text, n }); window.setTimeout(() => { if (alive.current) setSay((s) => (s && s.n === n ? null : s)) }, 7000) }, [])
  const springBack = useCallback((key: string, back: number | string) => { setPos((p) => ({ ...p, [key]: back })); setSpring((s) => ({ ...s, [key]: (s[key] ?? 0) + 1 })); window.setTimeout(() => { if (alive.current) setPos((p) => { const q = { ...p }; delete q[key]; return q }) }, 600) }, [])

  // One move of one toy: to a step (a slider) or a chip.
  const move = useCallback(async (toy: string, axis: Axis, to: number | string) => {
    if (!toys) return
    const n = ++seq.current
    const key = `${toy}.${axis.id}`
    const before = pos[key] ?? (axis.kind === 'range' ? (axis.home as number) : (axis.home as string))
    setSquish((q) => q + 1)
    setSay(null)
    setPos((p) => ({ ...p, [key]: to }))
    const st = stepOf(axis, to)
    if (!st) return
    if (!st.ok) {                                              // a step the sweep trimmed: the toy stretches and bounces back, and the mibi says why
      window.setTimeout(() => { if (!alive.current) return; springBack(key, axis.kind === 'range' ? (axis.home as number) : (axis.home as string)); sayIt(n, toy, sentenceFor(toys, toy, st.why)) }, 120)
      return
    }
    const prevShown = good.current
    if (st.now.ready && st.now.key) showPlush(st.now.key, false, st.now.genome)         // drawn already: the answer is on the stage before the save is back
    setWait(st.now.ready ? null : { phase: 'sculpt', dots: 1 })
    let r: Awaited<ReturnType<typeof saveMove>>
    try { const run = saving.current.then(() => saveMove(id, toy, axis.id, to)); saving.current = run.catch(() => undefined); r = await run } catch (e) {
      if (!alive.current || seq.current !== n) return
      springBack(key, before); setShown(prevShown); setWait(null); sayIt(n, toy, toys.hold)
      setError(null)
      return
    }
    if (!alive.current) return
    if (!r.ok) {                                              // refused: the toy springs back to where it was, and the mibi says why
      springBack(key, r.back_to ?? before)
      if (seq.current === n) { setShown(prevShown); setWait(null) }
      sayIt(n, toy, r.sentence)
      void refresh()
      return
    }
    const s = r as Saved
    setUndo(s.undo)
    void refresh().then(() => { if (alive.current) setPos((p) => { const q = { ...p }; delete q[key]; return q }) })
    if (seq.current !== n) return                             // a later move is on: it shows its own picture
    if (s.plush.ready && s.plush.key) { setWait(null); showPlush(s.plush.key, false, s.genome) } else await follow(n, s.clay_job, s.plush.job, s.genome)
  }, [toys, pos, id, follow, refresh, showPlush, sayIt, springBack])

  const doUndo = useCallback(async () => {
    const n = ++seq.current
    setSay(null)
    try {
      const u = await undoMove(id)
      setUndo(u.undo)
      setPos({})
      await refresh()
      setSquish((q) => q + 1)
      await look(n, undefined)
    } catch { sayIt(n, '', toys?.hold ?? '') }
  }, [id, refresh, look, sayIt, toys])

  return { toys, shown, sharp, puff, squish, wait, say, pos, spring, undo, error, move, doUndo }
}

import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { casUrl, getToken, type Species } from '../lib/api'
import { lit, litCount, lookOf, previousKey, ready, runSheet, varietyOne, type VInd, type Variety } from '../lib/variety'
import type { StudioUrl } from '../lib/url'
import s from './VarietyStage.module.css'

// Variety mode's stage (studio-ui 4.3): the sheet's tiles, filtered by the look picked in the navigator (the others dim), a red edge and dot on a tile that breaks a rule, the sizes the game uses on hover.
// "Previous run" puts the run before beside each tile, so what an edit did to the whole sheet reads at a glance.
// The tiles are clay renders of `seed:N` genomes; they are made by a `variety` job and cached, so a second sheet of the same file is instant.
function Pic({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  const [bad, setBad] = useState(false)
  useEffect(() => setBad(false), [src])
  return src && !bad ? <img className={className} src={src} alt={alt} draggable={false} onError={() => setBad(true)} /> : <span className={s.none} role="img" aria-label={`${alt}: no picture`} />
}

function Tile({ ind, on, picked, prev, onPick }: { ind: VInd; on: boolean; picked: boolean; prev: string | null | undefined; onPick: () => void }) {
  const t = ind.tiles
  const bad = ind.fails.length > 0
  return (
    <button className={s.tile} data-lit={on || undefined} data-sel={picked || undefined} data-bad={bad || undefined} data-ready={t['304'].ready || undefined} onClick={onPick} aria-pressed={picked}
      aria-label={`No. ${ind.n}${bad ? `, ${ind.fails.map((f) => f.words).join('; ')}` : ''}`}>
      <span className={s.plate}>
        <Pic className={s.img} src={t['304'].ready ? casUrl(t['304'].key) : null} alt={`No. ${ind.n}`} />
        <i className={s.n}>{ind.n}</i>
        {bad && <i className={s.dot} />}
      </span>
      {prev !== undefined && <span className={`${s.plate} ${s.prev}`}><Pic className={s.img} src={prev ? casUrl(prev) : null} alt={`No. ${ind.n}, the run before`} /></span>}
      <span className={s.sizes} aria-hidden="true">
        {(['96', '48'] as const).map((z) => <span key={z} className={s.size}>{t[z].ready ? <img src={casUrl(t[z].key)} alt="" draggable={false} width={Number(z)} style={{ imageRendering: 'pixelated' }} /> : null}<em>{z}</em></span>)}
      </span>
    </button>
  )
}

export const runClock = (t: string) => { const d = new Date(t.length <= 19 ? t + 'Z' : t); return Number.isNaN(d.getTime()) ? t : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }

export function VarietyStage({ url, species, go, inset = 0 }: { url: StudioUrl; species: Species | undefined; go: (p: Partial<StudioUrl>) => void; inset?: number }) {
  const q = useQuery({ ...varietyOne(url.species, species?.hash ?? '', url.seed), enabled: !!species })
  const v: Variety | undefined = q.data
  const asked = useRef(new Set<string>())
  // A sheet whose tiles are not all in the cache is made as soon as the mode opens (the page may write); the done events refetch the keys.
  useEffect(() => {
    if (!v || v.ran || !getToken() || asked.current.has(v.key)) return
    asked.current.add(v.key)
    void runSheet(url.species, url.seed)
  }, [v, url.species, url.seed])
  if (!species || !v) return <main className={s.stage}>{q.isError && <p className={s.note}>{(q.error as Error).message}</p>}</main>
  const look = lookOf(v, url.sel)
  const cmp = url.cmp && !!v.previous
  const shown = litCount(v, look)
  return (
    <main className={s.stage} style={inset ? { paddingBottom: inset + 8 } : undefined}>
      <div className={s.filter}>
        {look ? <span className={s.chip}>{look.label}<button onClick={() => go({ sel: null })} aria-label="Show every look">×</button></span> : null}
        <span className={s.count}>{look ? `${shown} of ${v.n}` : `${ready(v)} of ${v.n} drawn`}</span>
        <span className={s.grow} />
        {v.previous && <button className={s.toggle} aria-pressed={cmp} onClick={() => go({ cmp: !url.cmp })} title={`Seed ${v.previous.seed}, ${runClock(v.previous.t)}`}>Previous run</button>}
      </div>
      {cmp && v.previous && <p className={s.note}>Left, this run (seed {v.seed}). Right, the run before: seed {v.previous.seed}, {runClock(v.previous.t)}.</p>}
      <div className={s.grid} data-cmp={cmp || undefined}>
        {v.individuals.map((i) => <Tile key={i.n} ind={i} on={lit(look, i.n)} picked={url.ind === i.n} prev={cmp ? previousKey(v, i.n) : undefined} onPick={() => go({ ind: url.ind === i.n ? null : i.n })} />)}
      </div>
    </main>
  )
}

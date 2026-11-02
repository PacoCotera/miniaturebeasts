import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Species } from '../lib/api'
import { checkMetas, dotted, failLine, fmtVal, lastMover, needsYou, ORDER, partsOf, type CheckMeta, type CheckRow } from '../lib/checks'
import { clock } from '../lib/edits'
import { useJobs } from '../lib/events'
import { useUI } from '../lib/store'
import type { StudioUrl } from '../lib/url'
import { endLine, endMeasure, failingEnds, locusById, runTime } from '../lib/genes'
import s from './ChecksDrawer.module.css'

// The Checks drawer: the full table grouped by state, over the navigator and the stage. It opens on "Needs you" (fails and warnings: the same number as the pill); "All" shows every row.
// Selecting a row puts its proof on the stage and shows the owner's words, the play sentence and who last moved each driving field. "Waive" is for the lead and the AD and is not on a maker's page.
export function ChecksDrawer({ species, url, go }: { species: Species; url: StudioUrl; go: (p: Partial<StudioUrl>, replace?: boolean) => void }) {
  const [tab, setTab] = useState<'needs' | 'all'>('needs')
  const { drawerH, setDrawerH } = useUI()
  const metas = useQuery(checkMetas()).data ?? []
  const byId: Record<string, CheckMeta> = Object.fromEntries(metas.map((m) => [m.id, m]))
  const jobs = useJobs(url.species)
  const checks = species.checks
  const rows = checks?.rows ?? []
  const need = needsYou(rows)
  const badEnds = failingEnds(species.extremes)
  const g = species.file.genome
  const shown = (tab === 'needs' ? need : rows).slice().sort((a, b) => ORDER[a.state] - ORDER[b.state])
  const sel = rows.find((r) => r.id === url.proof) ?? shown[0]
  const measuring = jobs.some((j) => j.kind === 'check')
  const quiet = [`${rows.filter((r) => r.state === 'pass').length} pass`, measuring && 'measuring', checks && !checks.fresh && `${rows.length} stale`].filter(Boolean).join(' · ')
  const drag = (e: React.PointerEvent) => {
    const y0 = e.clientY, h0 = drawerH
    const mv = (ev: PointerEvent) => setDrawerH(h0 + (y0 - ev.clientY))
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', mv)
    window.addEventListener('pointerup', up)
  }
  const m = sel ? byId[sel.id] : undefined
  return (
    <section className={s.drawer} style={{ height: drawerH }} aria-label="Checks">
      <span className={s.grip} onPointerDown={drag} role="separator" aria-orientation="horizontal" aria-label="Resize the drawer" />
      <div className={s.head}>
        <b>Checks</b>
        <span className={s.seg} role="tablist">
          <button role="tab" aria-selected={tab === 'needs'} className={tab === 'needs' ? s.on : ''} onClick={() => setTab('needs')}>Needs you <span className="num">{need.length + badEnds.length}</span></button>
          <button role="tab" aria-selected={tab === 'all'} className={tab === 'all' ? s.on : ''} onClick={() => setTab('all')}>All <span className="num">{rows.length}</span></button>
        </span>
        <span className={s.quiet}>{quiet}</span>
        <button className={s.close} onClick={() => go({ drawer: null })} aria-label="Close the checks">✕</button>
      </div>
      <div className={s.body}>
        <div className={s.tablewrap}>
          {badEnds.length > 0 && (
            <div className={s.ends} aria-label="Failing ends from the last extremes run">
              <p><b>From the last extremes run, {runTime(species.extremes?.at)}</b>{species.extremes && !species.extremes.fresh ? ' (the file has changed since)' : ''}</p>
              <ul>{badEnds.map((e) => { const l = locusById(g, e.locus); return <li key={e.id}><i className={s.dot} data-kind="fail" data-stale={!species.extremes?.fresh || undefined} /> {l ? endLine(l, e) : e.label} <span className="num">{endMeasure(e)}</span></li> })}</ul>
            </div>
          )}
          {rows.length === 0 && badEnds.length === 0 ? <p className={s.empty}>{measuring ? 'Measuring…' : 'Not measured yet.'}</p> : shown.length === 0 ? <p className={s.empty}>Nothing needs you. “All” shows every check.</p> : (
            <table className={s.table}>
              <thead><tr><th style={{ width: 28 }} /><th>Check</th><th className={s.r}>Value</th><th className={s.r}>Limit</th><th>Stage</th><th className={s.r}>Measured</th></tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className={r.id === sel?.id ? s.sel : ''} onClick={() => go({ proof: r.id }, true)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') go({ proof: r.id }, true) }}>
                    <td><i className={s.dot} data-kind={r.state} data-stale={!checks?.fresh || undefined} /></td>
                    <td>{byId[r.id]?.name ?? r.id}</td>
                    <td className={`${s.r} num`}>{fmtVal(r.value)}</td>
                    <td className={`${s.r} num`}>{fmtVal(r.limit)}</td>
                    <td>{r.stage}</td>
                    <td className={s.r}>{checks?.fresh ? 'just now' : 'older file'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {sel && m && <Detail row={sel} meta={m} species={species} go={go} />}
      </div>
    </section>
  )
}

function Detail({ row, meta, species, go }: { row: CheckRow; meta: CheckMeta; species: Species; go: (p: Partial<StudioUrl>, replace?: boolean) => void }) {
  const part = partsOf(row, meta)[0] ?? null
  return (
    <div className={s.detail}>
      <div className={s.dhead}><b>{meta.name}</b>{part && <button onClick={() => go({ sel: part, drawer: null, proof: row.id })}>Go to field</button>}</div>
      {row.state !== 'pass' && <span className={s.fail}>{failLine(row, meta)}</span>}
      <span className={s.measure}>{row.measure}</span>
      <q>{meta.rule.words}</q>
      <span className={s.src}>Owner rule · {meta.rule.date} · {meta.limit.text}</span>
      {meta.play && <span className={s.play}>In play: “{meta.play}”</span>}
      {meta.fields.length > 0 && (
        <div className={s.flds}>
          {meta.fields.map((f) => { const e = lastMover(species.history, f, species.file); return (<span key={f} className={s.frow}><code>{dotted(f)}</code><span>{e ? `${e.actor}, ${clock(e.t)}` : 'plan default'}</span></span>) })}
        </div>
      )}
    </div>
  )
}

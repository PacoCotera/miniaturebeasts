import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { checkEnds, getToken, patchSpecies, type Species } from '../lib/api'
import { bandOf, binIndex, copyRule, endLine, endMeasure, endsOf, fixPointer, proofEnd, modifierLine, selectedLocus, unitOf, unitText, wakeLine } from '../lib/genes'
import type { StudioUrl } from '../lib/url'
import { lookName, shortWord } from '../lib/variety'
import { RangeBar } from './RangeBar'
import { ExpressionRules, GenomeString, HowOften, ModifierBox } from './Expressions'
import s from './GenesInspector.module.css'

// The gene's inspector (studio-ui 4.3): the range bar, the limits and the type, the looks, how the copies show (locked on a shared trait), then a card for each end that fails with the fix it computed.
// Chapter 9 adds how often each look shows, the looks with rules (age, needs), a live "Add a modifier" and the genome string.
export function GenesInspector({ species, url, go }: { species: Species; url: StudioUrl; go: (p: Partial<StudioUrl>) => void }) {
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const g = species.file.genome
  const l = selectedLocus(g, url.sel)
  if (!g || !l) return <p className={s.empty}>This file has no genome block.</p>
  const ext = species.extremes
  const ends = endsOf(ext, l.locus)
  const bad = ends.filter((e) => e.state === 'fail')
  const blend = l.op === 'blend'
  const shown = proofEnd(ext, l.locus, url.proof)
  const band = bandOf(l)
  const lw = species.file.variety?.look_words
  const sleep = wakeLine(g, l)
  const chapter = g.chapters.find((c) => c.id === l.chapter)?.name
  const setLimit = async (e: (typeof bad)[number]) => {
    const ptr = e.fix && fixPointer(g, e.fix)
    if (!ptr || !e.fix) return
    setBusy(true)
    try {
      await patchSpecies(species.id, [{ op: 'test', path: ptr, value: (e.end === 'high' ? band!.hi : band!.lo) }, { op: 'replace', path: ptr, value: e.fix.value }])
      await qc.invalidateQueries({ queryKey: ['species', species.id] })
    } finally { setBusy(false) }
  }
  const measure = async () => { setBusy(true); try { await checkEnds(species.id) } finally { setBusy(false) } }
  return (
    <>
      <div className={s.title}><b>{l.label}</b><span className={s.kind}>{blend ? 'blend' : l.op} · {l.kind === 'heritable-doing' ? 'doing' : 'look'}</span></div>
      <p className={s.where}>{chapter}{l.scope === 'branch' ? ` · ${l.borrowed ? `borrowed from ${l.borrowed}` : 'clan trait'}` : ''}</p>
      {blend && <RangeBar locus={l} failing={bad.filter((e) => e.end === 'low' || e.end === 'high').map((e) => e.end as 'low' | 'high')} />}
      {blend ? (
        <>
          <div className={s.field}><label>Limits</label><span className={s.v}>{unitText(band!.lo, '')} – {unitText(band!.hi, unitOf(l))}</span></div>
          <div className={s.field}><label>Type</label><span className={s.v}>{unitText(l.type as number, unitOf(l))}</span></div>
          {l.bins && <div className={s.field}><label>Looks</label><span className={s.seg}>{l.bins.map((b, i) => <span key={b} className={i === binIndex(l, l.type as number) ? s.on : ''}>{b[0].toUpperCase() + b.slice(1)}</span>)}</span></div>}
        </>
      ) : (
        <>
          <div className={s.field}><label>Type</label><span className={s.v}>{String(l.type)}</span></div>
          <div className={s.field}><label>Looks</label><span className={s.seg}>{(l.limits as string[]).map((b) => <span key={b} className={b === l.type ? s.on : ''}>{lookName(lw, l.locus, b)}</span>)}</span></div>
          {l.op === 'pair-map' && l.order && <div className={s.field}><label>Shows</label><span className={s.v}>{`${copyRule(l)} · ${l.order.map((o) => shortWord(lw, l.locus, o)).join(' over ')}`}</span></div>}
        </>
      )}
      {sleep && (
        <div className={s.lock} data-asleep={sleep.asleep || undefined}>
          <div className={s.field}><label>Sleep</label><span className={s.v}>{sleep.head}</span></div>
          <p className={s.help}>{sleep.line}</p>
        </div>
      )}
      {l.modifier && <div className={s.lock}><div className={s.field}><label>Changes</label><span className={s.v}>{modifierLine(g, l)}</span></div><p className={s.help}>A modifier is a gene of this species. A cross that carries it behaves like this species.</p></div>}
      <HowOften species={species} l={l} />
      <ExpressionRules species={species} l={l} />
      <div className={s.lock}>
        <div className={s.field}><label>Copies</label><span className={s.v}>{copyRule(l)}</span></div>
        <p className={s.help}>{l.modifier ? 'Inherited like any gene.' : 'Shared trait: the catalogue sets how it shows.'}</p>
        {!l.modifier && <ModifierBox species={species} l={l} />}
      </div>
      {!ext?.ends || !ext.fresh ? (
        <div className={s.measure}>
          <p className={s.help}>{ext?.running ? 'Building both ends…' : ext?.ends ? 'Measured on an older file.' : 'The ends have not been built yet.'}</p>
          <button className={s.act} onClick={measure} disabled={busy || ext?.running || !getToken()}>Check both ends</button>
        </div>
      ) : null}
      {bad.length > 0 && (
        <div className={s.cards}>
          {bad.map((e) => (
            <div key={e.id} className={s.card} data-stale={!ext?.fresh || undefined}>
              <div className={s.head}><i className={s.dot} /><b>{endLine(l, e)}</b></div>
              <p className={s.measureLine}>{endMeasure(e)}</p>
              <div className={s.acts}>
                {e.fix && <button onClick={() => setLimit(e)} disabled={busy || !getToken() || !ext?.fresh}>Set limit to {unitText(e.fix.value, '')}</button>}
                {e.proof && <button onClick={() => go({ proof: shown?.id === e.id ? 'none' : e.id })} disabled={!e.proof.ready} aria-pressed={shown?.id === e.id}>{!e.proof.ready ? 'Making the proof…' : shown?.id === e.id ? 'Hide proof' : 'Show proof'}</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      <GenomeString species={species} ind={url.ind} />
    </>
  )
}

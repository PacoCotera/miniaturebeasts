import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getToken, postJob, type Species } from '../lib/api'
import { checkMetas, failLine, needsYou } from '../lib/checks'
import { canJudge, current, day, gateOne, isOpen, meOne, pickSheet, shortHash, turn, useGateActions, useGateError, type Round } from '../lib/gate'
import type { StudioUrl } from '../lib/url'
import { W } from '../lib/words'
import s from './GateInspector.module.css'

// Gate mode's inspector (studio-ui 4.3): the round and its file, the sheet's one judgement (a tick for reviewers; a maker sees none), the sign order, the card for a failing check, export.
// A maker's page has no tick, no note field and no sign button at all; the server refuses them anyway.
function Step({ n, label, who, sign, state, note }: { n: number; label: string; who: string | null; sign: Round['reviewer']; state: 'now' | 'done' | 'wait'; note: string }) {
  return (
    <div className={s.step} data-state={state}>
      <span className={s.n}>{state === 'done' ? '✓' : n}</span>
      <span>{label}{who ? ` · ${who}` : ''}</span>
      <span className={s.after}>{sign ? W.gate.signedBy(sign.name, day(sign.at)) : note}</span>
    </div>
  )
}

export function GateInspector({ species, url, go }: { species: Species; url: StudioUrl; go: (p: Partial<StudioUrl>) => void }) {
  const q = useQuery({ ...gateOne(url.species) })
  const me = useQuery({ ...meOne() }).data
  const metas = useQuery(checkMetas()).data ?? []
  const act = useGateActions(url.species)
  const err = useGateError(url.species)
  const g = q.data
  const r = current(g)
  const [note, setNote] = useState('')
  useEffect(() => setNote(r?.note ?? ''), [r?.round, r?.note])
  if (!g) return <p className={s.help}>{q.isError ? (q.error as Error).message : '…'}</p>
  if (!r) return <><div className={s.title}><b>{species.file.name || url.species}</b></div>{err && <p className={s.err} role="alert">{err}</p>}</>
  const sh = pickSheet(r, url.sel)
  const open = isOpen(r)
  const judge = canJudge(me)
  const t = turn(r)
  const fails = needsYou((species.checks?.rows ?? []).filter((x) => x.state === 'fail'))
  const you = (role: 'reviewer' | 'owner') => (me?.role === role && judge ? W.gate.you : null)
  const exportJob = (mode: 'review' | 'release') => void postJob(url.species, 'export', { mode }).catch((e: Error) => act.fail(e.message))
  return (
    <>
      <div className={s.title}><b>{W.gate.round(r.round)}</b><span className={s.kind}>{W.gate.file} {shortHash(r.file_hash)}</span></div>
      {r.state.voided && <p className={s.void} role="status"><i />{W.gate.voided}</p>}
      {r.verdict === 'back' && <p className={s.void} role="status"><i />{W.gate.sentBack}</p>}
      {judge && open && !r.reviewer && sh && (
        <div className={s.judge}>
          <label><input type="checkbox" checked={sh.tick} onChange={(e) => void act.tick(r.round, sh.id, e.target.checked)} /><span>{sh.label}</span></label>
          <textarea placeholder={W.gate.note} value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== r.note && void act.note(r.round, note)} aria-label={W.gate.note} />
        </div>
      )}
      {!judge && r.note && <p className={s.line}>{r.note}</p>}
      <h6 className={s.h}>{W.gate.order}</h6>
      <div className={s.steps}>
        <Step n={1} label={W.gate.reviewer} who={r.reviewer ? null : you('reviewer')} sign={r.state.reviewer_valid ? r.reviewer : null} state={r.state.reviewer_valid ? 'done' : t === 'reviewer' ? 'now' : 'wait'} note={W.gate.ticked(r.state.ticked, r.sheets.length)} />
        <Step n={2} label={W.gate.owner} who={you('owner')} sign={r.state.owner_valid ? r.owner : null} state={r.state.owner_valid ? 'done' : t === 'owner' ? 'now' : 'wait'} note={me?.role === 'reviewer' && judge && !r.state.owner_valid ? W.gate.afterYou : ''} />
      </div>
      {judge && open && fails.length > 0 && (
        <div className={s.card}>
          <div className={s.head}><i /><b>{fails.length === 1 ? W.gate.oneFails : W.gate.manyFail(fails.length)}</b></div>
          <p>{failLine(fails[0], metas.find((m) => m.id === fails[0].id))}. {W.gate.signAnyway}</p>
          <div className={s.acts}><button onClick={() => void act.back(r.round, note)}>{W.gate.sendBack}</button><button onClick={() => go({ drawer: 'checks' })}>{W.gate.seeIt}</button></div>
        </div>
      )}
      {err && <p className={s.err} role="alert">{err}</p>}
      <h6 className={s.h}>{W.gate.export}</h6>
      <div className={s.field}><label>{W.gate.forReview}</label><span className={s.v}><button className={s.link} onClick={() => exportJob('review')} disabled={!getToken()}>{W.gate.export}</button></span></div>
      <div className={s.field}><label>{W.gate.releaseRow}</label><span className={s.v}>{g.signed ? <button className={s.link} onClick={() => exportJob('release')} disabled={!getToken()}>{W.gate.export}</button> : <span className={s.quiet}>{W.gate.afterBoth}</span>}</span></div>
    </>
  )
}

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getToken, historyOne, type Entry, type Species } from '../lib/api'
import { clock, fieldLabel, fieldValue, initials } from '../lib/edits'
import { useUI } from '../lib/store'
import { useRevert } from '../lib/undo'
import type { StudioUrl } from '../lib/url'
import { W } from '../lib/words'
import s from './ChecksDrawer.module.css'
import d from './Drawers.module.css'

type Go = (p: Partial<StudioUrl>, replace?: boolean) => void

// The three drawers share a frame: the grip, the three names to switch between (Checks, History, File (JSON)) and a close button.
export const DRAWERS = [['checks', W.drawer.checks], ['history', W.drawer.history], ['section', W.drawer.section], ['file', W.drawer.file]] as const
export function DrawerTabs({ url, go }: { url: StudioUrl; go: Go }) {
  return (
    <span className={d.tabs} role="tablist" aria-label="Drawer">
      {DRAWERS.map(([id, name]) => <button key={id} role="tab" aria-selected={url.drawer === id} className={url.drawer === id ? d.on : ''} onClick={() => go({ drawer: id, proof: null })}>{name}</button>)}
    </span>
  )
}
export function DrawerFrame({ url, go, label, quiet, children, extra }: { url: StudioUrl; go: Go; label: string; quiet?: string; extra?: React.ReactNode; children: React.ReactNode }) {
  const { drawerH, setDrawerH } = useUI()
  const drag = (e: React.PointerEvent) => {
    const y0 = e.clientY, h0 = drawerH
    const mv = (ev: PointerEvent) => setDrawerH(h0 + (y0 - ev.clientY))
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', mv)
    window.addEventListener('pointerup', up)
  }
  return (
    <section className={s.drawer} style={{ height: drawerH }} aria-label={label}>
      <span className={s.grip} onPointerDown={drag} role="separator" aria-orientation="horizontal" aria-label="Resize the drawer" />
      <div className={s.head}>
        <DrawerTabs url={url} go={go} />
        {quiet && <span className={s.quiet}>{quiet}</span>}
        {extra}
        <button className={s.close} onClick={() => go({ drawer: null })} aria-label={`Close ${label}`}>✕</button>
      </div>
      <div className={d.body}>{children}</div>
    </section>
  )
}

// History: the undo log with who made each entry, newest first. An undo or a redo is an entry of its own, so the edit and the undo that took it back are both there.
export function HistoryDrawer({ species, url, go }: { species: Species; url: StudioUrl; go: Go }) {
  const q = useQuery(historyOne(url.species, species.hash))
  const rev = useRevert(url.species)
  const entries = useMemo(() => (q.data?.entries ?? species.history).slice().reverse(), [q.data, species.history])
  const can = q.data ?? species.undo ?? { undo: false, redo: false }
  const editable = !!getToken()
  return (
    <DrawerFrame url={url} go={go} label="History" quiet={entries.length ? `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}` : undefined} extra={
      <span className={d.acts}>
        <button className={d.act} disabled={!editable || !can.undo} onClick={() => void rev.run('undo')}>{W.undo}</button>
        <button className={d.act} disabled={!editable || !can.redo} onClick={() => void rev.run('redo')}>{W.redo}</button>
      </span>
    }>
      {rev.error && <p className={d.err} role="alert">{rev.error}</p>}
      {entries.length === 0 ? <p className={s.empty}>Nothing edited yet.</p> : (
        <ol className={d.list}>
          {entries.map((e, i) => <Row key={`${e.t}|${e.path}|${e.hash_after}|${i}`} e={e} species={species} />)}
        </ol>
      )}
    </DrawerFrame>
  )
}
function Row({ e, species }: { e: Entry; species: Species }) {
  return (
    <li className={d.row} data-via={e.via}>
      <span className={d.time + ' num'}>{clock(e.t)}</span>
      <span className={d.avatar} data-agent={e.agent || undefined}>{initials(e.actor)}</span>
      <span className={d.what}><b>{e.actor}</b> {e.via === 'undo' ? 'undid' : e.via === 'redo' ? 'redid' : 'set'} {fieldLabel(e.path, species.labels, species.file)} <span className="num">{fieldValue(e.path, e.old, species.file)} → {fieldValue(e.path, e.new, species.file)}</span></span>
    </li>
  )
}

// File (JSON): the file as it is on disk, read-only. Edits go through the inspector, the CLI or a text editor.
export function FileDrawer({ species, url, go }: { species: Species; url: StudioUrl; go: Go }) {
  const lines = useMemo(() => JSON.stringify(species.file, null, 1).split('\n'), [species.file])
  return (
    <DrawerFrame url={url} go={go} label="File" quiet={`${lines.length.toLocaleString('en-GB')} ${lines.length === 1 ? 'line' : 'lines'} · Read only`}>
      <div className={d.file} tabIndex={0} aria-label="The species file as JSON, read-only">
        <pre className={d.nums} aria-hidden="true">{lines.map((_, i) => i + 1).join('\n')}</pre>
        <pre className={d.code}>{lines.join('\n')}</pre>
      </div>
    </DrawerFrame>
  )
}

// Section table: the loft's rows (height, then the back, side and front radius), worked out from the profile knobs. Read-only: a knob is moved on the stage or in the inspector and the table follows.
type Row3 = [number, [number, number, number]]
export function SectionDrawer({ species, url, go }: { species: Species; url: StudioUrl; go: Go }) {
  const rows = ((species.file as { spine?: { loft?: { section?: { stations?: Row3[] } } } }).spine?.loft?.section?.stations ?? []).slice().reverse()
  return (
    <DrawerFrame url={url} go={go} label="Section table" quiet={`${W.section.rows(rows.length)} · ${W.section.note}`}>
      {rows.length === 0 ? <p className={s.empty}>This file has no section table.</p> : (
        <table className={d.sect} aria-label="Section table, read-only">
          <thead><tr>{W.section.cols.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
          <tbody>{rows.map(([z, r]) => <tr key={z}><th scope="row" className="num">{z.toFixed(3)}</th>{r.map((x, i) => <td key={i} className="num">{x.toFixed(4)}</td>)}</tr>)}</tbody>
        </table>
      )}
    </DrawerFrame>
  )
}

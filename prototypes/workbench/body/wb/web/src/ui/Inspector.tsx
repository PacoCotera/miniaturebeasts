import type { Species } from '../lib/api'
import { clock, leaseFrom } from '../lib/edits'
import { Banner } from './Banner'
import s from './Inspector.module.css'

// Shows only the selection. With nothing selected: the species overview (st.insp.empty). The version ("v5 draft") is not in the file yet, so it is left out.
export function Inspector({ species, id, sheet, open }: { species: Species | undefined; id: string; sheet: boolean; open: boolean }) {
  const lease = species ? leaseFrom(species.lease, species.history) : null
  const last = species?.history[species.history.length - 1]
  const name = species?.file.name ?? `${id} · no name yet`
  const line = [species?.file.body_plan, last && `last edit ${clock(last.t)} by ${last.actor}`].filter(Boolean).join(' · ')
  return (
    <aside className={`${s.insp} ${sheet ? s.sheet : ''}`} data-open={open || undefined} aria-label="Inspector">
      {lease && <Banner who={lease.holder} />}
      <div className={s.title}><b>{name}</b></div>
      {line && <p className={s.line}>{line}</p>}
    </aside>
  )
}

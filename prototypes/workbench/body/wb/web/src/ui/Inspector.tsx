import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getToken, type Species } from '../lib/api'
import { formsOne, getAt } from '../lib/forms'
import { Field } from './Field'
import { checkMetas, needsYou, partsOf, ORDER } from '../lib/checks'
import { clock, leaseFrom } from '../lib/edits'
import { partLabel } from '../lib/outline'
import type { StudioUrl } from '../lib/url'
import * as Popover from '@radix-ui/react-popover'
import { useUI } from '../lib/store'
import { W } from '../lib/words'
import { PlayPanel } from './PlayPanel'
import { AttentionCard } from './AttentionCard'
import { Banner } from './Banner'
import s from './Inspector.module.css'

// Shows only the selection. With nothing selected: the species overview (st.insp.empty). The version ("v5 draft") is not in the file yet, so it is left out.
// Under it, one card for each check the selection touches (all that need you when nothing is selected), then a quiet count of the passes (st.card.passes).
export function Inspector({ species, id, sheet, open, url, go, genes }: { species: Species | undefined; id: string; sheet: boolean; open: boolean; url: StudioUrl; go: (p: Partial<StudioUrl>) => void; genes?: ReactNode }) {
  const lease = species ? leaseFrom(species.lease, species.history) : null
  const last = species?.history[species.history.length - 1]
  const name = species?.file.name ?? `${id} · no name yet`
  const line = [species?.file.body_plan, last && `last edit ${clock(last.t)} by ${last.actor}`].filter(Boolean).join(' · ')
  const metas = useQuery(checkMetas()).data ?? []
  const byId = Object.fromEntries(metas.map((m) => [m.id, m]))
  const rows = species?.checks?.rows ?? []
  const forms = useQuery({ ...formsOne(id), enabled: !!species && !genes }).data
  const part = url.sel ? forms?.parts[url.sel] : undefined
  const row = url.sel ? forms?.outline.find((r) => r.id === url.sel) : undefined
  const selLabel = part?.label ?? row?.label ?? partLabel(url.sel)
  const selKind = row ? (row.kind === 'range' ? 'spine range' : row.kind === 'part' ? 'appendage' : null) : ['head', 'neck', 'back', 'seat', 'tail'].includes(url.sel ?? '') ? 'spine range' : 'appendage'
  const editable = !!getToken() && !lease
  const asPlayer = useUI((u) => u.player)
  const setPlayer = useUI((u) => u.setPlayer)
  const toy = part?.play ?? null
  const showToy = asPlayer && !!toy
  const touching = url.sel ? rows.filter((r) => partsOf(r, byId[r.id]).includes(url.sel!)) : rows
  const cards = needsYou(touching).sort((a, b) => ORDER[a.state] - ORDER[b.state])
  const passes = touching.filter((r) => r.state === 'pass').length
  return (
    <aside className={`${s.insp} ${sheet ? s.sheet : ''}`} data-open={open || undefined} aria-label="Inspector">
      {lease && <Banner who={lease.holder} />}
      {genes ?? <>
      <div className={s.title}><b>{url.sel ? selLabel : name}</b>{url.sel && selKind && <span className={s.kind}>{selKind}</span>}
        {url.sel && species && (
          <Popover.Root>
            <Popover.Trigger className={s.more} aria-label="More">⋯</Popover.Trigger>
            <Popover.Portal><Popover.Content className={s.menu} align="end" sideOffset={4}>
              <button role="menuitemcheckbox" aria-checked={showToy} className={s.mi} disabled={!toy} onClick={() => setPlayer(!asPlayer)}><i className={s.tick} data-on={showToy || undefined} />{W.asPlayer}</button>
            </Popover.Content></Popover.Portal>
          </Popover.Root>
        )}</div>
      {!url.sel && line && <p className={s.line}>{line}</p>}
      {species && showToy && toy && <PlayPanel toy={toy} species={species} />}
      {species && part && !showToy && part.fields.some((d) => getAt(species.file, d.ptr) !== undefined) && (
        <div className={s.fields}>{part.fields.filter((d) => getAt(species.file, d.ptr) !== undefined).map((d) => <Field key={d.id} species={species} id={id} desc={d} editable={editable} rows={rows} metas={byId} />)}</div>
      )}
      {cards.length > 0 && (
        <div className={s.cards}>
          {cards.map((r) => (
            <AttentionCard key={r.id} row={r} meta={byId[r.id]} proofShown={url.proof === r.id} onProof={() => go({ proof: url.proof === r.id ? null : r.id })} onWhy={() => go({ drawer: 'checks', proof: r.id })} />
          ))}
        </div>
      )}
      {url.sel && passes > 0 && <p className={s.passes}><i />{passes} other {selLabel?.toLowerCase()} {passes === 1 ? 'check passes' : 'checks pass'}</p>}
      </>}
    </aside>
  )
}

import { Link } from 'react-router-dom'
import * as Popover from '@radix-ui/react-popover'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { speciesList, type Species } from '../lib/api'
import { useFrames } from '../lib/frames'
import { buildStudioUrl, type StudioUrl } from '../lib/url'
import { W } from '../lib/words'
import { ModeSwitch } from './ModeSwitch'
import { JobIndicator } from './JobIndicator'
import { LeaseAvatar } from './LeaseAvatar'
import { AttentionPill } from './AttentionPill'
import { failingEnds } from '../lib/genes'
import { useUI } from '../lib/store'
import { usePortraitSheet } from '../lib/useStudio'
import { nextSeed, runSheet, varietyOne } from '../lib/variety'
import { getToken } from '../lib/api'
import { goldenJob, goldensOne } from '../lib/goldens'
import s from './TopBar.module.css'

export function TopBar({ url, species, go }: { url: StudioUrl; species: Species | undefined; go: (p: Partial<StudioUrl>) => void }) {
  const list = useQuery(speciesList())
  const thumb = useFrames(species, 'clay')[32]?.src
  const name = species?.file.name ?? `${url.species} · no name yet`
  const sheet = usePortraitSheet()
  const toggleInsp = useUI((u) => u.toggleInsp)
  const qc = useQueryClient()
  // Variety's one primary action: a new sheet draws the next seed, so every tile is new.
  const newSheet = async () => {
    const cur = qc.getQueryData<import('../lib/variety').Variety>(varietyOne(url.species, species?.hash ?? '', url.seed).queryKey)
    const seed = nextSeed(cur, url.seed)
    go({ seed, ind: null, cmp: false })
    await runSheet(url.species, seed)
  }
  // Goldens' one primary action: remake the goldens (a draft); for a changed release golden it becomes the ask for a look-change round (the gate arrives in a later chunk, so it waits).
  const gold = useQuery({ ...goldensOne(url.species, species?.hash ?? ''), enabled: !!species && url.mode === 'goldens' }).data
  const ask = !!gold?.release && (gold?.totals.changed ?? 0) > 0
  const makeGoldens = async () => { await goldenJob(url.species, 'make') }
  return (
    <header className={s.top}>
      <Popover.Root>
        <Popover.Trigger className={s.species}>
          {thumb && <img src={thumb} alt="" />}
          <span className={s.name}>{name}</span>
          <span className={s.sub}>{url.species}</span>
          <span className={s.caret} />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className={s.menu} align="start" sideOffset={6}>
            {(list.data ?? []).map((r) => (
              <Popover.Close asChild key={r.id}>
                <Link to={buildStudioUrl({ ...url, species: r.id, sel: null })} className={s.menuRow}>
                  <span>{r.name ?? `${r.id} · no name yet`}</span><span className={s.sub}>{r.id}</span>
                </Link>
              </Popover.Close>
            ))}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <ModeSwitch url={url} />
      <div className={s.right}>
        <JobIndicator species={url.species} />
        <AttentionPill rows={species?.checks?.rows ?? (species?.extremes?.ends ? [] : null)} ends={failingEnds(species?.extremes).length} onOpen={() => go({ drawer: 'checks' })} />
        <LeaseAvatar species={species} />
        {sheet && <button className={s.iconbtn} onClick={toggleInsp} aria-label="Inspector"><span className={s.panelIcon} /></button>}
        <button className={s.quiet} disabled>{W.play}</button>
        {url.mode === 'goldens' && (ask ? <button className={s.primary} disabled>{W.gold.ask}</button> : <button className={s.primary} onClick={makeGoldens} disabled={!getToken() || !species}>{W.gold.make}</button>)}
        {url.mode === 'variety' && <button className={s.primary} onClick={newSheet} disabled={!getToken() || !species}>{W.newSheet}</button>}
      </div>
    </header>
  )
}

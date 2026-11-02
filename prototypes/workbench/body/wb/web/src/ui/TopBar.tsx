import { Link } from 'react-router-dom'
import * as Popover from '@radix-ui/react-popover'
import { useQuery } from '@tanstack/react-query'
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
import s from './TopBar.module.css'

export function TopBar({ url, species, go }: { url: StudioUrl; species: Species | undefined; go: (p: Partial<StudioUrl>) => void }) {
  const list = useQuery(speciesList())
  const thumb = useFrames(species, 'clay')[32]?.src
  const name = species?.file.name ?? `${url.species} · no name yet`
  const sheet = usePortraitSheet()
  const toggleInsp = useUI((u) => u.toggleInsp)
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
      </div>
    </header>
  )
}

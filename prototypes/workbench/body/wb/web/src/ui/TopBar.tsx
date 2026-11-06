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
import { getToken, postJob } from '../lib/api'
import { goldenJob, goldensOne } from '../lib/goldens'
import { allTicked, canJudge, current, gateOne, isEarlier, meOne, shown, turn, useGateActions, isOpen } from '../lib/gate'
import s from './TopBar.module.css'

export function TopBar({ url, species, go }: { url: StudioUrl; species: Species | undefined; go: (p: Partial<StudioUrl>) => void }) {
  const list = useQuery(speciesList())
  const thumb = useFrames(species, 'clay')[32]?.src
  const name = species?.file.name || `${url.species} · no name yet`
  const sheet = usePortraitSheet()
  const toggleInsp = useUI((u) => u.toggleInsp)
  const setNew = useUI((u) => u.setNew)
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
  // Gate's one primary: the maker asks for review; the reviewer signs round n (lit when every sheet is ticked); the owner signs and releases. A role with no action has no button, not a grey one.
  const gq = useQuery({ ...gateOne(url.species), enabled: !!species && url.mode === 'gate' }).data
  const me = useQuery({ ...meOne(), enabled: url.mode === 'gate' }).data
  const act = useGateActions(url.species)
  const round = current(gq)
  const looking = isEarlier(gq, shown(gq, url.rd))                                   // an earlier round is looked at, never acted on: no primary button
  const t = turn(round)
  const judge = canJudge(me)
  const signAndRelease = async () => { if (round && (await act.sign(round.round))) await postJob(url.species, 'export', { mode: 'release' }).catch((e: Error) => act.fail(e.message)) }
  return (
    <header className={s.top}>
      <Popover.Root>
        <Popover.Trigger className={s.species}>
          {thumb && <img src={thumb} alt="" />}
          <span className={s.name}>{name}</span>
          {species?.file.name && <span className={s.sub}>{url.species}</span>}
          <span className={s.caret} />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className={s.menu} align="start" sideOffset={6}>
            {(list.data ?? []).map((r) => (
              <Popover.Close asChild key={r.id}>
                <Link to={buildStudioUrl({ ...url, species: r.id, sel: null })} className={s.menuRow}>
                  <span>{r.name || `${r.id} · no name yet`}</span>{r.name && <span className={s.sub}>{r.id}</span>}
                </Link>
              </Popover.Close>
            ))}
            <Popover.Close asChild><button className={s.menuRow} onClick={() => setNew(true)}><span>{W.owedNew.title}</span></button></Popover.Close>
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
        {url.mode === 'gate' && species && !!getToken() && !looking && (!isOpen(round) && !judge
          ? <button className={s.primary} onClick={() => void act.ask()} disabled={act.busy}>{W.gate.ask}</button>
          : round && judge && t === 'reviewer' && me?.role === 'reviewer' ? <button className={s.primary} onClick={() => void act.sign(round.round)} disabled={act.busy || !allTicked(round)}>{W.gate.sign(round.round)}</button>
          : round && judge && t === 'owner' && me?.role === 'owner' ? <button className={s.primary} onClick={() => void signAndRelease()} disabled={act.busy}>{W.gate.release}</button> : null)}
        {url.mode === 'variety' && <button className={s.primary} onClick={newSheet} disabled={!getToken() || !species}>{W.newSheet}</button>}
      </div>
    </header>
  )
}

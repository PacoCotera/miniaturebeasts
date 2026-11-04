import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { speciesList } from '../lib/api'
import { checkMetas } from '../lib/checks'
import { MODES, buildStudioUrl, type StudioUrl } from '../lib/url'
import { useUI } from '../lib/store'
import { W } from '../lib/words'
import { useRevert } from '../lib/undo'
import s from './Palette.module.css'

// The command palette (Ctrl K or /): parts, genes, outputs, checks and actions arrive with their chunks. For now: the modes and the species.
export function Palette({ url }: { url: StudioUrl }) {
  const { paletteOpen, setPalette } = useUI()
  const navigate = useNavigate()
  const list = useQuery(speciesList())
  const metas = useQuery(checkMetas()).data ?? []
  const rev = useRevert(url.species)
  const run = (to: string) => { setPalette(false); navigate(to) }
  return (
    <Command.Dialog open={paletteOpen} onOpenChange={setPalette} label="Palette" overlayClassName={s.scrim} contentClassName={s.palette}>
      <Dialog.Title className="sr">Palette</Dialog.Title>
      <Command.Input className={s.input} autoFocus />
      <Command.List className={s.list}>
        <Command.Group heading="Checks">
          <Command.Item value="Checks drawer" onSelect={() => run(buildStudioUrl({ ...url, drawer: 'checks' }))} className={s.item}>Checks<span className={s.k}><kbd>C</kbd></span></Command.Item>
          {metas.map((m) => (<Command.Item key={m.id} value={`check ${m.name}`} onSelect={() => run(buildStudioUrl({ ...url, drawer: 'checks', proof: m.id }))} className={s.item}>{m.name}<span className={s.k}>{m.stage}</span></Command.Item>))}
        </Command.Group>
        <Command.Group heading={W.help.do}>
          <Command.Item value="History" onSelect={() => run(buildStudioUrl({ ...url, drawer: 'history' }))} className={s.item}>{W.drawer.history}<span className={s.k}><kbd>H</kbd></span></Command.Item>
          <Command.Item value="File JSON" onSelect={() => run(buildStudioUrl({ ...url, drawer: 'file' }))} className={s.item}>{W.drawer.file}<span className={s.k}><kbd>J</kbd></span></Command.Item>
          <Command.Item value="Undo" onSelect={() => { setPalette(false); void rev.run('undo') }} className={s.item}>{W.undo}<span className={s.k}><kbd>Z</kbd></span></Command.Item>
          <Command.Item value="Redo" onSelect={() => { setPalette(false); void rev.run('redo') }} className={s.item}>{W.redo}<span className={s.k}><kbd>Shift Z</kbd></span></Command.Item>
        </Command.Group>
        <Command.Group heading={W.help.go}>
          {MODES.map((m, i) => (
            <Command.Item key={m} value={W.modes[i]} onSelect={() => run(buildStudioUrl({ ...url, mode: m }))} className={s.item}>{W.modes[i]}<span className={s.k}><kbd>{i + 1}</kbd></span></Command.Item>
          ))}
          {(list.data ?? []).map((r) => (
            <Command.Item key={r.id} value={`${r.name ?? ''} ${r.id}`} onSelect={() => run(buildStudioUrl({ ...url, species: r.id, sel: null }))} className={s.item}>{r.name ?? `${r.id} · no name yet`}<span className={s.k}>{r.id}</span></Command.Item>
          ))}
        </Command.Group>
      </Command.List>
      <div className={s.foot}>
        <span><kbd>↑</kbd> <kbd>↓</kbd> {W.help.choose}</span><span><kbd>↵</kbd> {W.help.run}</span><span className={s.every}><kbd>?</kbd> {W.help.everyKey}</span>
      </div>
    </Command.Dialog>
  )
}

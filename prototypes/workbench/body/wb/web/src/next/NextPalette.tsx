import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from '@/components/ui/command'
import { speciesList } from '../lib/api'
import { MODES, type StudioUrl } from '../lib/url'
import { useUI } from '../lib/store'
import { W } from '../lib/words'
import { nextUrl } from './url'

// The palette (Ctrl K or /) on shadcn's Command. For now: the modes and the species; parts, genes, checks and actions arrive with their chunks.
export function NextPalette({ url }: { url: StudioUrl }) {
  const open = useUI((u) => u.paletteOpen)
  const setOpen = useUI((u) => u.setPalette)
  const navigate = useNavigate()
  const list = useQuery(speciesList())
  const run = (to: string) => { setOpen(false); navigate(to) }
  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Palette" description="Go to a mode or a species" className="top-[18%] translate-y-0 sm:max-w-xl">
      <CommandInput placeholder="Find a mode or a species" className="text-base" />
      <CommandList className="max-h-[360px]">
        <CommandEmpty>Nothing found</CommandEmpty>
        <CommandGroup heading={W.help.go} className="[&_[cmdk-group-heading]]:text-sm">
          {MODES.map((m, i) => (
            <CommandItem key={m} value={`mode ${W.modes[i]}`} onSelect={() => run(nextUrl({ ...url, mode: m }))} className="h-11 text-base">
              {W.modes[i]}
              <CommandShortcut className="text-sm">{i + 1}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Species" className="[&_[cmdk-group-heading]]:text-sm">
          {(list.data ?? []).map((r) => (
            <CommandItem key={r.id} value={`species ${r.name ?? ''} ${r.id}`} onSelect={() => run(nextUrl({ ...url, species: r.id, sel: null }))} className="h-11 text-base">
              {r.name ?? `${r.id} · no name yet`}
              <CommandShortcut className="text-sm">{r.id}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
      <div className="flex items-center gap-4 border-t px-3 py-2 text-sm text-faint">
        <span>↑ ↓ {W.help.choose}</span><span>↵ {W.help.run}</span><span>Esc close</span>
      </div>
    </CommandDialog>
  )
}

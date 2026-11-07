import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Moon, Search, Sun } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Kbd } from '@/components/ui/kbd'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { speciesList } from '../lib/api'
import { meOne } from '../lib/gate'
import { useUI } from '../lib/store'
import { MODES } from '../lib/url'
import { useRail, useStudioUrl } from '../lib/useStudio'
import { W } from '../lib/words'
import { NextPalette } from './NextPalette'
import { nextUrl } from './url'
import './next.css'

// The ?ui=next shell, layout A (three panes): the parts on the left, the live creature in the middle, the selection's fields on the right.
// This chunk draws the empty workspace; the panes fill in with R3 (fields), R5 (viewport) and R7 (Shape).
export default function NextShell() {
  const [url] = useStudioUrl()
  const navigate = useNavigate()
  const rail = useRail()
  const theme = useUI((u) => u.theme)
  const toggleTheme = useUI((u) => u.toggleTheme)
  const setPalette = useUI((u) => u.setPalette)
  const list = useQuery(speciesList())
  const me = useQuery(meOne()).data
  const row = list.data?.find((r) => r.id === url.species)
  const name = row?.name ?? url.species

  // The new kit's variables apply under html.next; dark is the default.
  useEffect(() => {
    const el = document.documentElement
    el.classList.add('next')
    el.classList.toggle('dark', theme === 'dark')
    return () => { el.classList.remove('next', 'dark') }
  }, [theme])

  // Ctrl K or / opens the palette.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const typing = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(true) }
      else if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey) { e.preventDefault(); setPalette(true) }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [setPalette])

  const initials = (me?.name ?? '').split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '·'

  return (
    <div className="flex h-full flex-col bg-background font-sans text-foreground">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 px-2" aria-label="Species">
              <span className="flex flex-col items-start leading-tight">
                <span className="text-[15px] font-semibold">{name}</span>
                <span className="text-sm font-normal text-faint">{url.species}</span>
              </span>
              <ChevronDown className="size-4 text-faint" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-56">
            {(list.data ?? []).map((r) => (
              <DropdownMenuItem key={r.id} className="h-10 text-[15px]" onSelect={() => navigate(nextUrl({ ...url, species: r.id, sel: null }))}>
                {r.name ?? `${r.id} · no name yet`}<span className="ml-auto text-sm text-faint">{r.id}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Separator orientation="vertical" className="h-6" />
        <Tabs value={url.mode} onValueChange={(m) => navigate(nextUrl({ ...url, mode: m as typeof url.mode }))}>
          <TabsList className="h-10 bg-secondary/70" aria-label="Mode">
            {MODES.map((m, i) => (
              <TabsTrigger key={m} value={m} className="px-3.5 text-[15px]">{W.modes[i]}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-2 text-[15px] text-muted-foreground" onClick={() => setPalette(true)} aria-label="Find">
            <Search className="size-4" />Find<Kbd className="ml-2 h-6 text-sm">Ctrl K</Kbd>
          </Button>
          <Button variant="ghost" size="icon" className="size-9" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Use the light theme' : 'Use the dark theme'}>
            {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </Button>
          <Avatar className="size-8" title={me?.name ?? undefined}><AvatarFallback className="bg-accent text-sm">{initials}</AvatarFallback></Avatar>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className={cn('flex shrink-0 flex-col border-r bg-background p-3', rail ? 'w-[76px] items-center p-1.5' : 'w-[232px]')} aria-label="Parts">
          <p className={cn('pb-2 text-sm font-medium text-faint', rail ? 'px-0' : 'px-3')}>Parts</p>
          {!rail && <p className="px-3 text-sm text-faint">The parts of {name} will list here.</p>}
        </aside>
        <main className="relative min-w-0 flex-1 bg-background p-4">
          <div className="flex h-full items-center justify-center rounded-2xl bg-plate">
            <p className="text-sm text-faint">The live creature will stand here.</p>
          </div>
        </main>
        <aside className={cn('flex shrink-0 flex-col gap-2 overflow-hidden border-l bg-card p-5', rail ? 'w-[340px]' : 'w-[372px]')} aria-label="Inspector">
          <h2 className="text-xl font-semibold">Fields</h2>
          <p className="text-sm text-faint">Choose a part to see its fields.</p>
        </aside>
      </div>
      <NextPalette url={url} />
    </div>
  )
}

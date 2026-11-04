import { useEffect } from 'react'
import { AZS, MODES, VIEWS, type StudioUrl } from './url'
import { useUI } from './store'
import { useRail } from './useStudio'

const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))

// The keys of studio-ui.md 4.5 that exist so far, plus T for the theme (the design names no key for it).
export type CheckKeys = { toggleDrawer: () => void; proof: () => void; field: () => void; escape: () => boolean }
export function useKeys(url: StudioUrl, go: (p: Partial<StudioUrl>, replace?: boolean) => void, availableViews: (v: string) => boolean, ck?: CheckKeys) {
  const ui = useUI()
  const rail = useRail()
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'k') { e.preventDefault(); ui.setPalette(!ui.paletteOpen); return }
      if (typing(e.target) || e.metaKey || e.altKey || e.ctrlKey || ui.paletteOpen || ui.helpOpen) return
      const k = e.key
      if (k >= '1' && k <= '5') go({ mode: MODES[Number(k) - 1] })
      else if (k === '/') { e.preventDefault(); ui.setPalette(true) }
      else if (k === '?') ui.setHelp(true)
      else if (k === '[') ui.toggleNav()
      else if (k === ']') ui.toggleInsp()
      else if (k === 'ArrowLeft' || k === 'ArrowRight') {
        if (url.mode !== 'shape') return
        const i = AZS.indexOf(url.az)
        go({ az: AZS[(i + (k === 'ArrowRight' ? 1 : AZS.length - 1)) % AZS.length] }, true)
      } else if (k === 'm' || k === 'M') {
        const vs = VIEWS.filter((v) => v !== 'plush' && availableViews(v))
        go({ view: vs[(vs.indexOf(url.view) + 1) % vs.length] ?? 'clay' }, true)
      } else if (k === ' ' && url.mode === 'shape') { e.preventDefault(); if (!e.repeat) ui.setBefore(true) }
      else if ((k === 'd' || k === 'D') && url.mode === 'goldens') go({ gv: url.gv === 'diff' ? 'split' : 'diff' }, true)
      else if (k === 't' || k === 'T') ui.toggleTheme()
      else if ((k === 'c' || k === 'C') && ck) ck.toggleDrawer()
      else if ((k === 'v' || k === 'V') && ck) ck.proof()
      else if ((k === 'g' || k === 'G') && ck) ck.field()
      else if (k === 'Escape' && ck) ck.escape()
    }
    const up = (e: KeyboardEvent) => { if (e.key === ' ') ui.setBefore(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [url, go, ui, rail, availableViews, ck])
}

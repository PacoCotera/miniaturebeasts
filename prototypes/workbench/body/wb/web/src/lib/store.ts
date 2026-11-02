import { create } from 'zustand'
import type { Entry } from './api'

export type Theme = 'dark' | 'light'
const THEME_KEY = 'wb.theme'
const initialTheme = (): Theme => {
  const q = new URLSearchParams(window.location.search).get('theme')
  const t = q ?? localStorage.getItem(THEME_KEY)
  return t === 'light' ? 'light' : 'dark' // dark by default (owner ruling 1)
}
export type ToastItem = { id: number; entry: Entry }

type UI = {
  theme: Theme; toggleTheme: () => void
  navOpen: boolean; inspOpen: boolean; toggleNav: () => void; toggleInsp: () => void; setInsp: (v: boolean) => void
  paletteOpen: boolean; setPalette: (v: boolean) => void
  helpOpen: boolean; setHelp: (v: boolean) => void
  before: boolean; setBefore: (v: boolean) => void
  drawerH: number; setDrawerH: (h: number) => void
  toasts: ToastItem[]; pushToast: (e: Entry) => void; dropToast: (id: number) => void
}
let toastId = 0
export const useUI = create<UI>((set) => ({
  theme: initialTheme(),
  toggleTheme: () => set((s) => { const theme: Theme = s.theme === 'dark' ? 'light' : 'dark'; localStorage.setItem(THEME_KEY, theme); return { theme } }),
  navOpen: true, inspOpen: true,
  toggleNav: () => set((s) => ({ navOpen: !s.navOpen })),
  toggleInsp: () => set((s) => ({ inspOpen: !s.inspOpen })),
  setInsp: (inspOpen) => set({ inspOpen }),
  paletteOpen: false, setPalette: (paletteOpen) => set({ paletteOpen }),
  helpOpen: false, setHelp: (helpOpen) => set({ helpOpen }),
  before: false, setBefore: (before) => set({ before }),
  drawerH: Number(localStorage.getItem('wb.drawerH')) || 320, setDrawerH: (h) => { const drawerH = Math.round(Math.min(Math.max(h, 180), window.innerHeight - 200)); localStorage.setItem('wb.drawerH', String(drawerH)); set({ drawerH }) },
  toasts: [], pushToast: (entry) => set((s) => ({ toasts: [...s.toasts, { id: ++toastId, entry }].slice(-3) })),
  dropToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { useUI } from '../lib/store'
import { parseStudioUrl } from '../lib/url'
import NextShell from './NextShell'
import { isNext, nextUrl } from './url'

beforeAll(() => {
  // jsdom lacks what Radix, cmdk and the rail query use.
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
  Element.prototype.scrollIntoView = () => {}
})
afterEach(() => { cleanup(); useUI.setState({ paletteOpen: false, theme: 'dark' }) })

const Where = () => { const l = useLocation(); return <output data-testid="where">{l.pathname + l.search}</output> }
function mount(path = '/studio/S01/shape?ui=next') {
  const qc = new QueryClient()
  qc.setQueryData(['species-list'], [{ id: 'S01', name: 'Loika', hash: 'h', error: null }, { id: 'S20', name: 'Tuliko', hash: 'h', error: null }])
  return render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={[path]}><NextShell /><Where /></MemoryRouter></QueryClientProvider>)
}
const where = () => screen.getByTestId('where').textContent

describe('the ?ui=next shell', () => {
  it('links keep the flag, and the flag is read from the address', () => {
    const u = parseStudioUrl('/studio/S01/genes', '')!
    expect(nextUrl(u)).toBe('/studio/S01/genes?ui=next')
    expect(nextUrl({ ...u, sel: 'legs' })).toBe('/studio/S01/genes?sel=legs&ui=next')
    expect(isNext('?ui=next')).toBe(true)
    expect(isNext('?sel=legs')).toBe(false)
  })

  it('draws the top bar: the species, the five modes with the current one chosen, Find', () => {
    mount()
    expect(screen.getByRole('button', { name: 'Species' }).textContent).toContain('Loika')
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['Shape', 'Genes', 'Variety', 'Goldens', 'Gate'])
    expect(screen.getByRole('tab', { name: 'Shape' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('button', { name: 'Find' })).toBeTruthy()
    expect(screen.getByLabelText('Parts')).toBeTruthy()
    expect(screen.getByLabelText('Inspector')).toBeTruthy()
  })

  it('puts the new kit in dark by default and takes it off the page on leaving', () => {
    const { unmount } = mount()
    expect(document.documentElement.classList.contains('next')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    act(() => useUI.setState({ theme: 'light' }))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    unmount()
    expect(document.documentElement.classList.contains('next')).toBe(false)
  })

  it('a mode tab goes to that mode and keeps the flag', () => {
    mount()
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Genes' }), { button: 0 })
    expect(where()).toBe('/studio/S01/genes?ui=next')
  })

  it('Ctrl K opens the palette on shadcn Command; a species picked there is opened', async () => {
    mount()
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(await screen.findByRole('dialog')).toBeTruthy()
    fireEvent.click(await screen.findByText('Tuliko'))
    expect(where()).toBe('/studio/S20/shape?ui=next')
    expect(useUI.getState().paletteOpen).toBe(false)
  })

  it('the slash key opens the palette too, but not while typing in a field', () => {
    mount()
    const input = document.createElement('input')
    document.body.appendChild(input)
    fireEvent.keyDown(input, { key: '/' })
    expect(useUI.getState().paletteOpen).toBe(false)
    fireEvent.keyDown(window, { key: '/' })
    expect(useUI.getState().paletteOpen).toBe(true)
    input.remove()
  })
})

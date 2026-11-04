import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({ getPods: vi.fn(), keepPod: vi.fn(), saveMove: vi.fn(), getClip: vi.fn() }))
vi.mock('../../lib/play', async (orig) => ({ ...(await orig<typeof import('../../lib/play')>()), ...m }))
vi.mock('../../lib/eyes', () => ({ withEyes: (src: string) => Promise.resolve(src) }))
import { PodsPage } from './PodsPage'

afterEach(() => { cleanup(); vi.clearAllMocks() })
const pic = (k: string, ready = true) => ({ key: ready ? k.padEnd(64, '0') : null, ready, job: ready ? null : 'j' + k })
const pods = (hatched: number) => ({
  round: 0, diff: 'some', grow: 'juvenile', name: 'Pemmi', species: 'Tuliko', names: ['Churro', 'Luna', 'Michi', 'Pepita', 'Tilo', 'Nube'],
  pods: [0, 1, 2, 3, 4, 5].map((i) => ({ i, tries: 0, genome: 'g' + i, gated: i === 1 ? [{ id: 'whiskers', label: 'Whiskers', now: false }] : [], ...pic('p' + i, i < hatched) })),
  grow_ends: [{ stage: 'juvenile', ...pic('gy') }, { stage: 'elder', ...pic('ge') }],
  family: [{ id: 'a', label: 'Lantern tail', locus: 'l', look: 'lantern', how: 'often', share: 90, pic: pic('f1') }, { id: 'b', label: 'Dot pattern', locus: 'l', look: 'spots', how: 'sometimes', share: 25, pic: pic('f2') },
    { id: 'c', label: 'Maze pattern', locus: 'l', look: 'labyrinth', how: 'rarely', share: 5, pic: pic('f3') }, { id: 'whiskers', label: 'Whiskers', locus: 'w', look: 'on', how: 'grown', share: 9, pic: pic('f4') }],
})
const go = () => render(<MemoryRouter initialEntries={['/play/S71/pods']}><Routes><Route path="/play/:species/pods" element={<PodsPage />} /></Routes></MemoryRouter>)

describe('P3, pods', () => {
  it('drops six pods at once, hatches the drawn ones and keeps the rest wobbling under the copywriter\'s words', async () => {
    m.getPods.mockResolvedValue(pods(4))
    const { container } = go()
    await screen.findByText("Pemmi's pods")
    expect(screen.getAllByRole('group', { name: /^Pod \d$/ })).toHaveLength(6)
    expect(screen.getAllByText('Hatching…')).toHaveLength(2)
    expect(screen.getAllByRole('img', { name: 'Pemmi' })).toHaveLength(4)
    expect(screen.getAllByRole('button', { name: 'Walk' })).toHaveLength(6)
    expect(screen.getAllByRole('button', { name: 'Keep' })).toHaveLength(6)
    expect((screen.getAllByRole('button', { name: 'Walk' })[5] as HTMLButtonElement).disabled).toBe(true)         // a pod that has not hatched cannot walk or be kept
    expect(screen.getByText('More pods')).toBeTruthy()
    expect(screen.getByText('a Tuliko')).toBeTruthy()
    const text = (container.textContent ?? '').toLowerCase()
    for (const w of ['baby', 'babies', 'beast', 'breed']) expect(text).not.toContain(w)
  })

  it('has Grow as young, grown, elder, How different? as alike, some, wild, and a strip in four short words', async () => {
    m.getPods.mockResolvedValue(pods(6))
    go()
    await screen.findByText('Grow')
    for (const w of ['young', 'grown', 'elder']) expect(screen.getAllByText(w).length).toBeGreaterThan(0)
    expect(screen.getByRole('radiogroup', { name: 'How different?' })).toBeTruthy()
    expect((screen.getByRole('radio', { name: 'some' }) as HTMLElement).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByText('In this family')).toBeTruthy()
    for (const w of ['often', 'sometimes', 'rarely', 'when grown']) expect(screen.getByText(w)).toBeTruthy()
    expect(screen.getByRole('slider', { name: 'Age' }).getAttribute('aria-valuetext')).toBe('young')
  })

  it('saves the dial and the age in the file and asks for the pods again at that width and age', async () => {
    m.getPods.mockResolvedValue(pods(6))
    m.saveMove.mockResolvedValue({ ok: true })
    go()
    await screen.findByText('Grow')
    fireEvent.click(screen.getByRole('radio', { name: 'wild' }))
    await waitFor(() => expect(m.saveMove).toHaveBeenCalledWith('S71', 'diff', 'width', 'wild'))
    await waitFor(() => expect(m.getPods).toHaveBeenLastCalledWith('S71', 0, 'wild', undefined))
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Age' }), { key: 'ArrowRight' })
    await waitFor(() => expect(m.saveMove).toHaveBeenCalledWith('S71', 'grow', 'age', 'adult'))
    await waitFor(() => expect(m.getPods).toHaveBeenLastCalledWith('S71', 0, 'wild', 'adult'))
  })

  it('More pods asks for the next round', async () => {
    m.getPods.mockResolvedValue(pods(6))
    go()
    await screen.findByText('More pods')
    fireEvent.click(screen.getByText('More pods'))
    await waitFor(() => expect(m.getPods).toHaveBeenLastCalledWith('S71', 1, undefined, undefined))
  })

  it('Keep asks for a name (three offers and a dice), keeps the pod under it and says it is in My mibis', async () => {
    m.getPods.mockResolvedValue(pods(6))
    m.keepPod.mockResolvedValue({ id: 'M0001', name: 'Luna', species: 'Tuliko', parents: ['S71', 'S71'] })
    go()
    await screen.findByText('Grow')
    fireEvent.click(screen.getAllByRole('button', { name: 'Keep' })[2])
    expect(screen.getByRole('dialog', { name: 'Name your mibi' })).toBeTruthy()
    expect(screen.getAllByRole('radio').filter((r) => ['Churro', 'Luna', 'Michi'].includes(r.textContent ?? ''))).toHaveLength(3)
    fireEvent.click(screen.getByRole('radio', { name: 'Luna' }))
    fireEvent.click(screen.getByText('Keep Luna'))
    await waitFor(() => expect(m.keepPod).toHaveBeenCalledWith('S71', { round: 0, i: 2, tries: 0, diff: 'some', grow: 'juvenile', name: 'Luna' }))
    await screen.findByText('Luna is in My mibis.')
    expect((screen.getAllByRole('button', { name: 'Keep' })[2] as HTMLButtonElement).getAttribute('aria-pressed')).toBe('true')
  })

  const clip = (clay: boolean, plush: boolean) => ({ clip: 'walk', genome: 'g0', frames: 6, period: 0.9, frame_s: 0.15, size: [304, 312], clay: { key: 'c'.padEnd(64, '0'), ready: clay, job: clay ? null : 'jc' }, plush: { key: 'w'.padEnd(64, '0'), ready: plush, job: plush ? null : 'jw' } })

  it('walks a baby: the clay loop plays as soon as it is drawn while the plush is fluffed, and the plush takes its place', async () => {
    m.getPods.mockResolvedValue(pods(6))
    m.getClip.mockResolvedValueOnce(clip(false, false)).mockResolvedValueOnce(clip(true, false)).mockResolvedValue(clip(true, true))
    const { container } = go()
    await screen.findByText("Pemmi's pods")
    fireEvent.click(screen.getAllByRole('button', { name: 'Walk' })[0])
    await screen.findByText('Sculpting…')
    expect(container.querySelector('[data-clip="walk"]')).toBeNull()                       // nothing drawn yet: the baby keeps breathing
    await waitFor(() => expect(container.querySelector('[data-clip="walk"]')).not.toBeNull(), { timeout: 4000 })
    const walk = container.querySelector('[data-clip="walk"]') as HTMLElement
    expect(walk.getAttribute('style')).toContain('--frames: 6')
    expect(walk.getAttribute('style')).toContain('--loop: 0.9s')
    await waitFor(() => expect(screen.queryByText('Fluffing up…')).toBeNull(), { timeout: 4000 })
    expect(m.getClip).toHaveBeenCalledWith('S71', 'g0', 'walk')
    expect((container.querySelector('[data-clip="walk"]') as HTMLElement).getAttribute('style')).toContain('/cas/' + 'w'.padEnd(64, '0'))
  })
})

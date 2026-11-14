import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({ getStarters: vi.fn(), getToys: vi.fn(), getLook: vi.fn(), getSpecies: vi.fn(), getJob: vi.fn(), saveMove: vi.fn(), undoMove: vi.fn(), potColour: vi.fn() }))
vi.mock('../../lib/play', async (orig) => ({ ...(await orig<typeof import('../../lib/play')>()), ...m }))
import { Pick, Shape } from './PlayPage'

afterEach(cleanup)
const pic = (k: string) => ({ key: k.padEnd(64, '0'), ready: true })
const starter = (id: string, name: string, built = true) => ({ id, name, species: 'Tuliko', plan: 'biped', built, genome: 'g', plush: pic(id), warm: null })
const Where = () => <div data-testid="where">{useLocation().pathname}</div>

describe('P1, pick a mibi', () => {
  it('shows each starter with its own name and its species, the copywriter\'s title, and no word beast', async () => {
    m.getStarters.mockResolvedValue([starter('S71', 'Pemmi'), starter('S72', 'Fennel'), starter('S22', 'Moss', false)])
    const { container } = render(<MemoryRouter initialEntries={['/play']}><Routes><Route path="/play" element={<Pick />} /><Route path="/play/:species" element={<Where />} /></Routes></MemoryRouter>)
    await screen.findByText('Pemmi')
    expect(screen.getByRole('heading', { name: 'Pick a mibi' })).toBeTruthy()
    expect(screen.getByText('Then squish it, paint it and make pods.')).toBeTruthy()
    expect(screen.getAllByText('a Tuliko')).toHaveLength(2)
    expect(screen.queryByText('Moss')).toBeNull()                                       // a plan with no cage builder has no cushion yet
    expect(screen.getByText('Surprise me')).toBeTruthy()
    expect(screen.getByText('Keep a young mibi and it waits here.')).toBeTruthy()
    expect(container.textContent?.toLowerCase()).not.toContain('beast')
    fireEvent.click(screen.getByRole('button', { name: 'Fennel, a Tuliko' }))
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/play/S72'))
  })
})

describe('P2, shape', () => {
  const axisS = { id: 'length', locus: 'l', kind: 'range', label: 'length', cage: true, home: 1, steps: [0, 1, 2].map((i) => ({ i, value: i, ok: true, why: [], end: { genome: 'e', ...pic('e' + i) }, now: { genome: 'n', ...pic('n' + i) } })) }
  const axisC = { id: 'tip', locus: 't', kind: 'choice', label: 'tip', cage: true, home: 'prick', options: ['prick', 'lop'].map((id) => ({ id, word: id === 'prick' ? 'pointy' : 'floppy', ok: true, why: [], end: { genome: 'e', ...pic(id) }, now: { genome: 'n', ...pic(id) } })) }
  const toys = { built: true, name: 'Pemmi', species: 'Tuliko', genome: 'g', hold: 'h', sentences: {}, warm: { state: 'done', done: 1, total: 1 }, toys: [
    { id: 'body', label: 'Body', plain: 'Body', hidden: false, kind: 'slider', axes: [axisS] }, { id: 'tail', label: 'Tail', plain: 'Tail', hidden: false, kind: 'slider+chips', axes: [axisS, axisC] }] }
  it('says the copywriter\'s questions only where a toy has two sliders, and never a chip id', async () => {
    m.getStarters.mockResolvedValue([starter('S71', 'Pemmi')])
    const two = { ...axisS, id: 'curl' }
    const t2 = { ...toys, toys: [{ id: 'tail', label: 'Tail', plain: 'Tail', hidden: false, kind: 'slider+chips', axes: [axisS, two, axisC] }, { id: 'body', label: 'Body', plain: 'Body', hidden: false, kind: 'slider', axes: [{ ...axisS, id: 'size' }] }] }
    m.getToys.mockResolvedValue(t2)
    m.getLook.mockResolvedValue({ genome: 'g', ...pic('n1'), job: null, clay_job: null })
    m.getSpecies.mockResolvedValue({ undo: { undo: false, redo: false } })
    const { container } = render(<MemoryRouter initialEntries={['/play/S71']}><Routes><Route path="/play/:species" element={<Shape />} /></Routes></MemoryRouter>)
    await screen.findByText('Pemmi')
    expect(screen.getByText('How long?')).toBeTruthy()
    expect(screen.getByText('How curly?')).toBeTruthy()
    expect(screen.queryByText('How round?')).toBeNull()                                  // the Body slider is its toy's only one: no label on screen
    expect(screen.getByRole('slider', { name: 'How round?' })).toBeTruthy()              // but a screen reader hears it
    expect(screen.getByRole('radiogroup', { name: 'Tail tip' })).toBeTruthy()
    const shown = [container.textContent ?? '', ...[...container.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label') ?? '')].join(' ')
    for (const id of ['prick', 'lop', 'spots', 'labyrinth']) expect(shown).not.toMatch(new RegExp(`\\b${id}\\b`))
    expect(shown).toContain('pointy')
  })

  it('names the mibi and its species, has a big undo and no save button, and a slider per range and chips per choice', async () => {
    m.getStarters.mockResolvedValue([starter('S71', 'Pemmi')])
    m.getToys.mockResolvedValue(toys)
    m.getLook.mockResolvedValue({ genome: 'g', ...pic('n1'), job: null, clay_job: null })
    m.getSpecies.mockResolvedValue({ undo: { undo: true, redo: false } })
    const { container } = render(<MemoryRouter initialEntries={['/play/S71']}><Routes><Route path="/play/:species" element={<Shape />} /></Routes></MemoryRouter>)
    await screen.findByText('Pemmi')
    expect(screen.getByText('a Tuliko')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy()
    expect(screen.queryByText(/save/i)).toBeNull()
    expect(screen.getAllByRole('slider')).toHaveLength(2)
    expect(screen.getAllByRole('radio')).toHaveLength(2)
    expect(container.textContent?.toLowerCase()).not.toContain('beast')
    m.saveMove.mockResolvedValue({ ok: true, genome: 'g2', plush: { ...pic('n0'), job: null }, clay_job: null, undo: true, redo: false })
    fireEvent.click(screen.getAllByRole('radio')[1])
    await waitFor(() => expect(m.saveMove).toHaveBeenCalledWith('S71', 'tail', 'tip', 'lop'))
  })
})

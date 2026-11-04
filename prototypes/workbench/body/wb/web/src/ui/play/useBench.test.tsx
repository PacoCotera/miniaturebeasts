import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Axis, PlayToys } from '../../lib/play'

const m = vi.hoisted(() => ({ getToys: vi.fn(), getLook: vi.fn(), getSpecies: vi.fn(), getJob: vi.fn(), saveMove: vi.fn(), undoMove: vi.fn() }))
vi.mock('../../lib/play', async (orig) => ({ ...(await orig<typeof import('../../lib/play')>()), ...m }))
import { useBench } from './useBench'

const pic = (k: string, ready: boolean) => ({ key: k.padEnd(64, '0'), ready })
const step = (i: number, ok: boolean, nowReady = false) => ({ i, value: 1 + i / 10, ok, why: ok ? [] : ['tail.size'], end: { genome: `set:x=${i}`, ...pic(`e${i}`, true) }, now: { genome: `g${i}`, ...pic(`n${i}`, nowReady) } })
const axis: Axis = { id: 'length', locus: 'form.tail-length', kind: 'range', label: 'length', cage: true, home: 1, steps: [step(0, true, true), step(1, true, true), step(2, true, false), step(3, false)] }
const toys: PlayToys = { built: true, name: 'Pemmi', species: 'Tuliko', genome: 'g1', hold: "Hmm, that shape didn't work. Try another?", warm: { state: 'done', done: 4, total: 4 },
  sentences: { 'tail.size': "Any more tail and I'd tip over backwards!", default: "That's as far as I can go!" }, toys: [{ id: 'tail', label: 'Tail', plain: 'Tail', hidden: false, kind: 'slider', axes: [axis] }] }
const tail = () => toys.toys[0]

beforeEach(() => {
  vi.useRealTimers()
  Object.values(m).forEach((f) => f.mockReset())
  m.getToys.mockResolvedValue(toys)
  m.getLook.mockResolvedValue({ genome: 'g1', ...pic('n1', true), job: null, clay_job: null })
  m.getSpecies.mockResolvedValue({ undo: { undo: false, redo: false } })
})

describe('the bench (spec 2.5)', () => {
  it('shows the mibi as it stands, then a drawn step at once, before the save is back', async () => {
    let done!: (v: unknown) => void
    m.saveMove.mockReturnValue(new Promise((r) => { done = r }))
    const { result } = renderHook(() => useBench('S71'))
    await waitFor(() => expect(result.current.shown.src).toContain(pic('n1', true).key))
    await act(async () => { void result.current.move('tail', axis, 0) })
    expect(result.current.shown.src).toContain(pic('n0', true).key)         // drawn already: on the stage straight away
    expect(result.current.wait).toBeNull()
    expect(result.current.pos['tail.length']).toBe(0)
    await act(async () => { done({ ok: true, genome: 'g0', plush: { ...pic('n0', true), job: null }, clay_job: null, undo: true, redo: false }) })
    await waitFor(() => expect(result.current.undo).toBe(true))
  })

  it('a step the sweep trimmed springs back and the mibi says its sentence, with no save', async () => {
    const { result } = renderHook(() => useBench('S71'))
    await waitFor(() => expect(result.current.toys).not.toBeNull())
    await act(async () => { await result.current.move('tail', axis, 3) })
    await waitFor(() => expect(result.current.say?.text).toBe("Any more tail and I'd tip over backwards!"))
    expect(m.saveMove).not.toHaveBeenCalled()
    await waitFor(() => expect(result.current.pos['tail.length']).toBe(1))   // back to where it was
    expect(result.current.spring['tail.length']).toBe(1)
  })

  it('a refusal from the server springs back to where the server says and the picture stays', async () => {
    m.saveMove.mockResolvedValue({ ok: false, refused: true, sentence: 'Whoa, I need my feet under me.', back_to: 1, toy: 'tail', axis: 'length', why: 'check' })
    const { result } = renderHook(() => useBench('S71'))
    await waitFor(() => expect(result.current.shown.src).toBeTruthy())
    const before = result.current.shown.src
    await act(async () => { await result.current.move('tail', axis, 2) })
    await waitFor(() => expect(result.current.say?.text).toBe('Whoa, I need my feet under me.'))
    expect(result.current.shown.src).toBe(before)
    expect(result.current.wait).toBeNull()
  })

  it('a step not drawn yet waits: sculpting, then the clay, then the plush fluffs in; the latest move wins', async () => {
    m.saveMove.mockImplementation(async (_s: string, _t: string, _a: string, to: number) => ({ ok: true, genome: `g${to}`, plush: { ...pic(`n${to}`, false), job: `jp${to}` }, clay_job: `jc${to}`, undo: true, redo: false }))
    let finishPlush!: () => void
    m.getJob.mockImplementation(async (id: string) => {
      if (id === 'jc2') return { id, state: 'done', result: { views: [{ key: 'c'.repeat(64) }] } }
      if (id === 'jp2') { await new Promise<void>((r) => { finishPlush = r }); return { id, state: 'done', result: { views: [{ key: 'p'.repeat(64) }] } } }
      return { id, state: 'done', result: { views: [{ key: 'z'.repeat(64) }] } }
    })
    const { result } = renderHook(() => useBench('S71'))
    await waitFor(() => expect(result.current.shown.src).toBeTruthy())
    await act(async () => { void result.current.move('tail', tail().axes[0], 2) })
    await waitFor(() => expect(result.current.shown).toEqual({ src: expect.stringContaining('c'.repeat(64)), kind: 'clay' }))
    expect(result.current.wait?.phase).toBe('fluff')
    await act(async () => { finishPlush() })
    await waitFor(() => expect(result.current.shown).toEqual({ src: expect.stringContaining('p'.repeat(64)), kind: 'plush', genome: 'g2' }))
    expect(result.current.puff).toBe(result.current.shown.src)
    expect(result.current.wait).toBeNull()
  })

  it('a later move drops the pictures of an earlier one', async () => {
    m.saveMove.mockImplementation(async (_s: string, _t: string, _a: string, to: number) => ({ ok: true, genome: `g${to}`, plush: { ...pic(`n${to}`, to < 2), job: to < 2 ? null : `jp${to}` }, clay_job: null, undo: true, redo: false }))
    m.getJob.mockImplementation(async (id: string) => (id === 'jp2' ? new Promise(() => undefined) : { id, state: 'done', result: { views: [{ key: 'q'.repeat(64) }] } }))
    const { result } = renderHook(() => useBench('S71'))
    await waitFor(() => expect(result.current.shown.src).toBeTruthy())
    await act(async () => { void result.current.move('tail', axis, 2) })           // never answers
    await act(async () => { await result.current.move('tail', axis, 0) })          // drawn already: this one wins
    expect(result.current.shown.src).toContain(pic('n0', true).key)
    expect(result.current.wait).toBeNull()
  })
})

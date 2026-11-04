import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { controlFor, rebalance, type FieldDesc } from '../lib/forms'
import { PlayPanel } from './PlayPanel'
import { WeightsField } from './WeightsField'

afterEach(cleanup)
const w: FieldDesc = { id: 'genome.loci.form.ear-kind.weights', ptr: '/genome/loci/3/weights', label: 'How often', full: 'Ear shape', help: '', type: 'weights', unit: '', options: ['prick', 'lop', 'nub'] }

describe('the families\' weights', () => {
  it('is its own control in the registry', () => { expect(controlFor(w)).toBe('weights') })
  it('moving one share takes from the others in proportion and the shares add up to 1', () => {
    const r = rebalance([0.4, 0.3, 0.3], 0, 0.6)
    expect(r[0]).toBe(0.6)
    expect(r[1]).toBeCloseTo(0.2, 3); expect(r[2]).toBeCloseTo(0.2, 3)
    expect(r.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9)
    expect(rebalance([0.5, 0.5, 0], 0, 0.8)).toEqual([0.8, 0.2, 0])
    expect(rebalance([1, 0, 0], 0, 0.5)).toEqual([0.5, 0.25, 0.25])
    expect(rebalance([0.4, 0.3, 0.3], 1, 7)[1]).toBe(1)
  })
  it('shows a row for each family with its share and sends the rebalanced list', () => {
    const on = vi.fn()
    render(<WeightsField desc={w} value={[0.4, 0.3, 0.3]} onChange={on} editable />)
    expect(screen.getByText('Prick')).toBeTruthy()
    expect(screen.getByText('40%')).toBeTruthy()
    fireEvent.change(screen.getByRole('slider', { name: 'Lop: 30%' }), { target: { value: '0.5' } })
    expect(on).toHaveBeenCalledTimes(1)
    const sent = on.mock.calls[0][0] as number[]
    expect(sent[1]).toBe(0.5)
    expect(sent.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9)
  })
  it('cannot be moved by a hand without a token', () => {
    render(<WeightsField desc={w} value={[0.4, 0.3, 0.3]} onChange={() => {}} editable={false} />)
    expect((screen.getByRole('slider', { name: 'Lop: 30%' }) as HTMLInputElement).disabled).toBe(true)
  })
})

describe('as the player sees it', () => {
  const axis = { id: 'length', locus: 'form.tail-length', kind: 'range' as const, label: 'length', cage: true, home: 2, steps: Array.from({ length: 7 }, (_, i) => ({ i, value: 0.8 + i * 0.1, ok: i < 5, why: i < 5 ? [] : ['tail.size'], end: { genome: 'x' } })) }
  const tip = { id: 'tip', locus: 'anatomy.tail-tip-form', kind: 'choice' as const, label: 'tip', cage: true, home: 'lantern', options: [{ id: 'lantern', word: 'lantern', ok: true, why: [], end: { genome: 'x' } }, { id: 'plain', word: 'plain', ok: false, why: ['tail.size'], end: { genome: 'x' } }] }
  const toy = { id: 'tail', label: 'Tail', plain: 'Tail', hidden: false, kind: 'slider+chips', parts: ['tail'], axes: [axis, tip] }
  it('names the toy, lights the chip in force, strikes a trimmed chip and puts the slider on its step of 7', () => {
    render(<PlayPanel toys={[toy]} sentences={{ 'tail.size': "Any longer and I'd tip over backwards!" }} />)
    expect(screen.getByText('Tail')).toBeTruthy()
    expect(screen.getByText('lantern').getAttribute('data-on')).toBe('true')
    expect(screen.getByText('plain').getAttribute('data-trimmed')).toBe('true')
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('length: step 3 of 7, 2 trimmed')
  })
  it('says the mibi\'s sentence under the steps the sweep trimmed', () => {
    render(<PlayPanel toys={[toy]} sentences={{ 'tail.size': "Any longer and I'd tip over backwards!" }} />)
    expect(screen.getAllByText(/Any longer and I'd tip over backwards!/).length).toBe(2)
  })
  it('draws the paint pots and lights the one the mibi has', () => {
    const paint = { ...toy, id: 'paint', label: 'Paint', kind: 'pots', axes: [{ ...axis, id: 'hue', steps: Array.from({ length: 8 }, (_, i) => ({ i, value: 180 + i * 25, ok: true, why: [], end: { genome: 'x' } })), home: 3 }] }
    render(<PlayPanel toys={[paint]} />)
    expect(screen.getAllByRole('listitem').length).toBe(8)
    expect(screen.getAllByRole('listitem')[3].getAttribute('data-on')).toBe('true')
  })
})

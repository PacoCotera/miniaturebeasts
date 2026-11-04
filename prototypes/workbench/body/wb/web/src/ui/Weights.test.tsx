import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { controlFor, rebalance, stepOf, type FieldDesc } from '../lib/forms'
import { PlayPanel } from './PlayPanel'
import { WeightsField } from './WeightsField'
import type { Species } from '../lib/api'

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
  const file = { spine: { tail: { length: 1.2 } } } as unknown as Species['file']
  it('names the toy, lights the family in force and puts the slider on its step of 7', () => {
    render(<PlayPanel toy={{ toy: 'Tail', chips: [{ family: 'plain', word: 'plain', on: false, ptr: '/p' }, { family: 'lantern', word: 'lantern', on: true, ptr: '/p' }], slider: { ptr: '/spine/tail/length', range: [0.6, 1.8], steps: 7 } }} species={{ file } as Species} />)
    expect(screen.getByText('Tail')).toBeTruthy()
    expect(screen.getByText('lantern').getAttribute('data-on')).toBe('true')
    expect(screen.getByText('plain').getAttribute('data-on')).toBeNull()
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Slider, step 4 of 7')
    expect(stepOf(0.6, [0.6, 1.8], 7)).toBe(0); expect(stepOf(1.8, [0.6, 1.8], 7)).toBe(6)
  })
})

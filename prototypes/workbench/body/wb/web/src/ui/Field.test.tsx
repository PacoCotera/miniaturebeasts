import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FieldDesc } from '../lib/forms'
import { NumberField } from './NumberField'
import { Segmented } from './Segmented'
import { SelectField } from './SelectField'
import { Switch } from './Switch'

const len: FieldDesc = { id: 'spine.tail.length', ptr: '/spine/tail/length', label: 'Length', full: 'Tail length', help: '', type: 'number', unit: 'H', range: [0.6, 1.8], step: 0.01 }
const join: FieldDesc = { id: 'parts.ear.L.socket.join', ptr: '/parts/1/socket/join', label: 'Join', full: 'Join', help: '', type: 'enum', unit: '', options: ['hard', 'soft'] }
const fam: FieldDesc = { id: 'f', ptr: '/f', label: 'Family', full: 'Family', help: '', type: 'enum', unit: '', options: ['prick', 'lop', 'nub', 'frond'] }
const flag: FieldDesc = { id: 'g', ptr: '/g', label: 'Mirrored', full: 'Mirrored', help: '', type: 'bool', unit: '' }

afterEach(cleanup)
const down = (el: Element, x: number) => { (el as HTMLElement).setPointerCapture = vi.fn(); fireEvent.pointerDown(el, { clientX: x, button: 0, pointerId: 1 }) }

describe('the number field', () => {
  it('shows the value with its unit and the range bar with the mark on it', () => {
    render(<NumberField desc={len} value={1.24} onChange={() => {}} editable />)
    expect(screen.getByRole('button', { name: 'Length' }).textContent).toBe('1.24')
    expect(screen.getByText('H')).toBeTruthy()
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('the plan allows 0.6 to 1.8')
  })
  it('opens for typing on a click, keeps what is typed on Enter and leaves it on Esc', () => {
    const on = vi.fn()
    render(<NumberField desc={len} value={1.1} onChange={on} editable />)
    const b = screen.getByRole('button', { name: 'Length' })
    down(b, 10); fireEvent.pointerUp(b, { clientX: 10 })
    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input.value).toBe('1.1')
    fireEvent.change(input, { target: { value: '1,24' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(on).toHaveBeenCalledWith(1.24)
    on.mockClear()
    down(screen.getByRole('button', { name: 'Length' }), 10); fireEvent.pointerUp(screen.getByRole('button', { name: 'Length' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '1.9' } })
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' })
    expect(on).not.toHaveBeenCalled()
  })
  it('leaves the file\'s own digits alone when the shown value is kept as it is', () => {
    const on = vi.fn()
    render(<NumberField desc={len} value={0.272727273} onChange={on} editable />)
    const b = screen.getByRole('button', { name: 'Length' })
    down(b, 0); fireEvent.pointerUp(b)
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('0.273')
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
    expect(on).not.toHaveBeenCalled()
  })
  it('sends a typed value outside the range as it is: the server says why not', () => {
    const on = vi.fn()
    render(<NumberField desc={len} value={1.1} onChange={on} editable />)
    const b = screen.getByRole('button', { name: 'Length' })
    down(b, 0); fireEvent.pointerUp(b)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '9' } })
    fireEvent.blur(screen.getByRole('textbox'))
    expect(on).toHaveBeenCalledWith(9)
  })
  it('does not take a typed word', () => {
    const on = vi.fn()
    render(<NumberField desc={len} value={1.1} onChange={on} editable />)
    const b = screen.getByRole('button', { name: 'Length' })
    down(b, 0); fireEvent.pointerUp(b)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'long' } })
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
    expect(on).not.toHaveBeenCalled()
  })
  it('scrubs sideways from the value it started on, and a small move is a click, not a scrub', () => {
    const on = vi.fn()
    render(<NumberField desc={len} value={1.1} onChange={on} editable />)
    const b = screen.getByRole('button', { name: 'Length' })
    down(b, 100)
    fireEvent.pointerMove(b, { clientX: 102 })
    expect(on).not.toHaveBeenCalled()
    fireEvent.pointerMove(b, { clientX: 128 })
    expect(on).toHaveBeenLastCalledWith(1.24)             // 28 px of 240 over a 1.2 band
    fireEvent.pointerMove(b, { clientX: 128 + 240 }, )
    expect(on).toHaveBeenLastCalledWith(1.8)
    fireEvent.pointerUp(b)
    expect(screen.queryByRole('textbox')).toBeNull()      // it was a scrub: no typing box
  })
  it('steps with the arrows, ten steps with Shift, and stops at the range', () => {
    const on = vi.fn()
    render(<NumberField desc={len} value={1.79} onChange={on} editable />)
    const b = screen.getByRole('button', { name: 'Length' })
    fireEvent.keyDown(b, { key: 'ArrowDown' }); expect(on).toHaveBeenLastCalledWith(1.78)
    fireEvent.keyDown(b, { key: 'ArrowUp', shiftKey: true }); expect(on).toHaveBeenLastCalledWith(1.8)
  })
  it('sets the value from a press on the bar', () => {
    const on = vi.fn()
    render(<NumberField desc={len} value={1.1} onChange={on} editable />)
    const bar = screen.getByRole('img')
    bar.setPointerCapture = vi.fn()
    bar.getBoundingClientRect = () => ({ left: 0, width: 300, right: 300, top: 0, bottom: 18, height: 18, x: 0, y: 0, toJSON: () => ({}) })
    fireEvent.pointerDown(bar, { clientX: 150, pointerId: 1 })
    expect(on).toHaveBeenCalledWith(1.2)
  })
  it('is read-only without a token or while an agent holds the file', () => {
    const on = vi.fn()
    render(<NumberField desc={len} value={1.1} onChange={on} editable={false} />)
    const b = screen.getByRole('button', { name: 'Length' }) as HTMLButtonElement
    expect(b.disabled).toBe(true)
    fireEvent.keyDown(b, { key: 'ArrowUp' })
    expect(on).not.toHaveBeenCalled()
  })
  it('turns the mark red while its check fails, and shows the server\'s refusal under the field', () => {
    const { container } = render(<NumberField desc={len} value={1.8} onChange={() => {}} editable fail error="spine.tail.length is 9 H, outside the biped plan's band 0.6 to 1.8" />)
    expect(screen.getByRole('alert').textContent).toContain('outside the biped plan')
    expect(container.querySelector('[class*=fmark][class*=fail]')).toBeTruthy()
  })
})

describe('the other controls', () => {
  it('a choice of two sits side by side with the one in force lit, and picks on a press', () => {
    const on = vi.fn()
    render(<Segmented desc={join} value="hard" onChange={on} editable />)
    expect(screen.getByRole('radio', { name: 'Hard' }).getAttribute('aria-checked')).toBe('true')
    fireEvent.click(screen.getByRole('radio', { name: 'Hard' }))
    expect(on).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('radio', { name: 'Soft' }))
    expect(on).toHaveBeenCalledWith('soft')
  })
  it('a longer choice is a select', () => {
    const on = vi.fn()
    render(<SelectField desc={fam} value="prick" onChange={on} editable />)
    fireEvent.change(screen.getByLabelText('Family'), { target: { value: 'nub' } })
    expect(on).toHaveBeenCalledWith('nub')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Prick', 'Lop', 'Nub', 'Frond'])
  })
  it('a flag is a switch that says its state', () => {
    const on = vi.fn()
    render(<Switch desc={flag} value={false} onChange={on} editable />)
    const sw = screen.getByRole('switch', { name: 'Mirrored' })
    expect(sw.getAttribute('aria-checked')).toBe('false')
    fireEvent.click(sw)
    expect(on).toHaveBeenCalledWith(true)
  })
})

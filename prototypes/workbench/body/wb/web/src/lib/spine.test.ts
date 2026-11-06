import { describe, expect, it } from 'vitest'
import { along, ends, knobName, knobValue, placeKnobLabels, pointAt, project, screenAxis, textWidth, type Camera, type V3 } from './spine'

// The hero camera at az 90: the creature's left side, x running across the frame.
const cam: Camera = { az: 90, el: 10, w: 608, h: 624, ppH: 190, centre: [-0.35, 0, 1.3], right: [0, 0, 0] as V3, up: [0, 0, 1] as V3 }
const side: Camera = { ...cam, right: [1, 0, 0], up: [0, 0, 1] }
describe('the spine on the stage', () => {
  it('projects the camera centre to the middle of the frame and a metre of H to 190 px', () => {
    expect(project(side, [-0.35, 0, 1.3])).toEqual([304, 312])
    const [x, y] = project(side, [0.65, 0, 2.3])
    expect(x).toBe(304 + 190)
    expect(y).toBeCloseTo(312 - 190, 6)
  })
  it('turns a drag along an axis into the H it went, whichever way the axis points on the screen', () => {
    expect(along(side, [1, 0, 0], 95, 0)).toBeCloseTo(0.5, 6)
    expect(along(side, [-1, 0, 0], 95, 0)).toBeCloseTo(-0.5, 6)
    expect(along(side, [0, 0, 1], 0, -190)).toBeCloseTo(1, 6)
    expect(along(side, [1, 0, 0], 0, 60)).toBeCloseTo(0, 6)
    expect(screenAxis(side, [0, 0, 1])).toEqual([0, -190])
  })
  it('walks the path by arc length', () => {
    const path: V3[] = [[0, 0, 2], [0, 0, 1.975], [0, 0, 1.95]]
    expect(pointAt(path, 0.025, 0.0125)[2]).toBeCloseTo(1.9875, 6)
    expect(pointAt(path, 0.025, 9)[2]).toBeCloseTo(1.95, 6)
  })
  it('puts each range end after the lengths on screen, the last running to the end of the path', () => {
    const rs = Array.from({ length: 3 }, (_, i) => ({ name: String(i) })) as never
    expect(ends(rs, [0.9, 0.3, null], 2.5)).toEqual([0.9, 1.2, 2.5])
  })
  it('keeps a dragged knob inside the plan\'s band and on its step', () => {
    expect(knobValue(0.715, 0.1, 1.78, [0.45, 0.95], 0.004)).toBeCloseTo(0.893, 3)
    expect(knobValue(0.715, 9, 1.78, [0.45, 0.95], 0.004)).toBe(0.95)
    expect(knobValue(0.715, -9, 1.78, [0.45, 0.95], 0.004)).toBe(0.45)
    expect(knobValue(0.05, 0.1, -2.1, [0, 0.6], 0.005)).toBe(0)
  })
})

describe('the knob labels', () => {
  const frame = { w: 608, h: 624 }
  it('keeps every label off the others, off the handles and off the range names', () => {
    const knobs = [{ id: 'a', x: 100, y: 300, text: '1', selected: false }, { id: 'b', x: 160, y: 318, text: '0.7', name: 'Neck width', selected: true }, { id: 'c', x: 200, y: 304, text: '+5', selected: false }, { id: 'd', x: 290, y: 312, text: '+15', selected: false }]
    const blocked = [{ x0: 500, y0: 380, x1: 600, y1: 400 }]
    const placed = placeKnobLabels(knobs, blocked, 1.3, frame)
    const boxes = placed.map((p, i) => {
      const k = knobs[i], text = k.selected ? `${k.name}  ${k.text}` : k.text, w = textWidth(text, 1.3)
      const x0 = k.x + p.value.dx - (p.value.anchor === 'end' ? w : p.value.anchor === 'middle' ? w / 2 : 0)
      return { x0, x1: x0 + w, y0: k.y + p.value.dy - 16.6, y1: k.y + p.value.dy + 5 }
    })
    boxes.forEach((a, i) => boxes.forEach((b, j) => { if (i < j) expect(a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1).toBe(false) }))
    knobs.forEach((k) => boxes.forEach((b, i) => { if (knobs[i] !== k) expect(b.x0 < k.x + 27 && k.x - 27 < b.x1 && b.y0 < k.y + 13 && k.y - 13 < b.y1).toBe(false) }))
  })
  it('puts a lone knob\'s value to its left', () => {
    const [p] = placeKnobLabels([{ id: 'a', x: 300, y: 300, text: '1', selected: false }], [], 1, frame)
    expect(p.value.anchor).toBe('end')
  })
})

describe('the knob names', () => {
  const keys = ['R_scale', 'neck_ratio', 'chest_front', 'rump_gain']
  const code = /^[a-z][a-z0-9]*(_[a-zA-Z0-9]+)+$|^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)+$|^R_scale$/
  it('says every knob in words, whether or not the server sent a label', () => {
    for (const name of keys) {
      const k = { name, id: `spine.loft.head_profile.${name}` }
      const lab = knobName(k)
      expect(lab).not.toBe('')
      expect(lab).not.toMatch(code)
      expect(lab).not.toContain('_')
    }
  })
  it('prefers the label the server sent, then the schema label', () => {
    expect(knobName({ name: 'neck_ratio', id: 'x', label: 'Neck width' })).toBe('Neck width')
    expect(knobName({ name: 'neck_ratio', id: 'x' }, { x: 'Width of the neck' })).toBe('Width of the neck')
  })
})

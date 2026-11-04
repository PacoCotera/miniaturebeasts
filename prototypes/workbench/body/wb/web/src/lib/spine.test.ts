import { describe, expect, it } from 'vitest'
import { along, ends, knobValue, pointAt, project, screenAxis, type Camera, type V3 } from './spine'

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

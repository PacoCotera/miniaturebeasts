import { describe, expect, it } from 'vitest'
import { darkBlobs, eyesOf, keyOut } from './eyes'

// A 40 x 20 picture: a pale ground, a grey body, two dark round eyes and a thin dark mouth.
function picture() {
  const w = 40, h = 20, d = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) d.set([245, 240, 205, 255], i * 4)
  const dot = (x0: number, y0: number, x1: number, y1: number, c: number[]) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) d.set([...c, 255], (y * w + x) * 4) }
  dot(5, 3, 34, 18, [140, 140, 140])
  dot(10, 6, 14, 10, [20, 20, 20]); dot(24, 6, 28, 10, [20, 20, 20])
  dot(14, 14, 25, 14, [20, 20, 20])
  return { d, w, h }
}

describe('the clay\'s eyes', () => {
  it('takes the pale ground out and keeps the clay', () => {
    const { d, w, h } = picture()
    keyOut(d, w, h)
    expect(d[3]).toBe(0)
    expect(d[(10 * w + 20) * 4 + 3]).toBe(255)
  })
  it('finds the two round dark eyes and not the thin mouth', () => {
    const { d, w, h } = picture()
    const eyes = eyesOf(darkBlobs(d, w, h), 120)
    expect(eyes).toHaveLength(2)
    expect(eyes.map((e) => e.x0).sort()).toEqual([10, 24])
  })
})

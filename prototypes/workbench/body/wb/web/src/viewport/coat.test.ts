import { describe, expect, it } from 'vitest'
import { albedoOf, COATS, CREAM, lightness, loikaTargets, markingOf } from './coat'

describe('the coat table of the live viewport', () => {
  it('uses the painted master and amber while the file carries no Tint, Shade or Iris', () => {
    const t = loikaTargets({ loika: true })
    expect(t.cell).toBe('between-dark')
    expect(t.coat).toBe('#2e2a2d')
    expect(t.iris).toBe('#c47a2c')
  })
  it('takes the mibi\'s Tint x Shade cell when the file has it, never the land', () => {
    expect(loikaTargets({ loika: true, tint: 'redder', shade: 'light' }).coat).toBe(COATS['redder-light'])
    expect(loikaTargets({ loika: true, tint: 'yellower', shade: 'between', iris: 'copper' }).iris).toBe('#a8562a')
  })
  it('fixes cream on the muzzle, chest, belly, eye ring and toe pads', () => {
    const t = loikaTargets({ loika: true, tint: 'redder', shade: 'dark' })
    expect([t.cream, t.toe, t.ring]).toEqual([CREAM, CREAM, CREAM])
    expect(t.crest).toBe('#757944')
  })
  it('moves a marking +0.08 L on a dark coat and -0.10 L on the rest', () => {
    expect(lightness(markingOf('#2e2a2d', true)) - lightness('#2e2a2d')).toBeCloseTo(0.08, 2)
    expect(lightness(markingOf('#585e67', false)) - lightness('#585e67')).toBeCloseTo(-0.1, 2)
  })
  it('keeps an albedo in range', () => {
    for (const v of albedoOf('cream', CREAM)) expect(v).toBeLessThanOrEqual(1)
  })
})

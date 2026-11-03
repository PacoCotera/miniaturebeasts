import { describe, expect, it } from 'vitest'
import { buildStudioUrl, parseStudioUrl } from './url'

describe('studio url state', () => {
  it('opens on the shape mode at az 32 in clay when the address says nothing else', () => {
    // a missing az used to read as 0: Number(null)
    expect(parseStudioUrl('/studio/S20', '')).toEqual({ species: 'S20', mode: 'shape', sel: null, az: 32, view: 'clay', drawer: null, proof: null, ind: null })
    expect(parseStudioUrl('/studio/S20/shape', '')?.az).toBe(32)
  })
  it('reads the mode, selection, angle, view and drawer', () => {
    expect(parseStudioUrl('/studio/S21/genes', '?sel=spine.tail&az=90&view=wire&drawer=checks')).toEqual({ species: 'S21', mode: 'genes', sel: 'spine.tail', az: 90, view: 'wire', drawer: 'checks', proof: null, ind: null })
  })
  it('falls back for a mode, angle or view it does not know', () => {
    expect(parseStudioUrl('/studio/S20/nonsense', '?az=45&view=plaid')).toMatchObject({ mode: 'shape', az: 32, view: 'clay' })
  })
  it('is not a studio address outside /studio', () => {
    expect(parseStudioUrl('/play/S20', '')).toBeNull()
    expect(parseStudioUrl('/', '')).toBeNull()
  })
  it('leaves defaults out of a link and round-trips the rest', () => {
    const u = { species: 'S20', mode: 'shape', sel: null, az: 32, view: 'clay', drawer: null, proof: null, ind: null } as const
    expect(buildStudioUrl(u)).toBe('/studio/S20/shape')
    const v = { ...u, mode: 'goldens', sel: 'a b', az: 180, view: 'normal', drawer: 'checks', proof: 'tail.size' } as const
    expect(parseStudioUrl(...(buildStudioUrl(v).split('?') as [string, string]).map((x, i) => (i ? '?' + x : x)) as [string, string])).toEqual(v)
  })
})

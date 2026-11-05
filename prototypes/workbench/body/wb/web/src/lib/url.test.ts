import { describe, expect, it } from 'vitest'
import { buildStudioUrl, parseStudioUrl } from './url'

describe('studio url state', () => {
  it('keeps the goldens view in the address, split by default', () => {
    const u = parseStudioUrl('/studio/S20/goldens', '?sel=turn%2Fadult-calm-az90-clay&gv=diff')
    expect(u).toMatchObject({ mode: 'goldens', sel: 'turn/adult-calm-az90-clay', gv: 'diff' })
    expect(buildStudioUrl(u!)).toBe('/studio/S20/goldens?sel=turn%2Fadult-calm-az90-clay&gv=diff')
    expect(parseStudioUrl('/studio/S20/goldens', '?gv=x')?.gv).toBe('split')
  })
  it('opens on the shape mode at az 32 in clay when the address says nothing else', () => {
    // a missing az used to read as 0: Number(null)
    expect(parseStudioUrl('/studio/S20', '')).toEqual({ species: 'S20', mode: 'shape', sel: null, az: 32, view: 'clay', drawer: null, proof: null, ind: null, seed: null, cmp: false, gv: 'split', rd: null })
    expect(parseStudioUrl('/studio/S20/shape', '')?.az).toBe(32)
  })
  it('reads the mode, selection, angle, view and drawer', () => {
    expect(parseStudioUrl('/studio/S21/genes', '?sel=spine.tail&az=90&view=wire&drawer=checks')).toEqual({ species: 'S21', mode: 'genes', sel: 'spine.tail', az: 90, view: 'wire', drawer: 'checks', proof: null, ind: null, seed: null, cmp: false, gv: 'split', rd: null })
  })
  it('falls back for a mode, angle or view it does not know', () => {
    expect(parseStudioUrl('/studio/S20/nonsense', '?az=45&view=plaid')).toMatchObject({ mode: 'shape', az: 32, view: 'clay' })
  })
  it('reads the Variety sheet: a look, a tile, the seed and the run beside it', () => {
    const u = parseStudioUrl('/studio/S20/variety', '?sel=anatomy.tail-tip-form%3Dlantern&ind=7&seed=2027&cmp=1')
    expect(u).toMatchObject({ mode: 'variety', sel: 'anatomy.tail-tip-form=lantern', ind: 7, seed: 2027, cmp: true })
    expect(buildStudioUrl(u!)).toBe('/studio/S20/variety?sel=anatomy.tail-tip-form%3Dlantern&ind=7&seed=2027&cmp=1')
    expect(parseStudioUrl('/studio/S20/variety', '?seed=abc')?.seed).toBeNull()
    expect(parseStudioUrl('/studio/S20/variety', '?seed=0')?.seed).toBe(0)
  })
  it('reads an earlier gate round, only in the gate', () => {
    const u = parseStudioUrl('/studio/S20/gate', '?sel=joins&rd=2')
    expect(u).toMatchObject({ mode: 'gate', sel: 'joins', rd: 2 })
    expect(buildStudioUrl(u!)).toBe('/studio/S20/gate?sel=joins&rd=2')
    expect(buildStudioUrl({ ...u!, mode: 'shape' })).toBe('/studio/S20/shape?sel=joins')
    expect(parseStudioUrl('/studio/S20/gate', '?rd=x')?.rd).toBeNull()
    expect(parseStudioUrl('/studio/S20/gate', '?rd=0')?.rd).toBeNull()
  })
  it('is not a studio address outside /studio', () => {
    expect(parseStudioUrl('/play/S20', '')).toBeNull()
    expect(parseStudioUrl('/', '')).toBeNull()
  })
  it('leaves defaults out of a link and round-trips the rest', () => {
    const u = { species: 'S20', mode: 'shape', sel: null, az: 32, view: 'clay', drawer: null, proof: null, ind: null, seed: null, cmp: false, gv: 'split', rd: null } as const
    expect(buildStudioUrl(u)).toBe('/studio/S20/shape')
    const v = { ...u, mode: 'goldens', sel: 'a b', az: 180, view: 'normal', drawer: 'checks', proof: 'tail.size' } as const
    expect(parseStudioUrl(...(buildStudioUrl(v).split('?') as [string, string]).map((x, i) => (i ? '?' + x : x)) as [string, string])).toEqual(v)
  })
})

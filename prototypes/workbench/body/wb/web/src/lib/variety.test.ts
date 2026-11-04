import { describe, expect, it } from 'vitest'
import { crossCount, failLine, lit, litCount, lookOf, nextSeed, previousKey, ready, type VInd, type VLook, type Variety } from './variety'

const tile = (r: boolean) => ({ key: 'k', ready: r })
const ind = (n: number, r = true, fails: VInd['fails'] = []): VInd => ({ n, genome: `seed:${n}`, hue: 0, loud: [], looks: {}, fails, tiles: { '304': tile(r), '96': tile(r), '48': tile(r) } })
const look = (id: string, who: number[], extra: Partial<VLook> = {}): VLook => ({ id, locus: id.split('=')[0], look: id.split('=')[1], label: id, count: who.length, who, age: null, wild: 40.6, cross: 50, cross_of: 4, rule: null, order: null, modifiers: [], ...extra })
const v: Variety = {
  n: 4, seed: 2026, file_seed: 2026, max_loud: 2, wild_n: 1000, species: 'S20', hash: 'h', key: 'k', ran: true,
  individuals: [ind(1), ind(2, false), ind(3, true, [{ rule: 'ember', label: 'The ember rule', words: 'warm hue with a lit tip and a light belly' }]), ind(4)],
  looks: [look('t=lantern', [1, 3, 4]), look('t=tuft', [2]), look('h=horn', [], { age: 'adult' })], rules: [], failing: [3],
  previous: { key: 'p', t: '2026-11-04T01:35:00', spec_hash: 'x', n: 4, seed: 2026, failing: [], tiles: [{ n: 1, genome: 'seed:1', keys: { '304': 'old1', '96': 'o96' }, fails: [] }] },
}

describe('the Variety sheet', () => {
  it('finds the look the address names and lights only its tiles', () => {
    const l = lookOf(v, 't=lantern')
    expect(l?.count).toBe(3)
    expect([1, 2, 3, 4].map((n) => lit(l, n))).toEqual([true, false, true, true])
    expect(lit(null, 2)).toBe(true)
    expect(lookOf(v, 'nope')).toBeNull()
    expect(litCount(v, l)).toBe(3)
    expect(litCount(v, null)).toBe(4)
  })
  it('counts the tiles that are drawn', () => {
    expect(ready(v)).toBe(3)
  })
  it('writes a failing tile the way words.md does: No. 7 and the rule\'s own words', () => {
    expect(failLine(3, v.individuals[2].fails[0])).toBe('No. 3: warm hue with a lit tip and a light belly')
  })
  it('turns a cross share into seeds of four', () => {
    expect(crossCount(v.looks[0])).toBe(2)
    expect(crossCount(look('a=b', [], { cross: 25 }))).toBe(1)
  })
  it('finds the run before, tile by tile', () => {
    expect(previousKey(v, 1)).toBe('old1')
    expect(previousKey(v, 1, '96')).toBe('o96')
    expect(previousKey(v, 2)).toBeNull()
    expect(previousKey({ ...v, previous: null }, 1)).toBeNull()
  })
  it('draws the next seed for a new sheet', () => {
    expect(nextSeed(v, null)).toBe(2027)
    expect(nextSeed(v, 7)).toBe(8)
    expect(nextSeed(undefined, null)).toBe(1)
  })
})

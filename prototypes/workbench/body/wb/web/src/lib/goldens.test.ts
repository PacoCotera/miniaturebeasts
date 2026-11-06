import { describe, expect, it } from 'vitest'
import { groupsOf, pctText, pick, stateTip, stateWord, totalsLine, type Goldens } from './goldens'

const e = (id: string, state: 'same' | 'changed' | 'stale' | 'missing', group?: string, label = id) => ({ id, state, group, label })
const g = (entries: ReturnType<typeof e>[]): Goldens => ({ species: 'S20', have: true, release: false, current: { file: 'f', framework: 'w', lookdev: 'l', key: 'k' }, entries, totals: { same: 2, changed: 1, missing: 0, stale: 3, all: 6 }, stamp: null, causes: [], diffed: null })

describe('goldens', () => {
  it('says the totals in one quiet line and leaves out a state with none', () => {
    expect(totalsLine(g([]).totals)).toBe('2 same · 1 changed · 3 stale')
    expect(totalsLine({ same: 19, changed: 0, missing: 0, stale: 0, all: 19 })).toBe('19 same')
  })
  it('shows the id missing as New, and says what New and Stale mean', () => {
    expect(stateWord('missing')).toBe('New')
    expect(totalsLine({ same: 6, changed: 13, missing: 1, stale: 2, all: 22 })).toBe('6 same · 13 changed · 1 new · 2 stale')
    expect(stateTip('missing')).toBe('New to the set · no golden yet')
    expect(stateTip('stale')).toBe('The file moved on · not compared yet')
    expect(stateTip('same')).toBe('Same')
  })
  it('groups by where the game draws the picture, in the order met', () => {
    const x = g([e('stand/a', 'same', 'Habitat, Sitting'), e('card/a', 'same', 'Cards, Library'), e('habitat/a', 'same', 'Habitat, Sitting'), e('stand/shadow', 'same')])
    expect(groupsOf(x).map((r) => [r.name, r.rows.length])).toEqual([['Habitat, Sitting', 2], ['Cards, Library', 1]])
  })
  it('opens on the picked golden, else the first changed one, else the first', () => {
    const x = g([e('a', 'same', 'G'), e('b', 'changed', 'G'), e('c', 'same', 'G')])
    expect(pick(x, 'c')?.id).toBe('c')
    expect(pick(x, null)?.id).toBe('b')
    expect(pick(g([e('a', 'same', 'G')]), 'zz')?.id).toBe('a')
  })
  it('writes the share of pixels moved with the digits it needs', () => {
    expect([pctText(3.14159), pctText(0.123), pctText(31.2)]).toEqual(['3.1%', '0.12%', '31%'])
  })
})

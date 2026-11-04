import { describe, expect, it } from 'vitest'
import { groupsOf, pctText, pick, totalsLine, type Goldens } from './goldens'

const e = (id: string, state: 'same' | 'changed' | 'stale' | 'missing', group?: string, label = id) => ({ id, state, group, label })
const g = (entries: ReturnType<typeof e>[]): Goldens => ({ species: 'S20', have: true, release: false, current: { file: 'f', framework: 'w', lookdev: 'l', key: 'k' }, entries, totals: { same: 2, changed: 1, missing: 0, stale: 3, all: 6 }, stamp: null, causes: [], diffed: null })

describe('goldens', () => {
  it('says the totals in one quiet line and leaves out a state with none', () => {
    expect(totalsLine(g([]).totals)).toBe('2 same · 1 changed · 3 stale')
    expect(totalsLine({ same: 19, changed: 0, missing: 0, stale: 0, all: 19 })).toBe('19 same')
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

import { describe, expect, it } from 'vitest'
import { isReady, isSculpt, nextId, pathWord, validId, type FamilyCard } from './families'

describe('family cards', () => {
  it('a card is ready only when its family has a template; "From a sculpt" is a card that is not yet', () => {
    const ready: FamilyCard = { id: 'trotter', name: 'trotter', state: 'ready' }
    const not: FamilyCard = { id: 'hopper', name: 'hopper', state: 'not yet' }
    const sculpt: FamilyCard = { id: 'sculpt', name: 'From a sculpt', state: 'not yet' }
    expect([isReady(ready), isReady(not), isReady(sculpt), isSculpt(sculpt), isSculpt(ready)]).toEqual([true, false, false, true, false])
  })
  it('the next id is S and two digits above every id there is, and an id has that shape', () => {
    expect(nextId(['S20', 'S22', 'M0001'])).toBe('S23')
    expect(nextId([])).toBe('S01')
    expect(validId('S23') && !validId('23') && !validId('S2') && !validId('S234')).toBe(true)
  })
  it('names the path in plain words', () => {
    expect([pathWord('mesh'), pathWord('hybrid'), pathWord('cage'), pathWord(undefined)]).toEqual(['Sculpt', 'Sculpt and rig', 'Cage', ''])
  })
})

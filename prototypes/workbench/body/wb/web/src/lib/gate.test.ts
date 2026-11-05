import { describe, expect, it } from 'vitest'
import { allTicked, canJudge, current, isEarlier, isOpen, pickSheet, shown, turn, voidedNames, type Gate, type Round } from './gate'
import { W } from './words'

const sheets = ['turnaround', 'before-after', 'joins', 'twelve', 'motion', 'close-up'].map((id, i) => ({ id, label: id, tick: i < 2 }))
const round = (over: Partial<Round> = {}): Round => ({ round: 3, file_hash: 'ab', asked_by: 'dev', asked_at: '2026-11-05T10:00:00', note: '', reviewer: null, owner: null, verdict: null, voided: null, sheets, state: { live: true, reviewer_valid: false, owner_valid: false, signed: false, voided: false, ticked: 2 }, ...over })

describe('the gate screen rules', () => {
  it('only a reviewer or the owner that is not an agent can judge', () => {
    expect(canJudge({ name: 'r', role: 'reviewer', agent: false })).toBe(true)
    expect(canJudge({ name: 'o', role: 'owner', agent: false })).toBe(true)
    expect(canJudge({ name: 'm', role: 'maker', agent: false })).toBe(false)
    expect(canJudge({ name: 'a', role: 'owner', agent: true })).toBe(false)
    expect(canJudge(undefined)).toBe(false)
  })
  it('the turn goes reviewer, owner, done, and a closed or voided round has none', () => {
    expect(turn(round())).toBe('reviewer')
    const sig = { name: 'r', at: 't', hash: 'ab' }
    expect(turn(round({ reviewer: sig }))).toBe('owner')
    expect(turn(round({ reviewer: sig, owner: sig }))).toBe('done')
    expect(turn(round({ verdict: 'back' }))).toBeNull()
    expect(turn(round({ reviewer: sig, state: { ...round().state, live: false, voided: true } }))).toBeNull()
    expect(isOpen(null)).toBe(false)
  })
  it('the stage shows the sheet in the URL, else the first not ticked', () => {
    expect(pickSheet(round(), 'motion')?.id).toBe('motion')
    expect(pickSheet(round(), null)?.id).toBe('joins')
    expect(pickSheet(round(), 'nope')?.id).toBe('joins')
    expect(allTicked(round())).toBe(false)
    expect(allTicked(round({ state: { ...round().state, ticked: 6 } }))).toBe(true)
  })
  it('an earlier round can be looked at, and the current one is shown when the address names none or names the current', () => {
    const g: Gate = { species: 'S20', hash: 'ab', rounds: [round({ round: 1 }), round({ round: 2 }), round()], current: 3, signed: false, building: false }
    expect(shown(g, 2)?.round).toBe(2)
    expect(shown(g, null)?.round).toBe(3)
    expect(shown(g, 3)?.round).toBe(3)
    expect(shown(g, 9)?.round).toBe(3)
    expect(isEarlier(g, shown(g, 1))).toBe(true)
    expect(isEarlier(g, shown(g, null))).toBe(false)
    expect(shown(undefined, 1)).toBeNull()
  })
  it('the voided line names who changed the file and whose signatures it voided', () => {
    const sig = (name: string) => ({ name, at: 't', hash: 'ab' })
    expect(voidedNames(round({ reviewer: sig('Ana'), owner: sig('Beto') }))).toEqual(['Ana', 'Beto'])
    expect(voidedNames(round({ reviewer: sig('Ana') }))).toEqual(['Ana'])
    expect(W.gate.voided('Dev', ['Ana', 'Beto'])).toBe('Changed after signing by Dev · signatures of Ana and Beto are void')
    expect(W.gate.voided(null, [])).toBe('Changed after signing · both signatures are void')
  })
  it('the current round is the one the server names', () => {
    const g: Gate = { species: 'S20', hash: 'ab', rounds: [round({ round: 2 }), round()], current: 3, signed: false, building: false }
    expect(current(g)?.round).toBe(3)
    expect(current(undefined)).toBeNull()
  })
})

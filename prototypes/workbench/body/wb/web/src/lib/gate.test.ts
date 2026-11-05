import { describe, expect, it } from 'vitest'
import { allTicked, canJudge, current, isOpen, pickSheet, turn, type Gate, type Round } from './gate'

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
  it('the current round is the one the server names', () => {
    const g: Gate = { species: 'S20', hash: 'ab', rounds: [round({ round: 2 }), round()], current: 3, signed: false, building: false }
    expect(current(g)?.round).toBe(3)
    expect(current(undefined)).toBeNull()
  })
})

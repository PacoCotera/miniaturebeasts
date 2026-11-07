import { describe, expect, it } from 'vitest'
import { Matrix4, Vector3 } from 'three'
import fix from './fan.fixture.json'
import { fanPlacements, placeMatrix, signatureCount, type FanLayout } from './fan'
import { axisOf, poseBones, scaleOf, scalesOf } from './rig'

describe('the fan of a part on its socket', () => {
  it('agrees with meshbody.fan_placements for every count of Loika crest', () => {
    for (const [n, want] of Object.entries(fix.cases)) {
      const got = fanPlacements(Number(n), fix.size, fix.H, fix.layout as FanLayout)
      expect(got).toHaveLength(want.length)
      got.forEach((p, i) => {
        // Matrix3.elements is column-major, numpy's rows are row-major
        const rows = [0, 1, 2].map((r) => [0, 1, 2].map((c) => p.R.elements[c * 3 + r]))
        rows.forEach((row, r) => row.forEach((v, c) => expect(v).toBeCloseTo(want[i].R[r][c], 9)))
        expect(p.off.toArray()).toEqual(want[i].off.map((v) => expect.closeTo(v, 9)))
        expect(p.L).toBeCloseTo(want[i].L, 9)
      })
    }
  })

  it('puts a unit at the socket in the scene frame: the socket point (x, y, z) becomes (x, z, -y), a vertex of the part keeps its length', () => {
    const p = fanPlacements(1, 0.34, 2.22291, fix.layout as FanLayout)[0]
    const m = placeMatrix(p, [0.64097, 0.0, 2.22291])
    const at = new Vector3(0, 0, 0).applyMatrix4(m)
    expect(at.x).toBeCloseTo(0.64097, 5)
    expect(at.y).toBeCloseTo(2.22291 - fix.layout.sink * p.L, 5) // sunk below the socket point
    expect(at.z).toBeCloseTo(0, 5)
    const tip = new Vector3(0, 1, 0).applyMatrix4(m).sub(at) // the part's length axis (glTF y) is the unit's length
    expect(tip.length()).toBeCloseTo(p.L, 6)
  })

  it('reads the count as a number or a band [lo, hi, type]', () => {
    expect(signatureCount({ signature: { count: [1, 5, 3] } })).toBe(3)
    expect(signatureCount({ signature: { count: 4 } })).toBe(4)
    expect(signatureCount({})).toBe(3)
  })
})

describe('the rig on the studio GLB', () => {
  it('reads the file bones and leaves a bone it does not list at one', () => {
    const s = scalesOf({ bones: [{ id: 'head', len: 1.1, girth: 0.9 }, { id: 'rear' }] })
    expect(s.head).toEqual({ len: 1.1, girth: 0.9 })
    expect(s.rear).toEqual({ len: 1, girth: 1 })
    expect(scaleOf('front', undefined).toArray()).toEqual([1, 1, 1])
  })

  it('scales a torso bone along x, a leg bone along y', () => {
    expect(axisOf('rear')).toBe(0)
    expect(axisOf('hind.upper.L')).toBe(1)
    expect(scaleOf('head', { len: 2, girth: 0.5 }).toArray()).toEqual([2, 0.5, 0.5])
    expect(scaleOf('fore.paw.R', { len: 2, girth: 0.5 }).toArray()).toEqual([0.5, 2, 0.5])
  })

  it('carries a child joint by the parent scale and keeps the child at its own size (meshrig.matrices)', () => {
    // a leg of three bones hanging from a hip at height 3: upper at 3, lower at 2, paw at 1
    const bind = [3, 2, 1].map((y) => new Matrix4().makeTranslation(0, y, 0))
    const names = ['hind.upper.L', 'hind.lower.L', 'hind.paw.L']
    const parent = [null, 0, 1]
    const D = poseBones(names, parent, bind, { 'hind.upper.L': { len: 1.5, girth: 1 }, 'hind.lower.L': { len: 1.5, girth: 1 }, 'hind.paw.L': { len: 1, girth: 1 } })
    // the hip stays; the lower joint moves 1 down to 1.5 down; the paw joint: lower joint + 1 * 1.5
    const joint = (i: number) => new Vector3(0, 0, 0).applyMatrix4(D[i].clone().multiply(bind[i].clone().invert()).multiply(bind[i])).setFromMatrixPosition(D[i])
    expect(joint(0).y).toBeCloseTo(3, 9)
    expect(joint(1).y).toBeCloseTo(3 - 1.5, 9)
    expect(joint(2).y).toBeCloseTo(3 - 1.5 - 1.5, 9)
    // a point at the paw's own joint is carried to the paw's joint; a point 1 below it moves 1 (the paw's own scale is 1), not 1.5
    const skin = (i: number, y: number) => new Vector3(0, y, 0).applyMatrix4(D[i].clone().multiply(bind[i].clone().invert()))
    expect(skin(2, 1).y).toBeCloseTo(0, 9)
    expect(skin(2, 0).y).toBeCloseTo(-1, 9)
    // a point 1 below the lower joint moves 1.5 (its own scale)
    expect(skin(1, 1).y).toBeCloseTo(3 - 1.5 - 1.5, 9)
  })
})

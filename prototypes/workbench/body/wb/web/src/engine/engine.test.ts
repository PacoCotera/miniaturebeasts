// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CATALOGUE } from '@framework/catalogue.mjs'
import { generator } from './numpy-rng.mjs'
import { pyRandom, sha512 } from './py-random.mjs'
import { pyRound, rint } from './pymath.mjs'
import { draw, genomeOf, specimen } from './genes.mjs'
import { context, freq, looksOf, typeCopies, wild } from './expressions.mjs'
import { catalogue, freqOf, meshCopies, sheet } from './index.mjs'
import fixture from './parity.fixture.json'

const here = import.meta.dirname
const file = (id: string) => JSON.parse(readFileSync(join(here, '../../../../species_v1', `${id}.json`), 'utf8'))
const pin = JSON.parse(readFileSync(join(here, '../../../../species_v1/catalogue-pin.json'), 'utf8'))

describe('the streams are numpy and Python', () => {
  // Reference values from numpy 2 (np.random.Generator(np.random.PCG64([2026, 5]))) and CPython (random.Random('S01:2026:3')).
  it('PCG64 doubles, bounded draws and weighted choices', () => {
    const r = generator([2026, 5])
    expect([r.random(), r.random(), r.random()]).toEqual([0.06142777344613537, 0.09602883532496931, 0.3655387572945443])
    expect(Array.from({ length: 6 }, () => r.integers2())).toEqual([0, 0, 1, 0, 1, 0])
    expect(Array.from({ length: 6 }, () => r.choiceP(['a', 'b', 'c'], [0.4, 0.3, 0.3]))).toEqual(['a', 'a', 'a', 'c', 'a', 'a'])
    expect([r.random(), r.random()]).toEqual([0.8667878087272853, 0.0331509446973991])
    const w = generator([20, 9])
    expect([w.random(), w.random(), w.random()]).toEqual([0.14639370024772524, 0.7274858792118698, 0.0950503036223368])
    const x = generator([20, 4, 1])
    expect(Array.from({ length: 5 }, () => x.integers2())).toEqual([0, 1, 1, 1, 1])
  })
  it("Python's text-seeded Mersenne Twister", () => {
    const r = pyRandom('S01:2026:3')
    expect([r.random(), r.random(), r.random(), r.random()]).toEqual([0.9402912213187322, 0.31467549193069577, 0.28110862518636304, 0.8291246086238122])
    const hex = [...sha512(new TextEncoder().encode('abc'))].map((b) => b.toString(16).padStart(2, '0')).join('')
    expect(hex.startsWith('ddaf35a193617aba')).toBe(true)
  })
  it("Python's rounding: half to even, and the nearest double", () => {
    expect([rint(0.5), rint(1.5), rint(2.5), rint(-0.5)]).toEqual([0, 2, 2, -0])
    expect([pyRound(0.03125, 4), pyRound(0.125, 2), pyRound(2.675, 2), pyRound(0.00005, 4)]).toEqual([0.0312, 0.12, 2.67, 0.0001])
  })
})

describe('the catalogue is the game\'s', () => {
  it('is the catalogue the pin was written from', () => {
    expect(catalogue).toEqual({ id: pin.id, version: pin.version, digest: pin.digest })
    expect(CATALOGUE.loci.length).toBe(pin.loci.length)
  })
})

describe('draws and counts equal what Python made (tests/test_wb_studio_parity.py writes the fixture)', () => {
  const fx = fixture as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
  it('the Variety sheet of Tuliko: twelve individuals, their hues, the rules and the look counts', () => {
    const s = sheet(file('S20'))!
    expect(s).toEqual(fx.S20.sheet)
    expect(s.individuals.map((i) => i.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(s.individuals.slice(0, 3).map((i) => i.hue)).toEqual([270.0, 314.237, 323.39])
    expect(s.failing).toEqual([])
    expect(s.rules.map((r) => r.id)).toEqual(['ember'])
  })
  for (const id of ['S01', 'S20', 'S22']) {
    it(`${id}: how often each look shows`, () => {
      expect(freqOf(file(id))).toEqual({ species: id, ...fx[id].freq })
    })
    it(`${id}: 1,000 wild draws show the same looks as often`, () => {
      const g = file(id).genome, ctx = context(g)
      const ws = wild(g, 1000, 20, true, ctx)
      expect(ws.slice(0, 12)).toEqual(fx[id].wild_first)
      const counts: Record<string, Record<string, number>> = {}
      for (const c of ws) for (const [i, v] of Object.entries(looksOf(g, c, ctx))) { const k = v === null ? 'asleep' : (v as string); (counts[i] ??= {})[k] = (counts[i][k] ?? 0) + 1 }
      expect(counts).toEqual(fx[id].wild_counts)
    })
  }
  it('S20: 1,000 seed draws are the same genomes and show the same looks as often', () => {
    const doc = file('S20'), g = doc.genome, ctx = context(g)
    const counts: Record<string, Record<string, number>> = {}
    const first: unknown[] = []
    for (let i = 1; i <= 1000; i++) {
      const c: Record<string, unknown[]> = typeCopies(g)
      for (const [k, x] of Object.entries(genomeOf(draw(i, 2026)) as Record<string, unknown[]>)) if (k in c) c[k] = [...x]
      if (i <= 12) first.push(c)
      for (const [l, v] of Object.entries(looksOf(g, c, ctx))) { const k = v === null ? 'asleep' : (v as string); (counts[l] ??= {})[k] = (counts[l][k] ?? 0) + 1 }
    }
    expect(first).toEqual(fx.S20.draws_first)
    expect(counts).toEqual(fx.S20.draws_counts)
  })
  it('S01: 1,000 mesh draws', () => {
    const doc = file('S01'), g = doc.genome, ctx = context(g)
    const counts: Record<string, Record<string, number>> = {}
    const first: unknown[] = []
    for (let i = 1; i <= 1000; i++) {
      const { copies } = meshCopies(doc, i, doc.variety?.seed ?? 2026)
      if (i <= 12) first.push(copies)
      for (const [l, v] of Object.entries(looksOf(g, copies, ctx))) { const k = v === null ? 'asleep' : (v as string); (counts[l] ??= {})[k] = (counts[l][k] ?? 0) + 1 }
    }
    expect(first).toEqual(fx.S01.draws_first)
    expect(counts).toEqual(fx.S01.draws_counts)
  })
  it('the type is the first of the sheet, and a kind with no sampler has no sheet', () => {
    expect((genomeOf(specimen()) as Record<string, unknown>)['form.ear-kind']).toEqual(['prick', 'prick'])
    expect(sheet(file('S01'))).toBeNull()
    expect(sheet(file('S22'))).toBeNull()
    expect(freqOf({ id: 'X', genome: null })).toBeNull()
  })
  it('a draw is the same every time, and an edit to a weight moves the counts', () => {
    const g = file('S20').genome
    expect(freq(g, [], 100, 20, 'S20')).toEqual(freq(g, [], 100, 20, 'S20'))
    const g2 = structuredClone(g)
    const sw = g2.loci.find((l: { op: string; weight?: number }) => l.op === 'switch' && l.weight !== undefined)
    sw.weight = 0.99
    expect(JSON.stringify(freq(g2, [], 200, 20, 'S20'))).not.toBe(JSON.stringify(freq(g, [], 200, 20, 'S20')))
  })
})

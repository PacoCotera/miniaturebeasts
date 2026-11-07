import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fieldMeta, nodeAt, schemaPathOfPtr, validateSpecies, walkSchema, SCHEMAS } from './speciesSchema'

// The round trip (R3): the page's zod schema takes S01 (a mesh body), S20 (a /1 fixture) and S22 as the server does, and refuses each broken copy at the field the server names
// (src/generated/roundtrip.json, made by wb/roundtrip.py from the server's own validate).
const BODY = join(import.meta.dirname, '../../../..')
const load = (sid: string) => JSON.parse(readFileSync(join(BODY, 'species_v1', `${sid}.json`), 'utf8'))
type Edit = ['set', string, unknown] | ['del', string]
const apply = (doc: Record<string, unknown>, edits: Edit[]) => {
  for (const e of edits) {
    const toks = e[1].split('.')
    let cur: any = doc // eslint-disable-line @typescript-eslint/no-explicit-any
    for (const t of toks.slice(0, -1)) cur = cur[t]
    const k = toks[toks.length - 1]
    if (e[0] === 'set') cur[k] = e[2]
    else delete cur[k]
  }
  return doc
}
const fixtures = JSON.parse(readFileSync(join(import.meta.dirname, '../generated/roundtrip.json'), 'utf8')) as { good: string[]; broken: { name: string; base: string; edits: Edit[]; server: [string, string][] }[] }

describe('the zod schema made from the server schema', () => {
  it.each(fixtures.good)('accepts %s as the server does', (sid) => {
    expect(validateSpecies(load(sid))).toEqual([])
  })

  it.each(fixtures.broken.map((b) => [b.name, b] as const))('refuses %s at the fields the server names', (_name, b) => {
    const doc = apply(load(b.base), b.edits)
    const here = validateSpecies(doc).map((p) => p.path)
    const server = [...new Set(b.server.map(([p]) => p))]
    expect(server.length).toBeGreaterThan(0)
    for (const p of server) expect(here, `the server names ${p}`).toContain(p)
    expect([...new Set(here)].sort()).toEqual([...server].sort())
  })

  it('says a fault in the server’s words', () => {
    const say = (name: string) => validateSpecies(apply(load(fixtures.broken.find((b) => b.name === name)!.base), fixtures.broken.find((b) => b.name === name)!.edits)).map((p) => p.message)
    expect(say('not-a-number')).toEqual(['spine.seat.radius: must be a number, got text'])
    expect(say('vec3-short')).toEqual(['skeleton.chest: must be three numbers (x, y, z), got a list'])
    expect(say('bad-enum')[0]).toBe("anchors.body: 'loose' is not one of wide, tight")
    expect(say('tail-too-long')[0]).toBe('spine.tail.length is 9 H; the quadruped plan allows 0.6 to 2.4')
  })

  it('says why a refused key is refused, in the schema’s own words', () => {
    const doc = apply(load('S22'), [['set', 'face.cheeks', { blush: 1 }]])
    expect(validateSpecies(doc).find((p) => p.path === 'face.cheeks')?.message).toContain('no blush')
  })

  it('has the plan’s band for a field that names one, and none for another plan’s key', () => {
    expect(fieldMeta('mb-species/2', 'spine.tail.length', 'quadruped')?.range).toEqual([0.6, 2.4])
    expect(fieldMeta('mb-species/2', 'spine.tail.length')?.range).toBeNull()
    expect(fieldMeta('mb-species/2', 'spine.tail.curl.turns')?.range).toEqual([-0.5, 1])
  })

  it('reads a pointer in the file as the schema’s path, so the mesh fields have their words', () => {
    expect(schemaPathOfPtr('/rig/bones/3/len')).toBe('rig.bones[].len')
    expect(schemaPathOfPtr('/keys/0/amount')).toBe('keys[].amount')
    expect(fieldMeta('mb-species/2', schemaPathOfPtr('/rig/bones/3/girth'))).toMatchObject({ label: 'Girth', kind: 'number' })
    expect(nodeAt('mb-species/2', 'mesh.parts[].socket')?.title).toBe('Socket')
  })

  it('has a label and a help line on every field of both schemas', () => {
    for (const { json } of Object.values(SCHEMAS)) for (const [p, n] of walkSchema(json)) {
      expect(n.title, p).toBeTruthy()
      expect(n.description, p).toBeTruthy()
    }
  })
})

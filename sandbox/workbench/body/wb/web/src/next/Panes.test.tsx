import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import STUDIO from '../../../studio-words.json'
import type { Forms } from '../lib/forms'
import { nodeAt, SCHEMAS, walkSchema } from '../lib/speciesSchema'
import { W, checkWords } from '../lib/words'
import { FieldsPane, PartsPane, firstPart } from './Panes'

const BODY = join(import.meta.dirname, '../../../..')
const S01 = JSON.parse(readFileSync(join(BODY, 'species_v1', 'S01.json'), 'utf8')) as Record<string, unknown>
const FIX = JSON.parse(readFileSync(join(import.meta.dirname, '../generated/roundtrip.json'), 'utf8')) as { forms_S01: Forms }
const forms = FIX.forms_S01
afterEach(cleanup)

describe("Loika's fields in the new inspector, read only", () => {
  it('lists the parts the server outlines, and picks the first part that is not a section', () => {
    expect(forms.outline.map((r) => r.label)).toEqual(['Head', 'Body', 'Front legs', 'Hind legs', 'Coat', 'Renders'])
    expect(firstPart(forms)).toBe('head')
    let picked = ''
    render(<PartsPane forms={forms} sel="head" rail={false} onSelect={(id) => { picked = id }} />)
    expect(screen.getByRole('button', { name: 'Head' }).getAttribute('aria-current')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Body' }))
    expect(picked).toBe('body')
  })

  it('shows each field of the part with its label and value, and the schema’s help line under it', () => {
    render(<FieldsPane file={S01} forms={forms} sel="body" />)
    const rows = forms.parts.body.fields
    expect(rows.length).toBeGreaterThan(4)
    for (const f of rows) {
      const input = screen.getByLabelText(f.label, { selector: `#r3-${CSS.escape(f.id)}` }) as HTMLInputElement
      expect(input.readOnly).toBe(true)
      expect(input.value).not.toBe('')
    }
    expect(screen.getAllByText("The bone's scale along its length.").length).toBe(rows.filter((f) => f.ptr.endsWith('/len')).length)
  })

  it('marks a field the schema refuses, with the message, before any save', async () => {
    const bad = structuredClone(S01) as { rig: { bones: { len: unknown }[] } }
    const i = Number(forms.parts.head.fields[0].ptr.split('/')[3])
    bad.rig.bones[i].len = 'long'
    render(<FieldsPane file={bad} forms={forms} sel="head" />)
    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0))
  })

  it('says nothing is there to set on a part with no fields, and never shows a placeholder word', () => {
    render(<FieldsPane file={S01} forms={forms} sel="coat" />)
    expect(screen.getByText(W.nothing)).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/OWED/)
  })
})

describe('the copywriter’s words', () => {
  it('are every species label and help line of the served schema, on the field they name', () => {
    const rows = Object.entries(STUDIO).filter(([k]) => k.startsWith('species.field.'))
    expect(rows.length).toBe(18)
    for (const [k, v] of rows) {
      const [path, what] = [k.slice('species.field.'.length, k.lastIndexOf('.')), k.slice(k.lastIndexOf('.') + 1)]
      const n = nodeAt('mb-species/2', path)
      expect(n, path).toBeTruthy()
      expect(what === 'label' ? n.title : n.description, k).toBe(v)
    }
  })

  it('leave no OWED placeholder in the schema, the studio’s words or the sheets', () => {
    for (const { json } of Object.values(SCHEMAS)) for (const [p, n] of walkSchema(json)) expect(`${n.title} ${n.description}`, p).not.toMatch(/OWED/)
    for (const [k, v] of Object.entries(STUDIO)) expect(v, k).not.toMatch(/OWED/)
    expect(Object.values(W.newSpecies)).toEqual(['New species: pick a body', 'Id', 'Create species', 'Ready'])
    expect(W.gate.language).toEqual({ noReference: 'No wall or stand picture yet', rowsHeading: 'Judged by eye' })
  })

  it('give every one of the 66 checks of the face, body, mesh and roster lists a name and a fail line', () => {
    const ids = Object.keys(STUDIO).filter((k) => /^check\..*\.name$/.test(k)).map((k) => k.slice(6, -5))
    expect(ids.length).toBe(33)
    for (const id of ids) expect(checkWords(id), id).toMatchObject({ name: expect.any(String), fail: expect.any(String) })
    expect(checkWords('face.lid')).toEqual({ name: 'Calm lids', fail: 'A lid droops or looks sleepy' })
    expect(checkWords('tail.size')).toBeUndefined()
  })

  it('are the 104 strings of the copywriter’s studio list', () => {
    expect(Object.keys(STUDIO).length).toBe(104)
  })
})

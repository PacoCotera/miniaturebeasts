import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it } from 'vitest'
import { isMesh, type Forms } from '../lib/forms'
import type { Species } from '../lib/api'
import type { StudioUrl } from '../lib/url'
import { Navigator } from './Navigator'

afterEach(cleanup)

// Loika (S01) is a mesh body: the server's outline for it holds no spine range and no cage part, and the page lists what the server says.
const forms: Forms = {
  plan: 'quadruped',
  outline: [
    { id: 'head', label: 'Head', kind: 'part', under: null, sw: null }, { id: 'body', label: 'Body', kind: 'part', under: null, sw: null },
    { id: 'coat', label: 'Coat', kind: 'section', under: null, sw: null }, { id: 'renders', label: 'Renders', kind: 'section', under: null, sw: null },
  ],
  parts: {},
}
const url: StudioUrl = { species: 'S01', mode: 'shape', sel: null, az: 90, view: 'clay', drawer: null, proof: null, ind: null, seed: null, cmp: false, gv: 'split', rd: null }
const species = { id: 'S01', hash: 'h', file: { name: 'Loika', mesh: { source: 'meshes/S01/S01-m2.json' } } } as unknown as Species

describe('a mesh body in Shape', () => {
  it('is told from a cage file by its mesh block', () => {
    expect(isMesh(species.file)).toBe(true)
    expect(isMesh({ spine: {}, skeleton: {}, parts: [] })).toBe(false)
    expect(isMesh(undefined)).toBe(false)
  })
  it('lists no spine range for it: the cage-only rows are not offered', () => {
    const qc = new QueryClient()
    qc.setQueryData(['forms', 'S01'], forms)
    render(<QueryClientProvider client={qc}><Navigator rail={false} url={url} go={() => {}} rows={[]} metas={{}} species={species} /></QueryClientProvider>)
    const names = screen.getAllByRole('button').map((b) => b.getAttribute('title'))
    expect(names).toEqual(['Head', 'Body', 'Coat', 'Renders'])
    for (const cage of ['Neck', 'Back', 'Seat', 'Tail', 'Ears', 'Legs']) expect(names).not.toContain(cage)
  })
})

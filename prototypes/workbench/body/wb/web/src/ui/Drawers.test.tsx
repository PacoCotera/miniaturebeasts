import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Entry, Species } from '../lib/api'
import type { StudioUrl } from '../lib/url'
import { FileDrawer, HistoryDrawer } from './Drawers'

const revert = vi.fn()
vi.mock('../lib/api', async (orig) => ({ ...(await orig<typeof import('../lib/api')>()), getToken: () => 't', revertSpecies: (...a: unknown[]) => revert(...a) }))

const e = (t: string, actor: string, via: string, old: string, nw: string, h: string, agent = false): Entry => ({ t, actor, role: 'maker', agent, via, op: 'replace', path: '/parts/1/socket/join', old, new: nw, hash_before: 'a', hash_after: h })
const log = [e('2026-11-04T10:00:00.000+00:00', 'local', 'api', 'hard', 'soft', 'h1'), e('2026-11-04T10:01:00.000+00:00', 'agent-1', 'undo', 'soft', 'hard', 'h2', true)]
const file = { name: 'Tuliko', parts: [{ id: 'torso' }, { id: 'ear.L', socket: { join: 'hard' } }] }
const sp = { id: 'S20', hash: 'h2', error: null, lease: null, history: log, views: [], checks: null, file } as unknown as Species
const url = { species: 'S20', mode: 'shape', sel: null, drawer: 'history' } as StudioUrl
const wrap = (ui: React.ReactNode, qc = new QueryClient()) => { qc.setQueryData(['history', 'S20', 'h2'], { entries: log, undo: false, redo: true }); return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>) }

afterEach(cleanup)
beforeEach(() => revert.mockReset())
describe('the History drawer', () => {
  it('lists every entry newest first, each with its actor, the edit and the undo that took it back', () => {
    wrap(<HistoryDrawer species={sp} url={url} go={() => {}} />)
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0].textContent).toContain('agent-1')
    expect(rows[0].textContent).toContain('soft → hard')
    expect(rows[0].textContent).toContain('undid')
    expect(rows[0].querySelector('span[class*=tag]')).toBeNull()
    expect(rows[1].textContent).toContain('local')
    expect(rows[1].textContent).toContain('hard → soft')
  })
  it('redoes through the server and says its refusal on the drawer', async () => {
    revert.mockRejectedValueOnce(Object.assign(new Error('/parts/1/socket/join is "soft", not "hard": the file changed under you'), { status: 409 }))
    wrap(<HistoryDrawer species={sp} url={url} go={() => {}} />)
    const undoBtn = screen.getAllByRole('button', { name: 'Undo' }).find((b) => b.tagName === 'BUTTON' && (b as HTMLButtonElement).disabled !== undefined)!
    expect((undoBtn as HTMLButtonElement).disabled).toBe(true)      // the log says there is nothing left to undo
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Redo' })) })
    expect(revert).toHaveBeenCalledWith('S20', 'redo')
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
  })
  it('switches between the three drawers by name', () => {
    const go = vi.fn()
    wrap(<HistoryDrawer species={sp} url={url} go={go} />)
    fireEvent.click(screen.getByRole('tab', { name: 'File (JSON)' }))
    expect(go).toHaveBeenCalledWith({ drawer: 'file', proof: null })
  })
})
describe('the File drawer', () => {
  it('shows the file as it is, line by line, read-only', () => {
    wrap(<FileDrawer species={sp} url={{ ...url, drawer: 'file' }} go={() => {}} />)
    const code = screen.getByLabelText('The species file as JSON, read-only')
    expect(code.textContent).toContain('"join": "hard"')
    expect(code.querySelector('textarea,input')).toBeNull()
  })
})

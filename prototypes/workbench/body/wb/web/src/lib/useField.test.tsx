import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, type Species } from './api'
import { isOwn } from './edits'
import { useField } from './useField'

const patch = vi.fn()
vi.mock('./api', async (orig) => ({ ...(await orig<typeof import('./api')>()), patchSpecies: (...a: unknown[]) => patch(...a) }))

const species = (len: number): Species => ({ id: 'S20', hash: 'h', error: null, lease: null, history: [], views: [], checks: null, file: { spine: { tail: { length: len } } } as unknown as Species['file'] })
const wrap = (qc: QueryClient) => ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
const PTR = '/spine/tail/length'

describe('a field that saves itself', () => {
  beforeEach(() => { vi.useFakeTimers(); patch.mockReset(); patch.mockResolvedValue({ hash: 'h2' }) })
  afterEach(() => { vi.useRealTimers() })

  it('shows the new value at once and saves once, 0.6 s after the last change, with a test of the old value', async () => {
    const qc = new QueryClient()
    qc.setQueryData(['species', 'S20'], species(1.1))
    const { result } = renderHook(() => useField<number>(species(1.1), 'S20', PTR), { wrapper: wrap(qc) })
    expect(result.current.value).toBe(1.1)
    act(() => result.current.set(1.15))
    act(() => { vi.advanceTimersByTime(400) })
    act(() => result.current.set(1.2))
    act(() => result.current.set(1.24))
    expect(result.current.value).toBe(1.24)               // optimistic: nothing has been sent yet
    expect(patch).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(599) })
    expect(patch).not.toHaveBeenCalled()
    await act(async () => { vi.advanceTimersByTime(2) })
    expect(patch).toHaveBeenCalledTimes(1)
    expect(patch).toHaveBeenCalledWith('S20', [{ op: 'test', path: PTR, value: 1.1 }, { op: 'replace', path: PTR, value: 1.24 }])
    expect((qc.getQueryData(['species', 'S20']) as Species).file).toEqual({ spine: { tail: { length: 1.24 } } })
    expect(result.current.error).toBeNull()
    expect(isOwn({ path: PTR, new: 1.24 })).toBe(true)     // the toast for it is not shown to the hand that made it
  })

  it('puts the value back and says why, in the server\'s words, when the server refuses', async () => {
    patch.mockRejectedValue(new ApiError(400, 'spine.tail.length is 9 H, outside the biped plan\'s band 0.6 to 1.8', 'spine.tail.length'))
    const qc = new QueryClient()
    qc.setQueryData(['species', 'S20'], species(1.1))
    const { result } = renderHook(() => useField<number>(species(1.1), 'S20', PTR), { wrapper: wrap(qc) })
    act(() => result.current.set(9))
    expect(result.current.value).toBe(9)
    await act(async () => { vi.advanceTimersByTime(700) })
    expect(result.current.value).toBe(1.1)
    expect(result.current.error).toBe('spine.tail.length is 9 H, outside the biped plan\'s band 0.6 to 1.8')
    act(() => result.current.set(1.2))
    expect(result.current.error).toBeNull()                 // the next change clears it
  })

  it('follows a change made while a save is on its way with one more save, and ends on the last value', async () => {
    let release: (v: unknown) => void = () => {}
    patch.mockImplementationOnce(() => new Promise((r) => { release = r }))
    const qc = new QueryClient()
    qc.setQueryData(['species', 'S20'], species(1.1))
    const { result } = renderHook(() => useField<number>(species(1.1), 'S20', PTR), { wrapper: wrap(qc) })
    act(() => result.current.set(1.2))
    await act(async () => { vi.advanceTimersByTime(650) })
    expect(patch).toHaveBeenCalledTimes(1)
    act(() => result.current.set(1.3))
    await act(async () => { vi.advanceTimersByTime(650) })
    expect(patch).toHaveBeenCalledTimes(1)                  // still waiting for the first
    await act(async () => { release({ hash: 'h2' }) })
    await act(async () => { vi.advanceTimersByTime(10) })
    expect(patch).toHaveBeenCalledTimes(2)
    expect(patch).toHaveBeenLastCalledWith('S20', [{ op: 'test', path: PTR, value: 1.2 }, { op: 'replace', path: PTR, value: 1.3 }])
  })

  it('does not save a change back to the value the file already has', async () => {
    const qc = new QueryClient()
    const { result } = renderHook(() => useField<number>(species(1.1), 'S20', PTR), { wrapper: wrap(qc) })
    act(() => result.current.set(1.5))
    act(() => result.current.set(1.1))
    await act(async () => { vi.advanceTimersByTime(700) })
    expect(patch).not.toHaveBeenCalled()
    expect(result.current.value).toBe(1.1)
  })
})

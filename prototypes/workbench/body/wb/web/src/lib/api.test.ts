import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, call, casUrl, loginUrl, nav } from './api'
import { checkMetas } from './checks'
import { PREFIX, apiPath } from './prefix'

const answer = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); window.history.replaceState(null, '', '/') })

describe('one prefix for the API, the events and the pictures', () => {
  it('is /studio, from the build base', () => {
    expect(PREFIX).toBe('/studio')
    expect(apiPath('/events?species=S20')).toBe('/studio/events?species=S20')
    expect(casUrl('ab12')).toBe('/studio/cas/ab12.png')
  })
  it('api calls and the check registry go under it', async () => {
    const f = answer(200, [])
    vi.stubGlobal('fetch', f)
    await call('GET', '/api/species')
    await checkMetas().queryFn!({} as never)
    expect(f.mock.calls.map((c) => (c as unknown[])[0])).toEqual(['/studio/api/species', '/studio/api/checks'])
  })
})

describe('a 401 goes to the login', () => {
  it('sends the person to /studio/login with the page they were on', async () => {
    window.history.replaceState(null, '', '/studio/S20/shape?sel=tail&az=90')
    vi.stubGlobal('fetch', answer(401, { error: 'sign in' }))
    const to = vi.spyOn(nav, 'to').mockImplementation(() => {})
    await expect(call('GET', '/api/species/S20')).rejects.toBeInstanceOf(ApiError)
    expect(to).toHaveBeenCalledTimes(1)
    expect(to).toHaveBeenCalledWith('/studio/login?next=' + encodeURIComponent('/studio/S20/shape?sel=tail&az=90'))
    expect(loginUrl('/studio/S20/shape')).toBe('/studio/login?next=%2Fstudio%2FS20%2Fshape')
  })
  it('does not loop on the login page itself, and leaves other errors and the server\'s own token refusal alone', async () => {
    const to = vi.spyOn(nav, 'to').mockImplementation(() => {})
    window.history.replaceState(null, '', '/studio/login?next=%2Fstudio')
    vi.stubGlobal('fetch', answer(401, {}))
    await expect(call('GET', '/api/stats')).rejects.toThrow()
    window.history.replaceState(null, '', '/studio/S20/shape')
    vi.stubGlobal('fetch', answer(403, { error: 'refused' }))
    await expect(call('GET', '/api/stats')).rejects.toThrow('refused')
    vi.stubGlobal('fetch', answer(401, { error: 'this call needs a token', field: 'token' }))
    await expect(call('PATCH', '/api/species/S20', [])).rejects.toThrow('needs a token')
    expect(to).not.toHaveBeenCalled()
  })
})

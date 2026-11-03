import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Species } from './api'
import { useFrames } from './frames'

const sp = (key: string, ready: boolean): Species => ({ id: 'S20', hash: 'h', error: null, lease: null, history: [], file: {}, checks: null, views: [{ mode: 'clay', az: 32, size: 304, key, ready }] })

describe('the pictures of the stage', () => {
  it('keep the last good picture, stale, until the new one exists; then keep the old one as "before"', () => {
    const { result, rerender } = renderHook(({ s }) => useFrames(s, 'clay'), { initialProps: { s: sp('a', true) } })
    expect(result.current[32]).toEqual({ src: '/studio/cas/a.png', stale: false, before: null })
    rerender({ s: sp('b', false) })
    expect(result.current[32]).toEqual({ src: '/studio/cas/a.png', stale: true, before: null })
    rerender({ s: sp('b', true) })
    expect(result.current[32]).toEqual({ src: '/studio/cas/b.png', stale: false, before: '/studio/cas/a.png' })
  })
  it('a larger size of the same picture lands without becoming "before"', () => {
    const two = (small: boolean, big: boolean): Species => ({ ...sp('s', false), views: [{ mode: 'clay', az: 32, size: 304, key: 's', ready: small }, { mode: 'clay', az: 32, size: 608, key: 'L', ready: big }] })
    const { result, rerender } = renderHook(({ s }) => useFrames(s, 'clay', [608, 304]), { initialProps: { s: two(true, false) } })
    expect(result.current[32]).toEqual({ src: '/studio/cas/s.png', stale: false, before: null })
    rerender({ s: two(true, true) })
    expect(result.current[32]).toEqual({ src: '/studio/cas/L.png', stale: false, before: null })
  })
  it('an angle never rendered has no picture', () => {
    const { result } = renderHook(() => useFrames(sp('a', false), 'clay'))
    expect(result.current[0]).toEqual({ src: null, stale: true, before: null })
  })
})

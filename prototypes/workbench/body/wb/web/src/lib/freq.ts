import { useMemo } from 'react'
import { freqOf } from '../engine/index.mjs'
import type { Species } from './api'
import type { Freq } from './genes'

// How often each look shows (spec 4.2), computed in the page from the species file with the game's catalogue and the server's own sampler streams (src/engine). No request: the first numbers are there in the same frame
// as the file, and an edit recomputes them. The server's /freq stays for its own use until Python calls this engine.
const cache = new Map<string, Freq | null>()
export function freqIn(sp: Pick<Species, 'id' | 'hash' | 'file'>): Freq | null {
  const key = `${sp.id}@${sp.hash}`
  if (!cache.has(key)) {
    if (cache.size > 20) cache.clear()
    const t0 = performance.now()
    cache.set(key, freqOf(sp.file))
    performance.measure('engine.freq', { start: t0, end: performance.now() }) // the shots read it (shots/r6.mjs)
  }
  return cache.get(key)!
}
export function useFreq(sp: Species): { data: Freq | undefined; isError: boolean } {
  return useMemo(() => {
    try { return { data: freqIn(sp) ?? undefined, isError: false } } catch { return { data: undefined, isError: true } }
  }, [sp.id, sp.hash]) // eslint-disable-line react-hooks/exhaustive-deps
}

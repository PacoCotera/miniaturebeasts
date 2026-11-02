import { useMemo, useRef } from 'react'
import { casUrl, type Species } from './api'
import { AZS } from './url'

export type Frame = { src: string | null; stale: boolean; before: string | null }

// The pictures of one mode, per angle. A picture that is not ready for the file as it is now keeps the last good one (stale, under the hatch).
// `before` is the picture that was there before the last swap: what holding Space shows.
export function useFrames(species: Species | undefined, mode: string): Record<number, Frame> {
  const good = useRef(new Map<string, string>())
  const prev = useRef(new Map<string, string>())
  return useMemo(() => {
    const out: Record<number, Frame> = {}
    for (const az of AZS) {
      const k = `${species?.id}:${mode}:${az}`
      const v = species?.views.find((x) => x.mode === mode && x.az === az)
      const url = v?.ready ? casUrl(v.key) : null
      if (url) {
        const old = good.current.get(k)
        if (old && old !== url) prev.current.set(k, old)
        good.current.set(k, url)
      }
      out[az] = { src: url ?? good.current.get(k) ?? null, stale: !url, before: prev.current.get(k) ?? null }
    }
    return out
  }, [species, mode])
}

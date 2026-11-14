import { useMemo, useRef } from 'react'
import { casUrl, type Species } from './api'
import { AZS } from './url'

export type Frame = { src: string | null; stale: boolean; before: string | null }

// The pictures of one mode, per angle. `sizes` is the order of preference (the hero asks for 608, then 304 until the large one lands; the strip asks for 304).
// A picture that is not ready for the file as it is now keeps the last good one (stale, under the hatch).
// `before` is the picture that was there before the last swap: what holding Space shows.
export function useFrames(species: Species | undefined, mode: string, sizes: number[] = [304]): Record<number, Frame> {
  const good = useRef(new Map<string, { url: string; rank: number }>())
  const prev = useRef(new Map<string, string>())
  return useMemo(() => {
    const out: Record<number, Frame> = {}
    for (const az of AZS) {
      const k = `${species?.id}:${mode}:${az}`
      const rank = sizes.findIndex((z) => species?.views.some((x) => x.mode === mode && x.az === az && x.size === z && x.ready))
      const v = rank < 0 ? undefined : species?.views.find((x) => x.mode === mode && x.az === az && x.size === sizes[rank])
      const url = v ? casUrl(v.key) : null
      if (url) {
        const old = good.current.get(k)
        if (old && old.url !== url && rank >= old.rank) prev.current.set(k, old.url) // a better size of the same picture is not a new picture
        good.current.set(k, { url, rank })
      }
      out[az] = { src: url ?? good.current.get(k)?.url ?? null, stale: !url, before: prev.current.get(k) ?? null }
    }
    return out
  }, [species, mode, sizes.join()])
}

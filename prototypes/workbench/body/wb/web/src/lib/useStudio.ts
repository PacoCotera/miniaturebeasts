import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { buildStudioUrl, parseStudioUrl, type StudioUrl } from './url'

export function useStudioUrl(): [StudioUrl, (patch: Partial<StudioUrl>, replace?: boolean) => void] {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const cur = parseStudioUrl(pathname, search) as StudioUrl
  const go = useCallback((patch: Partial<StudioUrl>, replace = false) => navigate(buildStudioUrl({ ...cur, ...patch }), { replace }), [cur.species, cur.mode, cur.sel, cur.az, cur.view, cur.drawer, cur.proof, cur.ind, cur.seed, cur.cmp, cur.gv, navigate]) // eslint-disable-line react-hooks/exhaustive-deps
  return [cur, go]
}

export function useMedia(query: string): boolean {
  const [m, setM] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const f = () => setM(mq.matches)
    mq.addEventListener('change', f)
    f()
    return () => mq.removeEventListener('change', f)
  }, [query])
  return m
}
export const useRail = () => useMedia('(max-width: 1279px)')
export const usePortraitSheet = () => useMedia('(orientation: portrait) and (max-width: 1366px)')
export const useTouch = () => useMedia('(pointer: coarse)')

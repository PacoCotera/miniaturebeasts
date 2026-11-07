import { buildStudioUrl, type StudioUrl } from '../lib/url'

// The new shell lives behind ?ui=next until R14 makes it the default. Every link it makes keeps the flag.
export const NEXT_FLAG = 'ui=next'
export const isNext = (search: string) => new URLSearchParams(search).get('ui') === 'next'
export function nextUrl(u: StudioUrl): string {
  const base = buildStudioUrl(u)
  return base + (base.includes('?') ? '&' : '?') + NEXT_FLAG
}

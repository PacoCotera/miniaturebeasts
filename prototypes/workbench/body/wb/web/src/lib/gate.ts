import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, call, getToken } from './api'
import { apiPath } from './prefix'

// Chunk 25: the gate. A round is asked for by a maker at one file hash; a reviewer ticks the six sheets and signs, then the owner signs. The server decides who may (spec 6.2): the page only hides what the role cannot do.
export type Role = 'maker' | 'reviewer' | 'owner'
export type Me = { name: string | null; role: Role | null; agent: boolean }
export type Sign = { name: string; at: string; hash: string }
export type SheetRow = { id: string; label: string; tick: boolean; by?: string; at?: string; url?: string }
export type RoundState = { live: boolean; reviewer_valid: boolean; owner_valid: boolean; signed: boolean; voided: boolean; ticked: number }
export type Round = { round: number; file_hash: string; asked_by: string; asked_at: string; note: string; reviewer: Sign | null; owner: Sign | null; verdict: string | null; voided: { at: string; by: string; hash: string } | null; state: RoundState; sheets: SheetRow[] }
export type Gate = { species: string; hash: string; rounds: Round[]; current: number | null; signed: boolean; building: boolean }

export const meOne = () => queryOptions({ queryKey: ['me', getToken()], queryFn: () => call<Me>('GET', '/api/me'), staleTime: 60_000 })
export const gateOne = (id: string) => queryOptions({ queryKey: ['gate', id], queryFn: () => call<Gate>('GET', `/api/species/${encodeURIComponent(id)}/gate`), staleTime: 5_000, refetchInterval: (q) => (q.state.data?.building ? 3000 : false) })
export const sheetUrl = (id: string, n: number, sheet: string) => apiPath(`/api/species/${encodeURIComponent(id)}/gate/${n}/sheet/${sheet}.png`)

// Reviewers and the owner judge; a maker (and any agent) does not see the controls at all.
export const canJudge = (me: Me | undefined) => !!me && !me.agent && (me.role === 'reviewer' || me.role === 'owner')
export const current = (g: Gate | undefined): Round | null => g?.rounds.find((r) => r.round === g.current) ?? null
// The round on the screen: the earlier one the address names (`rd`), else the current. An earlier round is only looked at: nothing on it can be ticked, signed or sent back.
export const shown = (g: Gate | undefined, rd: number | null): Round | null => g?.rounds.find((r) => r.round === rd && r.round !== g.current) ?? current(g)
export const isEarlier = (g: Gate | undefined, r: Round | null) => !!g && !!r && r.round !== g.current
// Who signed the round and was voided by the change: the names on the voided line.
export const voidedNames = (r: Round): string[] => [r.reviewer, r.owner].flatMap((x) => (x ? [x.name] : []))
// The round's open state: a verdict closes it, a changed file voids its signatures.
export const isOpen = (r: Round | null) => !!r && !r.verdict && r.state.live
export const allTicked = (r: Round) => r.state.ticked === r.sheets.length
export type Step = 'reviewer' | 'owner' | 'done' | null
// Whose turn it is on the open round.
export const turn = (r: Round | null): Step => (!r || !isOpen(r) ? null : !r.reviewer ? 'reviewer' : !r.owner ? 'owner' : 'done')
// The sheet on the stage: the one in the URL, else the first not yet ticked, else the first.
export const pickSheet = (r: Round, sel: string | null): SheetRow | null => r.sheets.find((x) => x.id === sel) ?? r.sheets.find((x) => !x.tick) ?? r.sheets[0] ?? null
export const shortHash = (h: string) => h.slice(0, 8)
export const day = (t: string) => { const d = new Date(t); return Number.isNaN(d.getTime()) ? t : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }

// The refusal the server gives is shown as it comes (the page never makes one up).
export const gateError = (id: string) => ['gate-error', id]
export function useGateError(id: string): string | null {
  return useQuery({ queryKey: gateError(id), queryFn: () => null as string | null, initialData: null, staleTime: Infinity }).data
}
export function useGateActions(id: string) {
  const qc = useQueryClient()
  const base = `/api/species/${encodeURIComponent(id)}/gate`
  const run = useMutation({
    mutationFn: ({ path, body }: { path: string; body?: unknown }) => call<Gate>('POST', `${base}${path}`, body ?? {}),
    onSuccess: (g) => { qc.setQueryData(['gate', id], g); qc.setQueryData(gateError(id), null) },
    onError: (e) => { qc.setQueryData(gateError(id), e instanceof ApiError ? e.message : String(e)) },
  })
  return {
    ask: () => run.mutateAsync({ path: '' }).catch(() => undefined),
    tick: (n: number, sheet: string, tick: boolean) => run.mutateAsync({ path: `/${n}/rows/${sheet}`, body: { tick } }).catch(() => undefined),
    note: (n: number, note: string) => run.mutateAsync({ path: `/${n}/note`, body: { note } }).catch(() => undefined),
    back: (n: number, note?: string) => run.mutateAsync({ path: `/${n}/back`, body: { note } }).catch(() => undefined),
    sign: (n: number) => run.mutateAsync({ path: `/${n}/sign` }).catch(() => undefined),
    fail: (message: string) => qc.setQueryData(gateError(id), message),
    busy: run.isPending,
  }
}

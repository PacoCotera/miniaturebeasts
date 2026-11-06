import { useEffect, useRef } from 'react'
import * as Toast from '@radix-ui/react-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getToken, patchSpecies, speciesOne } from '../lib/api'
import { entryKey, fieldLabel, fmtValue, initials, isOwn, newEntries } from '../lib/edits'
import { useUI } from '../lib/store'
import { W } from '../lib/words'
import s from './Toasts.module.css'

// Bottom-left toasts for edits made elsewhere: "agent-3 set tail length 1.10 → 1.24 · Undo". Failures never come here.
export function Toasts({ species }: { species: string }) {
  const { data } = useQuery(speciesOne(species))
  const seen = useRef<Set<string> | null>(null)
  const { toasts, pushToast, dropToast } = useUI()
  const qc = useQueryClient()
  useEffect(() => { seen.current = null }, [species])
  useEffect(() => {
    if (!data) return
    for (const e of newEntries(seen.current, data.history)) if (!isOwn(e)) pushToast(e)
    seen.current = new Set(data.history.map(entryKey))
  }, [data, pushToast])
  const undo = async (path: string, old: unknown, now: unknown) => {
    await patchSpecies(species, [{ op: 'test', path, value: now }, { op: 'replace', path, value: old }])
    void qc.invalidateQueries({ queryKey: ['species', species] })
  }
  return (
    <Toast.Provider duration={6000} label="Edits">
      {toasts.map((t) => (
        <Toast.Root key={t.id} className={s.toast} onOpenChange={(o) => !o && dropToast(t.id)}>
          <span className={s.avatar} data-agent={t.entry.agent || undefined}>{initials(t.entry.actor)}</span>
          <Toast.Description className={s.text}>
            <b>{t.entry.actor}</b> set {fieldLabel(t.entry.path, data?.labels, data?.file)} <span className="num">{fmtValue(t.entry.old)} → {fmtValue(t.entry.new)}</span>
          </Toast.Description>
          {getToken() && <Toast.Action altText={W.undo} className={s.undo} onClick={() => void undo(t.entry.path, t.entry.old, t.entry.new)}>{W.undo}</Toast.Action>}
        </Toast.Root>
      ))}
      <Toast.Viewport className={s.viewport} />
    </Toast.Provider>
  )
}

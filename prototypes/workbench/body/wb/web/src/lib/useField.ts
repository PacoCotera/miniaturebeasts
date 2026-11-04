import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError, patchSpecies, type Species } from './api'
import { noteOwn } from './edits'
import { AUTOSAVE_MS, getAt, patchFor, setAt } from './forms'

// One field's edit, as the person feels it: the value they set shows at once (optimistic), the save follows 0.6 s after the last change as one patch (a scrub is one save, not a hundred),
// and the server has the last word: a refusal puts the value back and says why on the field, in the server's own words (they name the field).
// A save that is still on its way when the next change comes is followed by one more, so the file ends on the last value.
export type FieldEdit<T> = { value: T; set: (v: T) => void; error: string | null; saving: boolean; clearError: () => void }

export function useField<T>(species: Species | undefined, id: string, ptr: string, delay = AUTOSAVE_MS): FieldEdit<T> {
  const qc = useQueryClient()
  const fileValue = getAt(species?.file, ptr) as T
  const [draft, setDraft] = useState<{ v: T } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const saved = useRef(fileValue)       // the value the file last had, as far as this page knows
  const next = useRef<{ v: T } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const busy = useRef(false)
  useEffect(() => { if (!next.current && !busy.current) saved.current = fileValue }, [fileValue])
  useEffect(() => { setDraft(null); setError(null); next.current = null }, [ptr, id])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const flush = useCallback(async () => {
    if (busy.current || !next.current) return
    const { v } = next.current
    next.current = null
    if (JSON.stringify(v) === JSON.stringify(saved.current)) { setDraft(null); return }
    busy.current = true
    setSaving(true)
    // a list is saved as one change for each element that moved: the log's entries are those
    if (Array.isArray(v)) v.forEach((x, i) => noteOwn(`${ptr}/${i}`, x)); else noteOwn(ptr, v)
    try {
      await patchSpecies(id, patchFor(ptr, saved.current, v))
      saved.current = v
      qc.setQueryData<Species>(['species', id], (s) => (s ? { ...s, file: setAt(s.file, ptr, v) } : s))
      if (!next.current) setDraft(null)
    } catch (e) {
      next.current = null
      setDraft(null)
      setError(e instanceof ApiError ? e.message : 'The save did not reach the server.')
      void qc.invalidateQueries({ queryKey: ['species', id] })
    } finally {
      busy.current = false
      setSaving(false)
      if (next.current) void flush()
    }
  }, [id, ptr, qc])

  const set = useCallback((v: T) => {
    setError(null)
    setDraft({ v })
    next.current = { v }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void flush(), delay)
  }, [flush, delay])
  return { value: draft ? draft.v : fileValue, set, error, saving, clearError: () => setError(null) }
}

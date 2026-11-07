import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError, revertSpecies } from './api'
import { useCanEdit } from './gate'
import { noteOwn } from './edits'
import { followEdit } from './patch'

// Undo and redo (Z, Shift Z): the server walks the undo log, so what is undone is the last save that is not undone, whoever made it, and the log keeps both entries.
// A refusal (a hand changed the field since, or there is nothing to undo) is said on the history row, in the server's own words; the page itself says nothing when it works.
export function useRevert(species: string) {
  const qc = useQueryClient()
  const canEdit = useCanEdit()
  const [error, setError] = useState<string | null>(null)
  const run = useCallback(async (kind: 'undo' | 'redo') => {
    if (!canEdit) return
    setError(null)
    try {
      const j = await revertSpecies(species, kind)
      for (const c of j.changed) noteOwn(c.path, c.new)
      // the answer carries the undo's own ops: this page applies them and asks for nothing (the edited event that follows is the same save, already taken, and refreshes the forms once)
      if (followEdit(qc, species, j) === 'refetch') await qc.invalidateQueries({ queryKey: ['species', species] })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : `The ${kind} did not reach the server.`)
    }
  }, [species, qc, canEdit])
  return { run, error, clear: () => setError(null) }
}

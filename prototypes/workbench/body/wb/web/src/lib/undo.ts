import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError, getToken, revertSpecies } from './api'
import { noteOwn } from './edits'

// Undo and redo (Z, Shift Z): the server walks the undo log, so what is undone is the last save that is not undone, whoever made it, and the log keeps both entries.
// A refusal (a hand changed the field since, or there is nothing to undo) is said on the history row, in the server's own words; the page itself says nothing when it works.
export function useRevert(species: string) {
  const qc = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const run = useCallback(async (kind: 'undo' | 'redo') => {
    if (!getToken()) return
    setError(null)
    try {
      const j = await revertSpecies(species, kind)
      for (const c of j.changed) noteOwn(c.path, c.new)
      await qc.invalidateQueries({ queryKey: ['species', species] })
      await qc.invalidateQueries({ queryKey: ['forms', species] })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'The save did not reach the server.')
    }
  }, [species, qc])
  return { run, error, clear: () => setError(null) }
}

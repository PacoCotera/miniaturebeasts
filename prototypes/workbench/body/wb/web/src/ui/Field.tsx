import { useEffect, useState } from 'react'
import type { Species } from '../lib/api'
import type { CheckMeta, CheckRow } from '../lib/checks'
import { dottedPath } from '../lib/edits'
import { controlFor, failingFor, type FieldDesc } from '../lib/forms'
import { useField } from '../lib/useField'
import { NumberField } from './NumberField'
import { Segmented } from './Segmented'
import { SelectField } from './SelectField'
import { Switch } from './Switch'
import { WeightsField } from './WeightsField'

// The field registry (studio-ui 3.2): the schema says what kind a field is, the kind picks the control. The page has no list of fields and no form for any one of them.
// A field turns gold for two seconds when another hand has just changed it (an agent, or the file edited on disk).
const TINT_MS = 2000
function useTint(species: Species | undefined, desc: FieldDesc): boolean {
  const last = species?.history[species.history.length - 1]
  const hit = !!last && (last.agent || last.via === 'file') && species && dottedPath(last.path, species.file) === desc.id
  const key = hit ? `${last!.t}|${last!.hash_after}` : ''
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!hit || Date.now() - Date.parse(last!.t) > TINT_MS) { setOn(false); return }
    setOn(true)
    const t = setTimeout(() => setOn(false), TINT_MS)
    return () => clearTimeout(t)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return on
}

export function Field({ species, id, desc, editable, rows, metas }: { species: Species; id: string; desc: FieldDesc; editable: boolean; rows: CheckRow[]; metas: Record<string, CheckMeta> }) {
  const f = useField<unknown>(species, id, desc.ptr)
  const tint = useTint(species, desc)
  const kind = controlFor(desc)
  const fail = !!failingFor(desc.id, rows, metas)
  const body = kind === 'number' ? <NumberField desc={desc} value={Number(f.value)} onChange={f.set} editable={editable} fail={fail} error={f.error} saving={f.saving} />
    : kind === 'segmented' ? <Segmented desc={desc} value={String(f.value)} onChange={f.set} editable={editable} error={f.error} />
    : kind === 'select' ? <SelectField desc={desc} value={String(f.value)} onChange={f.set} editable={editable} error={f.error} />
    : kind === 'weights' ? <WeightsField desc={desc} value={Array.isArray(f.value) ? (f.value as number[]) : []} onChange={f.set} editable={editable} error={f.error} />
    : kind === 'switch' ? <Switch desc={desc} value={f.value === true} onChange={f.set} editable={editable} error={f.error} />
    : null
  return body && <div data-tint={tint || undefined} style={tint ? { background: 'color-mix(in srgb, var(--special) 16%, transparent)', borderRadius: 6 } : undefined}>{body}</div>
}

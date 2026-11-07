import type { OutlineRow } from './forms'

// The parts outline comes from the plan (`GET /api/species/<id>/forms`). This is the biped's, for the moment before that answers (and for a page that cannot reach the server): the spine's ranges with their swatches,
// the parts under the range they grow from, then Coat, Motion and Renders.
const sw = { head: '#f2c9a6', neck: '#f2e3a0', back: '#bcdcae', seat: '#a9cfe0', tail: '#d4c3ef' }
const r = (id: string, label: string, kind: OutlineRow['kind'], under: string | null = null): OutlineRow => ({ id, label, kind, under, sw: kind === 'range' ? sw[id as keyof typeof sw] : null })
export const OUTLINE: OutlineRow[] = [
  r('head', 'Head', 'range'), r('ears', 'Ears', 'part', 'head'), r('crown', 'Crown', 'part', 'head'), r('face', 'Face', 'part', 'head'),
  r('neck', 'Neck', 'range'), r('back', 'Back', 'range'), r('arms', 'Arms', 'part', 'back'), r('seat', 'Seat', 'range'), r('legs', 'Legs', 'part', 'seat'),
  r('tail', 'Tail', 'range'), r('tip', 'Tip', 'part', 'tail'), r('coat', 'Coat', 'section'), r('motion', 'Motion', 'section'), r('renders', 'Renders', 'section'),
]
export const partLabel = (id: string | null) => OUTLINE.find((x) => x.id === id)?.label ?? id

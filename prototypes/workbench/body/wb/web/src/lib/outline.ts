// The rows of the navigator until the parts outline arrives from the plan (chunk 21): the spine's ranges with their swatches, then the appendages.
export const OUTLINE: { id: string; label: string; sw?: string }[] = [
  { id: 'head', label: 'Head', sw: '#f2c9a6' }, { id: 'neck', label: 'Neck', sw: '#f2e3a0' }, { id: 'back', label: 'Back', sw: '#bcdcae' }, { id: 'seat', label: 'Seat', sw: '#a9cfe0' }, { id: 'tail', label: 'Tail', sw: '#d4c3ef' },
  { id: 'arms', label: 'Arms' }, { id: 'legs', label: 'Legs' }, { id: 'ears', label: 'Ears' },
]
export const partLabel = (id: string | null) => OUTLINE.find((r) => r.id === id)?.label ?? id

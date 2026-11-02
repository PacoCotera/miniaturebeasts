// Every on-screen string, from words.md (ids in the comments) or, where words.md has none, from studio-ui.md (marked "ui").
export const W = {
  modes: ['Shape', 'Genes', 'Variety', 'Goldens', 'Gate'], // st.modes
  play: 'Open in play', // st.play
  jobsWait: 'Waiting for a worker', // st.jobs.wait
  leaseBanner: (who: string) => `${who} is editing`, // st.lease.banner
  takeOver: 'Take over', // st.lease.banner
  undo: 'Undo', // st.toast.edit
  viewBar: ['Plush', 'Clay', 'Normal', 'Parts', 'Wire'], // ui 3.2 ViewBar
  before: 'Before', // ui 3.2 ViewBar
  help: { go: 'Go to', do: 'Do', choose: 'choose', run: 'run', everyKey: 'every key' }, // ui mock 10
  held: (who: string, since: string) => `held by ${who} since ${since}`, // spec 6.2
}
// The job's kind, one word (st.jobs): the proxy renders are clay; plush and glb arrive with their workers.
export const jobWord = (kind: string) => (kind === 'render' ? 'clay' : kind)

// ui 4.5: the key table. Not on screen anywhere but the "?" sheet and the palette.
export const KEYS: [string, string][] = [
  ['1 – 5', 'Shape, Genes, Variety, Goldens, Gate'],
  ['Ctrl K, /', 'Palette'],
  ['?', 'Key sheet'],
  ['↑ ↓, Enter', 'Move in the navigator; edit the focused field'],
  ['← →', 'Previous or next angle on the hero'],
  ['M', 'Cycle view: plush, clay, normal, parts, wire'],
  ['Space (hold)', 'Before this save'],
  ['C', 'Checks drawer'],
  ['H', 'History'],
  ['J', 'The file as JSON'],
  ['V', "Show the selected check's proof"],
  ['G', 'Go to its field'],
  ['Z, Shift Z', 'Undo, redo'],
  ['[ ]', 'Hide navigator, hide inspector'],
  ['P', 'Open this species in play'],
  ['D', '(Goldens) diff view'],
]

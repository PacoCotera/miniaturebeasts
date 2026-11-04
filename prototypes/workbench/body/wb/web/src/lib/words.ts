// Every on-screen string, from words.md (ids in the comments) or, where words.md has none, from studio-ui.md (marked "ui").
export const W = {
  modes: ['Shape', 'Genes', 'Variety', 'Goldens', 'Gate'], // st.modes
  play: 'Open in play', // st.play
  newSheet: 'New sheet', // st.var.new
  gold: { make: 'Make goldens', ask: 'Ask for a look-change round', draft: 'Draft golden · remake freely', golden: 'Golden', now: 'Now', views: ['Split', 'Side by side', 'Diff'], state: 'State', moved: 'Pixels moved', because: 'Because of', from: 'Golden made from', file: 'File', framework: 'Framework', lookdev: 'Look-dev', by: 'Made by' }, // st.gold.* and mocks/studio/05-goldens
  jobsWait: 'Waiting for a worker', // st.jobs.wait
  leaseBanner: (who: string) => `${who} is editing`, // st.lease.banner
  takeOver: 'Take over', // st.lease.banner
  undo: 'Undo', // st.toast.edit
  asPlayer: 'Show as in play', // ui 4.3 (the Inspector's ⋯ menu); cw-chunks-21-22
  noToy: (part: string) => `${part} has no toy in play.`, // the menu item's tooltip when it is grey
  readOnly: 'Read only · no edit token', tokenTip: 'Open the page with ?token=… to edit.', nothing: 'Nothing to set here yet.', // the inspector, cw-chunks-21-22
  redo: 'Redo', // ui 4.5 (Z, Shift Z)
  drawer: { checks: 'Checks', history: 'History', file: 'File (JSON)', section: 'Section table' }, // ui 3.2 Drawer; the section table's name and notes are owed to the copywriter
  section: { cols: ['Height', 'Back radius', 'Side radius', 'Front radius'], rows: (n: number) => `${n} rows`, note: 'From the profile knobs · Read only' }, // cw-chunks-21-22
  viewBar: ['Plush', 'Clay', 'Normal', 'Parts', 'Wire'], // ui 3.2 ViewBar
  before: 'Before', // ui 3.2 ViewBar
  help: { go: 'Go to', do: 'Do', choose: 'choose', run: 'run', everyKey: 'every key' }, // ui mock 10
  held: (who: string, since: string) => `held by ${who} since ${since}`, // spec 6.2
}
// The job's kind, one word (st.jobs): the proxy renders are clay; plush and glb arrive with their workers.
export const jobWord = (kind: string) => ({ render: 'clay', variety: 'sheet', golden: 'goldens' } as Record<string, string>)[kind] ?? kind

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

// Play's strings, from words.md section 5.1 and 5.2 (ids in the comments). Play says "mibi" (words.md section 1). Strings play needs that words.md does not have are marked OWED and are the lead's list to the copywriter.
export const P = {
  title: 'Pick a mibi', // pl.open.title
  sub: 'Then squish it, paint it and make pods.', // pl.open.sub
  species: (s: string) => `a ${s}`, // pl.open.starter (second line)
  surprise: 'Surprise me', // pl.open.surprise
  mine: 'My mibis', // pl.open.mine, pl.open.shelf
  shelfLine: 'Mibis you keep wait here.', // pl.open.shelf.line
  shelfEmpty: 'Keep a young mibi and it waits here.', // pl.open.shelf.empty
  undo: 'Undo', // pl.shape.undo
  wiggle: 'Wiggle', // pl.shape.wiggle
  sculpt: 'Sculpting…', // pl.wait.sculpt
  fluff: 'Fluffing up…', // pl.wait.fluff
  busy: 'Busy bench, yours is next.', // pl.wait.busy
  fail: "Hmm, that shape didn't work. Try another?", // pl.wait.fail
  // OWED (no id in words.md yet): the back button's label, the menu button's label, the toys' ends for a screen reader, the pots' names, a page that cannot load.
  back: 'Back', menu: 'Menu',
  toyEnd: (toy: string, end: 'first' | 'last') => `${toy}: ${end === 'first' ? 'least' : 'most'}`,
  pot: (n: number) => `Colour ${n}`,
  noBench: 'The bench is not ready yet.',
  // The toys' questions (words.md "Toy labels"): on screen only where a toy has two sliders; a screen reader hears every axis. Chips, paint pots and a toy's only slider carry no label on screen.
  axis: {
    'body.size': { on: null, sr: 'How round?' }, 'ears.size': { on: 'How big?', sr: 'How big?' }, 'tail.length': { on: 'How long?', sr: 'How long?' }, 'tail.curl': { on: 'How curly?', sr: 'How curly?' },
    'ears.kind': { on: null, sr: 'Ear shape' }, 'tail.tip': { on: null, sr: 'Tail tip' }, 'paint.hue': { on: null, sr: 'Colour' }, 'pattern.kind': { on: null, sr: 'Pattern' },
  } as Record<string, { on: string | null; sr: string }>,
  noMibis: 'No mibis yet.',
} as const

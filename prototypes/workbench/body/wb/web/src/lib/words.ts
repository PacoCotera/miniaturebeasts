// Every on-screen string, from words.md (ids in the comments) or, where words.md has none, from studio-ui.md (marked "ui").
export const W = {
  modes: ['Shape', 'Genes', 'Variety', 'Goldens', 'Gate'], // st.modes
  play: 'Open in play', // st.play
  newSheet: 'New sheet', // st.var.new
  gold: { make: 'Make goldens', ask: 'Ask for a look-change round', draft: 'Draft golden · remake freely', golden: 'Golden', now: 'Now', views: ['Split', 'Side by side', 'Diff'], state: 'State', moved: 'Pixels moved', because: 'Because of', from: 'Golden made from', file: 'File', framework: 'Framework', lookdev: 'Look-dev', by: 'Made by' }, // st.gold.* and mocks/studio/05-goldens
  gate: {
    ask: 'Ask for review', sign: (n: number) => `Sign round ${n}`, release: 'Sign and release', note: 'A note for the maker', // st.impact.go, st.gate.sign, st.gate.release, st.gate.note
    round: (n: number) => `Round ${n}`, sheets: (n: number) => `Round ${n} sheets`, earlier: 'Earlier', file: 'file', // mocks/studio/06-gate
    order: 'Sign in order', reviewer: 'Reviewer', owner: 'Owner', you: 'you', afterYou: 'after you', export: 'Export', forReview: 'For review', releaseRow: 'Release', afterBoth: 'after both signatures', sendBack: 'Send back', seeIt: 'See it', // mocks/studio/06-gate
    ticked: (k: number, n: number) => `${k} of ${n} ticked`, // st.inbox.round
    oneFails: 'One check fails', signAnyway: 'Sign anyway, or send it back.', // st.gate.red (the check's own fail line sits between)
    // OWED to the copywriter (words.md has none): the voided line (with who changed the file and whose signatures it voided), the signed-by line, the plural of the red card, each sheet's one judgement sentence, the sheet pages' own sentences,
    // and the earlier-round view's two lines (the read-only note and the way back to the current round).
    voided: (by: string | null, who: string[]) => `Changed after signing${by ? ` by ${by}` : ''} · ${who.length ? `signatures of ${who.join(' and ')} are void` : 'both signatures are void'}`,
    readOnly: 'An earlier round · look only', backTo: (n: number) => `Back to round ${n}`, signedBy: (who: string, day: string) => `${who} · ${day}`, manyFail: (n: number) => `${n} checks fail`, sentBack: 'Sent back',
  },
  jobsWait: 'Waiting for a worker', // st.jobs.wait
  leaseBanner: (who: string) => `${who} is editing`, // st.lease.banner
  takeOver: 'Take over', // st.lease.banner
  undo: 'Undo', // st.toast.edit
  asPlayer: 'Show as in play', // ui 4.3 (the Inspector's ⋯ menu); cw-chunks-21-22
  noToy: (part: string) => `${part} has no toy in play.`, // the menu item's tooltip when it is grey
  readOnly: 'Read only · no edit token', tokenTip: 'Open the page with ?token=… to edit.', nothing: 'Nothing to set here yet.', // the inspector, cw-chunks-21-22
  redo: 'Redo', // ui 4.5 (Z, Shift Z)
  drawer: { checks: 'Checks', history: 'History', file: 'File (JSON)', section: 'Section table' }, // ui 3.2 Drawer; the section table's name and notes are owed to the copywriter
  section: { cols: ['Height', 'Back radius', 'Side radius', 'Front radius'], rows: (n: number) => `${n} ${n === 1 ? 'row' : 'rows'}`, note: 'From the profile knobs · Read only' }, // cw-chunks-21-22
  viewBar: ['Plush', 'Clay', 'Normal', 'Parts', 'Wire'], // ui 3.2 ViewBar
  before: 'Before', // ui 3.2 ViewBar
  help: { go: 'Go to', do: 'Do', choose: 'choose', run: 'run', everyKey: 'every key' }, // ui mock 10
  held: (who: string, since: string) => `held by ${who} since ${since}`, // spec 6.2
}
// The job's kind, one word (st.jobs): the proxy renders are clay; plush and glb arrive with their workers.
export const jobWord = (kind: string) => ({ render: 'clay', variety: 'sheet', golden: 'goldens', export: 'glb' } as Record<string, string>)[kind] ?? kind

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
  menu: 'Menu',
  backShape: 'Pick another mibi', // pl.shape.back (the chevron on the shape screen, for a screen reader)
  backPods: (name: string) => `Back to ${name}`, // pl.pods.back
  // The toys' ends for a screen reader (pl.toy.end.*): each end names the picture it shows.
  toyEnd: (key: string, toy: string, end: 'first' | 'last') => {
    const ends: Record<string, [string, string]> = { 'body.size': ['Slim body', 'Round body'], 'ears.size': ['Small ears', 'Big ears'], 'tail.length': ['Short tail', 'Long tail'], 'tail.curl': ['Straight tail', 'Curly tail'] }
    return ends[key]?.[end === 'first' ? 0 : 1] ?? `${toy}: ${end === 'first' ? 'a little' : 'a lot'}`
  },
  // The paint pots' names come from the pot's own hue (pl.paint.pot): the bands are the same for every species.
  pot: (hue: number) => {
    const h = ((hue % 360) + 360) % 360
    const bands: [number, string][] = [[15, 'Red'], [45, 'Orange'], [70, 'Yellow'], [160, 'Green'], [193, 'Teal'], [218, 'Sky blue'], [244, 'Blue'], [270, 'Violet'], [296, 'Purple'], [321, 'Berry'], [347, 'Pink']]
    return (bands.find(([to]) => h < to) ?? [0, 'Red'])[1]
  },
  noBench: 'The mibis are still waking up. Try again soon.', // pl.wait.nobench
  // The toys' questions (words.md "Toy labels"): on screen only where a toy has two sliders; a screen reader hears every axis. Chips, paint pots and a toy's only slider carry no label on screen.
  axis: {
    'body.size': { on: null, sr: 'How round?' }, 'ears.size': { on: 'How big?', sr: 'How big?' }, 'tail.length': { on: 'How long?', sr: 'How long?' }, 'tail.curl': { on: 'How curly?', sr: 'How curly?' },
    'ears.kind': { on: null, sr: 'Ear shape' }, 'tail.tip': { on: null, sr: 'Tail tip' }, 'paint.hue': { on: null, sr: 'Colour' }, 'pattern.kind': { on: null, sr: 'Pattern' },
  } as Record<string, { on: string | null; sr: string }>,
  count: (n: number) => (n === 0 ? 'none yet' : n === 1 ? '1 kept' : `${n} kept`), // pl.open.count (read after "My mibis"; the screen shows the number)
  podsSub: (plural: string) => `young ${plural}`, // pl.pods.sub
  // P3, pods (words.md 5.3 and 5.4; ids in the comments).
  go: 'Make pods', // pl.shape.go
  podsTitle: (name: string) => `${name}'s pods`, // pl.pods.title
  again: 'More pods', // pl.pods.again (the egg is the picture beside it)
  walk: 'Walk', // pl.pods.play
  keep: 'Keep', // pl.pods.keep
  kept: (name: string) => `${name} is in My mibis.`, // pl.pods.kept
  wobble: 'Hatching…', // pl.pods.wobble
  grow: 'Grow', // pl.grow
  growSteps: { juvenile: 'young', adult: 'grown', elder: 'elder' } as Record<string, string>, // pl.grow.steps
  diff: 'How different?', // pl.diff
  diffSteps: { alike: 'alike', some: 'some', wild: 'wild' } as Record<string, string>, // pl.diff.steps
  family: 'In this family', // pl.family
  how: { often: 'often', sometimes: 'sometimes', rarely: 'rarely', grown: 'when grown' } as Record<string, string>, // pl.family.rows
  nameTitle: 'Name your mibi', // pl.name.title
  nameKeep: (name: string) => `Keep ${name}`, // pl.name.keep
  nest: 'Pods', pod: (n: number) => `Pod ${n}`, dice: 'More names', closeName: 'Close', noPod: "This one didn't hatch.", growSr: 'How old?',
} as const

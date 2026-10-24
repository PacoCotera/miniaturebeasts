# Case: one rule per text role, the whole application

Copywriter, Miniature Beasts. Written Sat 2026-10-24 16:29 (America/Mexico_City). Answers the owner's 2026-10-24 ~16:25 ask ("many phrases and titles all lowercase ... consistent across the whole application"; decisions.md, 2026-10-24 ~16:25).

**What I read and measured.** Style guide §5 and station-layouts.md "Type" (line 281); every `strings` table of `prototypes/ui/specs/station/*.json` (14 files, about 480 string leaves, 307 of them starting in lowercase or with a lowercase placeholder); the props builders (`prototypes/station/src/views/*.mjs`, `words.mjs`, `goal-words.mjs`, `state.mjs`, `sitting.mjs`); the composed lines in `prototypes/face/golden/journey-*.json` (all ok/subject/back values); the 1x goldens for Library Level 2 (loika-mid, met-only), Home (rest-needs), Pods (identified-pod-focused), Vivarium (docked), Create (shape-changed) and the Habitat card; the species frames (`prototypes/workbench/frames`, 182 look names, 66 trait names, 9 chapter names); the Companion prototype (`prototypes/exploration/index.html`, its `CARE_TEXT`, `SIGN_*` and `ctx` tables) and `design/style-guide/companion-screens.md`. The Companion has no JSON string table: its words are JavaScript tables in that one file.

**What the screens show today (the evidence).** Titles, names, eyebrows and tab labels are already capitalised everywhere ("Library", "Unlocked", "Families", "Your wish", "Coat colours found", "Every look"). The lowercase is in the quiet voice: the bottom line's subject, the notice, the line under a name and the composed lines. On one bar the 1x Library goldens show "Show Coat | Coat, more to find | Library" and, on met-only, "seen, no pod identified yet" beside "Library". Home shows "Open the Bay · the bud is ready". Pods shows "every Loika" and "this pod" under the figure. The Incubator card shows "a Loika" under "the bud is ready". The Library swatches show "charcoal", "russet". So the defect is one thing: a line or label that starts in lowercase. Nothing in the tables uses Title Case except one chapter name (see §4), and nothing capitalises for emphasis except "free until Incubate".

**Where the standing rule stood.** Style guide §5 says "sentence case for sentences", which the tables read as leaving fragments lowercase. That reading is what produced the lowercase. The rule below closes it: a line is a line whether or not it has a verb.

## 1. The rule, by text role

One principle: **sentence case, applied to every line a screen draws. The first letter of a line is a capital; proper names are capitals wherever they sit; nothing else is.** Never all-lowercase phrases, never Title Case, never capitals for emphasis.

| Role | Rule | Examples | One-line reason |
| --- | --- | --- | --- |
| Screen title, top-bar readout | The room's name, capitalised. A word-led readout beside it takes a capital; a figure-led readout is left as is. | "Library", "Vivarium", "Pods", "Station"; "All species", "3 at home", "20 new" | A title is a name; a figure needs no capital. |
| Heading, panel title | Sentence case; a panel's question ends in "?". | "Pick a pose", "Fit the upgrade?", "Hatch the Loika now?" | One case for every sentence-like title. |
| Section label, eyebrow (the small label over a group) | One capital, the rest lowercase, no colon, no all caps, never Title Case. | "Unlocked", "Families", "Your wish", "Coat colours found", "Every look" | Already how the screens read; written down so it holds. |
| Mibi, species, clan, place-in-the-game names | Always capitalised, mid-line included. A mibi's name as the player typed it (the namer forces a first capital). Species names as the frame writes them ("Loika"). | "Show Dot", "every Loika" becomes "Every Loika", "find a Loika pod" | A proper name is the one capital that is not a sentence start. |
| Room and device names | Always capitalised: Home, Station, Bay, Vivarium, Library, Incubator, Pods, Probe, Companion, Shield. The cargo room is "Bay"; the berth is "bay" (lowercase, a common noun, "no bay free"). | "Open the Bay", "Go to the Vivarium", "the Companion is full" becomes "The Companion is full" | These are the names of places the player goes; a lowercase "bay" for the room reads as a second word. |
| Common nouns of the game | Lowercase mid-line: pod, crate, bud, case, well, mibi, expedition, outpost, beacon, partner, portrait, sitting, trip, dock. Place kinds too: meadow, pond edge, rock field, wood, cave. Stage words: young, adult, elder. | "a crate waits in the Bay", "back to the meadow" | They are things, not names; capitals would be emphasis. |
| ✓ action cap | Verb first, first word capital, names inside capitalised, the rest lowercase, no full stop. | "Open the Bay", "Look at Dot", "Portray Dot", "Show Legs & Tail" | The one line the player acts on; it reads as an instruction. |
| ← back word | The destination's name, capitalised: a room, a mibi, a pod's species, a chapter, a step. "Back" only as the fallback. | "Home", "Library", "Dot", "Loika", "Pose" | A name (a place the player returns to). |
| Bottom line's subject (the context line) | Sentence case: capital on the first character even when it is a fragment; no full stop; at most 6 words and 208 px (unchanged). Names inside stay capitalised. A figure-led line is left as is. | "An adult Loika, asleep", "Coat, more to find", "Seen, no pod identified yet", "Goes with you now" | It is a line like every other line; the quiet colour (`mist`) already says it is secondary. |
| Description, quiet line (under a name, on a pane, a card's second line) | Sentence case, capital first. A full stop only when the line is a complete sentence in a paragraph place (the pod's origin, a plate message); fragments and labels never. | "This pod", "Every Loika", "Found at the pond edge, as a Loika shook dry.", "The bud is ready" | Same as the context line; the full stop marks prose, not labels. |
| Notice (amber zone) and the goal line | Sentence case, capital first, no full stop. | "Needs more ⚡", "A pod waits for a well", "Find a first pod" | A reason to act, in the same voice as the subject. |
| Message plate, toast (shown 4 s) | Whole sentences, capital after each full stop, a full stop at the end of each; two sentences at most. | "No bay free. Return a mibi to the wild first." | Plates read as speech; they already do this. |
| Counts and figures | Digits only beside icons (unchanged). A spelled count is a word: lowercase mid-line, capital at the start of a line. A line that begins with a figure or an icon is not recased. Units lowercase. Material names written as words are capitalised (Energy, Data, Essence), as the Companion writes them. | "Two crates wait in the Bay", "3 at home", "ready in about 4 min" | A number word is an ordinary word; it only takes a capital when it opens a line. |
| Chapter and trait names | Names: capitalised, spelled once in the species frames, never recased by the build. Chapter names are "Coat", "Face", "Shape", "Legs & Tail" (owner, 2026-10-08 17:52: every word of a tab label capitalised; see §4), "Movement", "Stamina", "Character", "Glow", "Charge". Traits are one word each ("Colour", "Markings"). | "Markings: pale", "Show Legs & Tail" | The guide's headings are the game's own words. |
| Look names ("charcoal", "stripes and patches", "between") | A look is a common noun: lowercase inside a line and after "Trait:". Standing alone as a label it takes a capital. **A look that stands alone must name its trait** whenever the word is not unique to one trait in the species (see below). | "Markings: stripes" (inside), "Charcoal, russet" (swatch labels under "Coat colours found"), "Eyes: between" (never "Between" alone) | A look is a value of a trait; capital only because it opens a line. |
| Punctuation inside a line | A colon, a comma or a middle dot continues the line: no capital after it, unless a name. A middle dot between two zones (the action and the notice on Home's top bar) is two lines: each starts with a capital. | "Needs more ⚡: go out", "Sealed · opens with Coat", "Open the Bay · The bud is ready" | One capital per line; a zone starts a line. |
| Companion (Mibi 7×9 face) | The same rule, with the same words. The Companion's own pattern "Label · gist" (about 150 strings) already follows it and does not change: label capital, gist after the dot lowercase. | "Plate lost · no plates, Probe breaks"; "With you", "Once a day" | The two devices share words, not a typeface; they must share case. |

**The art director's question: does "between" need its trait on the Level 2 shelf?** Yes. "between" is a look of 43 different traits across the frames (Eyes, Drive, Stamina, Fluff, Span, Pace, Turning, Waddle, Curiosity and 34 more); "coral", "plum", "plain", "strong", "short" repeat across traits too. Alone it names nothing. On the shelf a look appears with its trait as one unit, "Eyes: between", the same shape the Create trait line already uses (`{Trait}: {look}`, create.json strings.traitLine.only). Where the trait is already named by the plate above it (the lit page under "Coat"), the look may stand alone and takes a capital ("Charcoal"). The Unlocked shelf's wish rows (library.json l2 shelf.wish) are the case that needs the unit. This is a wording and layout call: the string is `{Trait}: {look}`; the width belongs to UI/UX (shelf.wish.word clip 170 px at 16 px).

## 2. Change list (strings in the spec tables)

Old → new. Every row is a literal that starts in lowercase today and starts a line. A cell reading "(composed)" is in §3. Key paths are inside each file's `strings` object. Counts per file are in the final message and the last table.


### prototypes/ui/specs/station/bench.json (8)

| key path | old | new |
| --- | --- | --- |
| `.strings.whole` | every plate whole | Every plate whole |
| `.strings.offContext` | the dock mends two, free | The dock mends two, free |
| `.strings.onContext` | two free, the rest ⚡ 1 each | Two free, the rest ⚡ 1 each |
| `.strings.onContextFree` | the dock mends all, free | The dock mends all, free |
| `.strings.adds` | the Probe reaches further | The Probe reaches further |
| `.strings.short` | needs more {icons} | Needs more {icons} |
| `.strings.dockFirst` | dock the Probe first | Dock the Probe first |
| `.strings.fitted` | the upgrade is fitted | The upgrade is fitted |

### prototypes/ui/specs/station/cargo.json (3)

| key path | old | new |
| --- | --- | --- |
| `.strings.arrival.subjects.cratesOne` | a sealed crate | A sealed crate |
| `.strings.arrival.subjects.empty` | the bay is empty | The bay is empty |
| `.strings.subjects.waitingOne` | a pod waits for a well | A pod waits for a well |

### prototypes/ui/specs/station/create.json (10)

| key path | old | new |
| --- | --- | --- |
| `.strings.growing` | it goes to the Incubator | It goes to the Incubator |
| `.strings.sealedShut` | all read, {Chapter} sealed | All read, {Chapter} sealed |
| `.strings.traitLine.none` | it grows as the pod is | It grows as the pod is |
| `.strings.notices.busy` | a bud is already growing | A bud is already growing |
| `.strings.notices.noBay` | no bay free | No bay free |
| `.strings.notices.clash` | these looks clash | These looks clash |
| `.strings.notices.shortFrom.field` | needs more {icons}: go out | Needs more {icons}: go out |
| `.strings.notices.shortFrom.bench` | needs more {icons}: watch your mibis | Needs more {icons}: watch your mibis |
| `.strings.notices.shortFrom.fieldOrPod` | needs {icons}: go out or return pods | Needs {icons}: go out or return pods |
| `.strings.notices.shortFrom.fieldAndBench` | needs {icons}: go out and watch | Needs {icons}: go out and watch |

### prototypes/ui/specs/station/cross.json (11)

| key path | old | new |
| --- | --- | --- |
| `.strings.child` | the child to be | The child to be |
| `.strings.noPartner` | no adult of its kind | No adult of its kind |
| `.strings.away` | away with you | Away with you |
| `.strings.missingOne` | read {parent}'s {chapter} | Read {parent}'s {chapter} |
| `.strings.missingBoth` | read both parents' {chapter} | Read both parents' {chapter} |
| `.strings.sealedOverview` | sealed · {opensWith} | Sealed · {opensWith} |
| `.strings.sealedChapter` | opens with {opensWith} | Opens with {opensWith} |
| `.strings.switch` | one in four each | One in four each |
| `.strings.firmSwitch` | known for sure | Known for sure |
| `.strings.firmBlend` | firm · {look} | Firm · {look} |
| `.strings.surface` | hidden looks can surface | Hidden looks can surface |

### prototypes/ui/specs/station/frame.json (45)

| key path | old | new |
| --- | --- | --- |
| `.strings.goal.step.goOut` | go out with the Companion | Go out with the Companion |
| `.strings.goal.step.findPod` | find {a} {species} pod | Find {a} {species} pod |
| `.strings.goal.step.identify` | identify the {species} pod | Identify the {species} pod |
| `.strings.goal.step.identifyAny` | identify a pod | Identify a pod |
| `.strings.goal.step.grow` | incubate the {species} pod | Incubate the {species} pod |
| `.strings.goal.step.openBay` | open the bay | Open the Bay |
| `.strings.goal.step.noBay` | free a bay in the Vivarium | Free a bay in the Vivarium |
| `.strings.goal.step.bud` | wait for the bud | Wait for the bud |
| `.strings.goal.step.cross` | cross {name} | Cross {name} |
| `.strings.goal.step.read` | read {name}'s chapters | Read {name}'s chapters |
| `.strings.goal.step.readPod` | read {chapter} on the {species} pod | Read {chapter} on the {species} pod |
| `.strings.goal.step.blocked` | the pair cannot cross yet | The pair cannot cross yet |
| `.strings.goal.step.fit` | fit the Probe upgrade | Fit the Probe upgrade |
| `.strings.goal.step.short.field` | go out for more {icons} | Go out for more {icons} |
| `.strings.goal.step.short.bench` | watch your mibis for more {icons} | Watch your mibis for more {icons} |
| `.strings.goal.step.short.fieldOrPod` | go out or return pods for {icons} | Go out or return pods for {icons} |
| `.strings.goal.step.short.fieldAndBench` | go out and watch for more {icons} | Go out and watch for more {icons} |
| `.strings.goal.step.growUp.one` | one more walk grows the pair | One more walk grows the pair |
| `.strings.goal.step.growUp.more` | more walks grow the pair | More walks grow the pair |
| `.strings.goal.step.growUp.careNoName` | the young mibi grows with care | The young mibi grows with care |
| `.strings.goal.step.readNoName` | read the new mibi's chapters | Read the new mibi's chapters |
| `.strings.goal.aim.firstPod` | find a first pod | Find a first pod |
| `.strings.goal.aim.firstMibi` | grow a first mibi | Grow a first mibi |
| `.strings.goal.aim.pair` | a partner for {name} | A partner for {name} |
| `.strings.goal.aim.growUp` | walks grow {name} up | Walks grow {name} up |
| `.strings.goal.aim.cross` | cross {name} next | Cross {name} next |
| `.strings.goal.aim.readChild` | read {name}'s chapters | Read {name}'s chapters |
| `.strings.goal.aim.guide` | fill the {species} field guide | Fill the {species} field guide |
| `.strings.goal.aim.probe` | save up for the Probe upgrade | Save up for the Probe upgrade |
| `.strings.goal.aim.growUpNoName` | walks grow the pair up | Walks grow the pair up |
| `.strings.goal.aim.readChildNoName` | read the new mibi's chapters | Read the new mibi's chapters |
| `.strings.goalWarn.identify` | then the {species} pod needs {icons} | Then the {species} pod needs {icons} |
| `.strings.goalWarn.grow` | then the {species} pod needs {icons} | Then the {species} pod needs {icons} |
| `.strings.goalWarn.cross` | then the pair needs {icons} | Then the pair needs {icons} |
| `.strings.goalWarn.read` | then the next read needs {icons} | Then the next read needs {icons} |
| `.strings.goalWarn.fit` | then the upgrade needs {icons} | Then the upgrade needs {icons} |
| `.idle.strings.crates.1` | a crate waits in the bay | A crate waits in the Bay |
| `.idle.strings.crates.2` | two crates wait in the bay | Two crates wait in the Bay |
| `.idle.strings.crates.3` | three crates wait in the bay | Three crates wait in the Bay |
| `.idle.strings.crates.many` | crates wait in the bay | Crates wait in the Bay |
| `.idle.strings.budReady` | the bud is ready | The bud is ready |
| `.idle.strings.budGrowing` | a bud is growing | A bud is growing |
| `.idle.strings.out.2` | two mibis are with the Companion | Two mibis are with the Companion |
| `.idle.strings.out.3` | three mibis are with the Companion | Three mibis are with the Companion |
| `.notBuilt.strings.line` | this screen is not built yet | This screen is not built yet |

### prototypes/ui/specs/station/habitat.json (40)

| key path | old | new |
| --- | --- | --- |
| `.strings.speciesLine` | your {Species}, {stage} | Your {Species}, {stage} |
| `.strings.residentContextBonded` | a bonded {stage} {species} | A bonded {stage} {species} |
| `.strings.painting` | its painting is on its way | Its painting is on its way |
| `.strings.offline` | waiting for a signal | Waiting for a signal |
| `.strings.shut.cross` | crossing is not open yet | Crossing is not open yet |
| `.strings.shut.portrait` | portraits are not open yet | Portraits are not open yet |
| `.strings.every` | every {Species} | Every {Species} |
| `.strings.takeNow` | goes with you now | Goes with you now |
| `.strings.takeNext` | goes at the next dock | Goes at the next dock |
| `.strings.bringNow` | comes home now | Comes home now |
| `.strings.bringNext` | home at the next dock | Home at the next dock |
| `.strings.full` | the Companion is full | The Companion is full |
| `.strings.withYou` | already with you | Already with you |
| `.strings.noSitting` | no sitting held | No sitting held |
| `.strings.portrayContext` | one sitting each, ever | One sitting each, ever |
| `.strings.noPose` | no pose seen yet | No pose seen yet |
| `.strings.noPlace` | no expedition yet | No expedition yet |
| `.strings.portraitOnWay` | its portrait is on its way | Its portrait is on its way |
| `.strings.portrayed` | already portrayed | Already portrayed |
| `.strings.noPartner` | no {Species} to pair with | No {Species} to pair with |
| `.strings.crossLater` | crosses once adult | Crosses once adult |
| `.strings.wildContext` | goes back to the wild | Goes back to the wild |
| `.strings.wildBlocks.bonded` | a bonded mibi stays | A bonded mibi stays |
| `.strings.wildBlocks.young` | not until it is adult | Not until it is adult |
| `.strings.wildBlocks.withYou` | already with you | Already with you |
| `.strings.wildBlocks.waiting` | goes at the next dock | Goes at the next dock |
| `.strings.out` | out with the Companion | Out with the Companion |
| `.strings.portraitOut` | sits when you dock | Sits when you dock |
| `.strings.crossOut` | crosses when you dock | Crosses when you dock |
| `.strings.crossAway` | pairs when you dock | Pairs when you dock |
| `.strings.story.founder[0]` | from the {place} | From the {place} (card line, its own line) |
| `.strings.story.bred[0]` | of {A} | Bred from {A} and {B} (wording: one line (UI/UX to confirm room); drop bred[1]) |
| `.strings.story.bred[1]` | and {B} | (removed, folded into bred[0]) (see bred[0]) |
| `.strings.story.memory` | remembers the {place} | Remembers the {place} (card line, its own line) |
| `.strings.speciesLineExamples[0]` | your Loika, adult | Your Loika, adult (example follows speciesLine) |
| `.strings.speciesLineExamples[1]` | your Loika, young | Your Loika, young (example) |
| `.strings.speciesLineExamples[2]` | your Loika, elder | Your Loika, elder (example) |
| `.strings.residentContextExamples[0]` | an adult Loika | An adult Loika (example) |
| `.strings.residentContextExamples[1]` | a young Loika | A young Loika (example) |
| `.strings.residentContextExamples[2]` | an elder Loika | An elder Loika (example) |

### prototypes/ui/specs/stationhome.json (30)

| key path | old | new |
| --- | --- | --- |
| `.strings.away` | away | Away |
| `.strings.readout.allTrip` | all on a trip | All on a trip |
| `.strings.stations.pods.empty` | empty | Empty |
| `.strings.stations.incubator.empty` | empty | Empty |
| `.strings.stations.incubator.canIncubate` | a pod can incubate | A pod can incubate |
| `.strings.stations.incubator.growing` | a bud growing | A bud growing |
| `.strings.stations.incubator.ready` | the bud is ready | The bud is ready |
| `.strings.stations.companion.awayNoName` | on a trip | On a trip |
| `.strings.stations.companion.dockedNoName` | at home | At home |
| `.strings.stations.bay.waitingOne` | a crate in | A crate in |
| `.strings.stations.bay.portrait` | a portrait in | A portrait in |
| `.strings.stations.bay.portraitNoName` | from a sitting | From a sitting |
| `.strings.stations.bay.lastTrip` | from the last trip | From the last trip |
| `.strings.stations.bay.trips` | from {n} trips | From {n} trips |
| `.strings.stations.bay.clear` | berths clear | Berths clear |
| `.strings.needs.crates.noticeOne` | a crate waits in the bay | A crate waits in the Bay |
| `.strings.needs.budReady.notice` | the bud is ready | The bud is ready |
| `.strings.needs.meet.notice` | meet {name} | Meet {name} |
| `.strings.needs.newPods.noticeOne` | a new pod in the case | A new pod in the case |
| `.strings.needs.glints.noticeOne` | a pod glints | A pod glints |
| `.strings.needs.waitingPods.noticeOne` | a pod waits for a well | A pod waits for a well |
| `.strings.needs.budGrowing.notice` | a bud is growing | A bud is growing |
| `.strings.line.needs.crates.noticeOne` | a crate waits in the Bay | A crate waits in the Bay |
| `.strings.line.needs.budReady.notice` | the bud is ready | The bud is ready |
| `.strings.line.needs.portrait.noticeNoName` | a portrait has come | A portrait has come |
| `.strings.line.needs.meet.notice` | meet {name} | Meet {name} |
| `.strings.line.needs.newPods.noticeOne` | a new pod in the case | A new pod in the case |
| `.strings.line.needs.glints.noticeOne` | a pod glints | A pod glints |
| `.strings.line.needs.waitingPods.noticeOne` | a pod waits for a well | A pod waits for a well |
| `.strings.needs.crates.action` | Open the bay | Open the Bay (Bay is the room) |

### prototypes/ui/specs/station/incubator.json (6)

| key path | old | new |
| --- | --- | --- |
| `.strings.readyIn` | ready in about {n} min | Ready in about {n} min |
| `.strings.crossBudFallback` | a {Species} bud, past 208 px | A {Species} bud, past 208 px |
| `.strings.empty` | ready for a new bud | Ready for a new bud |
| `.strings.noBay` | no bay free | No bay free |
| `.strings.painting` | its painting is on its way | Its painting is on its way |
| `.strings.offline` | waiting for a signal | Waiting for a signal |

### prototypes/ui/specs/station/library.json (15)

| key path | old | new |
| --- | --- | --- |
| `.l1.strings.subjects.one` | a new look | A new look |
| `.l1.strings.subjects.many` | new looks | New looks |
| `.l1.strings.subjects.none` | no species seen yet | No species seen yet |
| `.l2.strings.faceReleased.nameless` | in the wild | In the wild |
| `.l2.strings.familyNameless.home` | at home | At home |
| `.l2.strings.familyNameless.trip` | on a trip | On a trip |
| `.l2.strings.familyNameless.wild` | in the wild | In the wild |
| `.l2.strings.metOnly` | seen, no pod identified yet | Seen, no pod identified yet |
| `.l2.strings.carried.two[0]` | carried by {A} and {B} | Carried by {A} and {B} |
| `.l2.strings.carried.two[4]` | carried by more than one | Carried by more than one |
| `.l2.strings.carried.many[0]` | carried by {A} and more | Carried by {A} and more |
| `.l2.strings.carried.many[3]` | carried by more than one | Carried by more than one |
| `.l2.strings.carried.one[0]` | carried by {A} | Carried by {A} |
| `.l2.strings.carried.one[1]` | carried by one of yours | Carried by one of yours |
| `.l2.strings.carried.none` | none of yours carries it yet | None of yours carries it yet |

### prototypes/ui/specs/station/namer.json (3)

| key path | old | new |
| --- | --- | --- |
| `.strings.context` | a name for your {Species} | A name for your {Species} |
| `.strings.startCapital` | a name starts with a capital | A name starts with a capital |
| `.strings.noSuggest` | no names left to suggest | No names left to suggest |

### prototypes/ui/specs/station/panel.json (8)

| key path | old | new |
| --- | --- | --- |
| `.strings.toRoom` | to {room} | To {room} |
| `.strings.wildPod.cards.return.line` | it goes back to the {place} | It goes back to the {place} |
| `.strings.fitUpgrade.cards.fit.line` | reaches further | Reaches further |
| `.strings.dock.cards.later.line` | they wait while docked | They wait while docked |
| `.strings.dock.oneCrate` | a crate to the case | A crate to the case |
| `.strings.growNow.cards.grow.line` | hatches now | Hatches now |
| `.strings.growNow.cards.wait.line` | ready in about {n} min | Ready in about {n} min |
| `.strings.dock.cards.open.name` | Open the bay | Open the Bay (Bay is the room) |

### prototypes/ui/specs/station/pods.json (22)

| key path | old | new |
| --- | --- | --- |
| `.strings.empty` | the case is empty | The case is empty |
| `.strings.dockToBring` | dock the Companion for its crates | Dock the Companion for its crates |
| `.strings.openBay` | open the crates first | Open the crates first |
| `.strings.explore` | take the Companion exploring | Take the Companion exploring |
| `.strings.compareHere` | they differ here | They differ here |
| `.strings.compareElsewhere` | they differ in another chapter | They differ in another chapter |
| `.strings.compareSame` | no read trait differs | No read trait differs |
| `.strings.thisPod` | this pod | This pod |
| `.strings.theSpecies` | every {species} | Every {species} |
| `.strings.everySpecies` | every {species} | Every {species} |
| `.strings.unknownSubject` | sealed until identified | Sealed until identified |
| `.strings.needMore` | needs more {icons} | Needs more {icons} |
| `.strings.needMoreFrom.field` | needs more {icons}: go out | Needs more {icons}: go out |
| `.strings.needMoreFrom.bench` | needs more {icons}: watch your mibis | Needs more {icons}: watch your mibis |
| `.strings.needMoreFrom.fieldOrPod` | needs {icons}: go out or return pods | Needs {icons}: go out or return pods |
| `.strings.needMoreFrom.fieldAndBench` | needs {icons}: go out and watch | Needs {icons}: go out and watch |
| `.strings.glintHere` | something new here | Something new here |
| `.strings.glintPod` | something new waits | Something new waits |
| `.strings.outcomes.identify` | the species shows | The species shows |
| `.strings.outcomes.identifyNew` | a new species | A new species |
| `.strings.outcomes.read` | both copies of its traits | Both copies of its traits |
| `.strings.outcomes.create` | free until Incubate | Free until you incubate |

### prototypes/ui/specs/station/sitting.json (2)

| key path | old | new |
| --- | --- | --- |
| `.strings.once` | one sitting each, ever | One sitting each, ever |
| `.strings.portraitContext` | painted and framed | Painted and framed |

### prototypes/ui/specs/station/vivarium.json (3)

| key path | old | new |
| --- | --- | --- |
| `.strings.painting` | its painting is on its way | Its painting is on its way |
| `.strings.out` | out with the Companion | Out with the Companion |
| `.strings.empty` | nobody lives here yet | Nobody lives here yet |
### Outside the spec tables

| where | old | new | note |
| --- | --- | --- | --- |
| `prototypes/workbench/frames/species-S03, S05, S06, S07, S09, S15.json`, chapters[].name (6 files, 1 name each; the same word is also an object key in each, 6 more) | "Legs & tail" | "Legs & Tail" | One spelling. Pods already overrides it (pods.json strings.legsTail), the Library plate and the journey goldens still read "Legs & tail" ("Show Legs & tail", "Legs & tail, all found"). The key is a lookup: change it with whatever reads it, or leave the key and change only `name`. |
| `prototypes/workbench/framework/species.mjs:26` CHAPTER_NAMES | "legs-tail": "Legs & tail" | "Legs & Tail" | The source of the frames' chapter names. |
| `design/style-guide/README.md` §5 "Case" and `design/style-guide/station-layouts.md:281` | "Legs & tail" as the example; "sentence case for sentences" | replace with the table in §1; example "Legs & Tail" | Documents follow the decision (owner, 2026-10-08 17:52), not the other way round. |
| `prototypes/station/src/state.mjs` mirrored strings that reach the face as lines (565 label "Open the bay"; 566 "the bud is ready", label "Open the incubator"; 567 "meet {name}"; 569 to 574 the needs texts; 578 "a bud is growing", label "Look at the incubator"; 819 to 822 the shape's blockers; 890 to 894 the release blockers; 938 to 940 the pair blockers) | lowercase starts, "bay" and "incubator" for rooms | capital first; "Open the Bay", "Open the Incubator", "Look at the Incubator" | About 25 strings. These duplicate the tables in home.json, habitat.json and create.json; the table wins. Either read the table or case them the same. |
| `prototypes/station/src/sitting.mjs:106-111, 140, 144-147, 175, 187` | "pick a mibi", "back in the wild", "sits when you dock", "one sitting each, ever", "no pose seen yet", "no expedition yet", "no sitting held", "pick a pose {name} has done" ... | capital first | 14 strings; same duplication as above. |
| `prototypes/station/src/views/pods-props.mjs:183` | `"two " + S.spName(A) + " pods"` | `"Two " + spName + " pods"` | Composed; see §3. |

### Companion (prototypes/exploration/index.html)

The Companion's lines that start a line in lowercase, from `CARE_TEXT` (30 entries) and the species `abText`; each takes a capital first letter and nothing else changes. Line numbers are the file's.

- `CARE_TEXT` (lines 630 to 657, 30 entries): tendOnce "once a day"; tendedToday "tended today"; tendAfter "after the expedition"; walkOnce "once a turn"; takeCtx "goes with you now"; full "the Companion is full"; leaveCtx "comes home now"; visitCtx "with you"; withYouThisExp "with you for this expedition"; stLeads, stCanLead, stTooYoung, stGrowsWithCare ("with you · leads the Probe" and the three like it); stHome "at home"; stHomeBonded "at home · grows on the Companion"; noOneWith "no one with you"; noOneGrown "no one grown yet"; leadCtx "joins the Probe"; onlyGrown "the only grown one"; leadsThisExp "leads this expedition"; takeOne "dock to take one along"; youngCare "young · grows with care"; youngTime "young · grows in time"; othersHome "the others are at home"; takeAlong "take mibis along"; whenDocked "when docked"; abOther "no field ability yet"; riderTime "grows in time in the Companion"; riderCare "grows with care in the Companion"; spOther "a Station species". Everything after a middle dot stays lowercase.
- `SPECIES[].abText` (lines 357 to 372): "calms wary creatures", "digs narrow burrows", "sniffs out buried pods": these start the Lead card's ability line (companion-screens.md, "Line 112, 320"), so "Calms wary creatures", "Digs narrow burrows", "Sniffs out buried pods". After "Partner: {name} · " they continue the line and stay lowercase (composed, see §3).
- `lineCtx` (line 4067) and `drawLine` (4091): the context `r` is drawn as written; capitalise its first letter there (one place for every `ctx` the Companion sets, including "head back to the start" from `SEND_TXT.back`, "not surveyed" and the other `surveyWord` results used as legend lines, and `dirWord` results used alone, such as "in the middle").
- `waitChanges` joins its changes with " · " and capitalises only the first (`cap(ch.join(' · '))`, line 1812): that already follows the rule (a dot continues the line); no change.
- The roughly 150 "Label · gist" strings (`SIGN_LINE`, `SIGN_NAME_LINE`, `TILES`, the `fxMsg` notes): no change.
- `design/style-guide/companion-screens.md`: the quoted strings in its tables follow the same capitals (the quoted context strings, for example `the others are at home`, `no one grown yet`, `goes with you now`). The doc follows the code after the pass.

### Count of changes by file

| file | changes |
| --- | --- |
| `bench.json` | 8 |
| `cargo.json` | 3 |
| `create.json` | 10 |
| `cross.json` | 11 |
| `frame.json` | 45 |
| `habitat.json` | 40 |
| `home.json` | 30 |
| `incubator.json` | 6 |
| `library.json` | 15 |
| `namer.json` | 3 |
| `panel.json` | 8 |
| `pods.json` | 22 |
| `sitting.json` | 2 |
| `vivarium.json` | 3 |
| spec tables, subtotal | 206 |
| composed templates (§3, no table edit, composer change) | 34 in the spec tables |
| `prototypes/workbench/frames/species-S*.json` (6 files) | 12 (6 names, 6 keys) |
| `prototypes/workbench/framework/species.mjs` | 1 |
| `prototypes/station/src/state.mjs` | about 25 |
| `prototypes/station/src/sitting.mjs` | 14 |
| `prototypes/exploration/index.html` (Companion) | 30 in `CARE_TEXT`, 3 `abText`, 1 composer |
| `design/style-guide/README.md`, `station-layouts.md`, `companion-screens.md` | 3 documents |

## 3. Composed strings

A composed string is one whose first letter depends on what the builder puts first. The tables cannot hold its final case, so the composer does. **One rule for all of them: fill the template, then capitalise the first letter of the assembled line, skipping leading glyphs and spaces (✕, ⚡, ◆, ✓, "…") and leaving the line alone when its first character is a digit. Never recase anything inside the line: names, species and chapters come in already capitalised; common nouns, stages, places, habits and looks come in lowercase.** The helper is `S.cap` (state.mjs:59) applied after `fill()` (words.mjs), once, in the builder that sets `line.ok`, `line.subject`, `line.need`, a notice or a caption; never in the table.

Where the capital goes (the template, its table, and what the composer does):

| template (file, key) | opens with | composer rule |
| --- | --- | --- |
| `{a} {species} pod, ready to incubate`, `{a} {species} pod needs more`, `{a} {species} pod waits unread` (home.json needs.couldGrow, needs.toRead, line.needs.couldGrow) | the article | "A Loika pod, ready to incubate"; "An Untuva pod needs more". The article is capitalised, the species already is. |
| `{a/an} {Species}, fully known` (create.json founder), `{a/an} {Species} bud` (incubator.json bud), `{a} {Species}` (home.json stations.incubator.species), `{a} {stage} {species}` (habitat.json residentContext, vivarium.json resident, sleeper) | the article | "A Loika bud", "An adult Loika, asleep". The stage word stays lowercase. |
| `{n in words} ...` and `{count} ...` (bench.json toMend; cargo.json arrival.mended, arrival.subjects.crates, subjects.waiting; create.json surprise.more; habitat.json partners; home.json needs.crates.notice, newPods.notice, glints.notice, waitingPods.notice and the line.needs twins; panel.json dock.cards.open.line) | a spelled count, or "no" | "Two crates wait in the Bay", "No plates to mend". When the count is dropped (seven or more) the line starts with the next word: "Crates wait in the Bay" ("crates wait in the bay" today, frame.json idle.strings.crates.many). |
| `{n} ...`, `{m} ...`, `{k} ...` (home.json library.new, readout.home, readout.trip, stations.pods.count, pods.kinds, bay.waiting; library.json l1 subjects.few) | a numeral | Not recased: "3 at home", "20 new", "{n} new looks" with digits stays. In words ("two new looks", library subjects.few spells two to six) the composer capitalises: "Two new looks". |
| `{low} to {high}` (cross.json blend) | a look | A look alone takes a capital: "Charcoal to russet". |
| `{n in words} ... mended, free` (cargo.json arrival.mended) | a count | "Three mended, free". |
| a place or habit standing alone as the bottom line's subject: `strings.watchHabits.*` ("shaking itself dry", "calming a creature", "curled up asleep", "sniffing", "puffing out its down", "digging", "glowing", habitat.json) and `placeWord` = "the " + PLACE_WORD ("the meadow", "the pond edge", "the rock field", "the wood", "the cave"; sitting-props.mjs:88) | a lowercase fragment | Fragments inserted in other strings stay lowercase ("Dot is seen digging", "Back to the meadow"). When one stands alone as `line.subject` (sitting pose and place steps) the builder capitalises it: "Shaking itself dry", "The meadow". The table keeps the lowercase form. |
| `S.spName(A)` at pods-props.mjs:183: `"two " + name + " pods"` | a count | "Two Loika pods". The species name is the frame's, already capitalised. |
| Lines that begin with a glyph | ✕, ⚡ | create.json traitLine.clash "✕ {Trait}: won't grow like this": the first letter is the trait, already capital; no change. |
| `{Trait}: {look}` family (create.json traitLine.*) | a trait | Trait is capital; the look after the colon is lowercase: "Markings: pale". When the look is "{shows}" and a state word follows ("{sleeping} asleep") they stay lowercase. |
| The goal line (frame.json goal.step.*, goal.aim.*, goalWarn.*) | a verb or "then" | Table entries start lowercase today; they are in §2 as literals ("Find a first pod", "Cross {name} next"). The ones that begin with a placeholder are composed: "{name} grows with care" is already capital; "{a} ..." and "{n in words} ..." as above. "Then the Loika pod needs ⚡" takes the capital on "Then" (see §4 for the wording). |
| Home's top bar: action zone, notice zone (home-props.mjs, lineOf) | two zones | Each zone starts with a capital: "Open the Bay · The bud is ready". This is the one place a middle dot separates two lines; everywhere else a dot continues a line. |
| Ladders (library-props.mjs `ladder`, `carried.*`, `faceReleased`, `familyAt`) | the first rung that fits | Every rung of a ladder is cased the same; measure the longest again (capitals are about 1 to 3 px wider per line), the 208 px / 6-word rule decides the rung, never the case. |
| Possessives and ribbons: `{Name}'s portrait`, `{Name}, a young {Species}`, `{A} and {B}'s bud` | a name | No change. |
| Companion `tended`, `grownLeads`, `walked`, `rideAlong`, `fxMsg(...)` lines | a name or the article | Start with a name or `cap(...)`; after the middle dot lowercase. `tended` ends "· it remembers the {place}" / "· it hasn't been out yet": stays lowercase after the dot. |
| Message plates (incubator.json noBayPlate, panel arrival text, the Companion's `fxMsg`) | a capital | Sentences; each sentence capital, full stop at the end of each. |

## 4. Open questions

For the UI/UX designer:

1. **Widths.** A capital first letter is wider than its lowercase by 1 to 3 px at 16 px. Re-run `ui/specs/measure.mjs` on the changed strings against the 208 px subject slot, the 272 px notice slot, the 88 px back slot ("Back" fallback), the shelf's 170 px wish word and every ladder's longest rung; the goldens and `face/tests/vectors/{frame-words,pods-words,metrics}.json` regenerate after the pass.
2. **The wish shelf.** "Eyes: between" is wider than "between": does the wish row (shelf.wish.word, clip 170 px, 16 px) hold it, or does the trait go on a second quiet line under the look? The words are "{Trait}: {look}" either way.
3. **The Habitat card's story lines.** `story.bred` is two lines today ("of Dot", "and Bean"). Each line takes a capital, which makes "And Bean" a bad line. My change is one line, "Bred from {A} and {B}" (the room: the card's line clip). If it does not fit, tell me the room and I will word two short lines that each stand alone.
4. **Chapter and trait names in the rail and the Book at 20 px.** "Legs & Tail" is 103 px at 20 px against 97 px for "Legs & tail" (metrics.json); does the rail tab hold it? (It already does on Pods today, because pods.json spells it that way.)
5. **Top bar, the goal and the warning lines.** "Then the Loika pod needs ⚡" (frame.json goalWarn) opens with "Then" after a capitalised action: confirm the pre-spend warning stays in the right notice slot with a capital.

For the game designer:

6. **"bay" is two things.** The Bay is a room (the crates); a bay is a berth in the Vivarium ("no bay free", "free a bay in the Vivarium", "berths clear" on Home). I capitalise the room ("Open the Bay") and keep the berth lowercase. If they are one thing, tell me and one spelling goes everywhere.
7. **"Free until Incubate"** (pods.json outcomes.create) names the ✓ verb mid-line with a capital. My wording: "Free until you incubate". It is a fact, not a name; please confirm the rule it states ("nothing is spent before the ✓ on Create").
8. **A look standing alone.** Which looks are unique to one trait in a species? In the frames only 21 of 182 look names repeat across traits of the whole catalogue, but "between" is in 43. If a species ever has a look that never repeats, the trait may be dropped on the shelf; I recommend writing the unit uniformly instead, so the shelf never changes shape.
9. **Material words.** The Station shows ⚡ ◆ ❀ as icons; the Companion writes "Energy", "Data", "Essence". The cargo spec's `energy`, `data`, `essence` enum values are ids, not shown. Confirm no Station screen writes the words.

For the owner (a name, so yours to settle):

10. **"Legs & Tail".** The 2026-10-08 17:52 ruling made every word of a tab label capitalised ("Legs & Tail"). The frames, the Library plate, the style guide and the journey goldens still write "Legs & tail". I recommend the one spelling "Legs & Tail" everywhere (frames, Library, bottom line, guide), because "Legs & tail" next to "Legs & Tail" in the same app is the inconsistency you pointed out. It is the only multi-word name in the table, so it is the only place the application uses Title Case, and it is a name.

For QA: add a lint to the string-table test: every leaf under a `strings` object must start with a capital letter, a digit, a glyph, a `{Name}`-style placeholder, or be listed in a `fragments` array (stages, watchHabits, hatchPlace, states, places, keys). That keeps the rule from drifting after this pass.

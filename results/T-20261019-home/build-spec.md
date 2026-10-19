# Home: the build spec (UI/UX, 2026-10-18 20:35)

This replaces Home's right-hand column of five modules and its bottom line with the approved layout:
- **a top bar**, which carries the line;
- **two windows:** the Vivarium (left, large) and the Library (right);
- **one console** of four stations, Pods, Incubator, Companion and Bay, whose order tells the sequence.

**What Home is for:** in two seconds it answers "who is here, and what is new in my research?" (the two windows) and "what needs me now?" (the lamps and the line). Detail is always one press away, at full screen.

**The owner's rulings folded in:**
- no loop arrows, circuit, travelling light or ports;
- mibis tiny everywhere, so an adult stands 54 px tall in Home's window;
- the Library's Home module is the specimen, in the Home module's tone;
- the Incubator is the painted capsule;
- Create's verb is Incubate;
- the Probe is drawn upright;
- major features first.

**Scope:** `home.json`, `home.c`, `home-props.mjs` and the Home goldens.
- Idle and the Vivarium's whole share `home.c`, and they are unchanged.
- Every other screen keeps its top bar and bottom line.

All rects are `[x, y, w, h]` at 1× on 1024 × 600, and every picture is drawn 1:1. The faces have Inter at 16, 20 and 28 only.

## 0. Tickets (about 4 hours each)

| Ticket | Contents | Needs |
| --- | --- | --- |
| **H1: the frame** | §1 layout, §2 top bar and the line, §5 keys and focus, §6 full screen, §8 removals; the stations and windows drawn with their words, but with placeholder pictures | nothing new: it starts at once |
| **H2: the Vivarium window** | §3 | H1; no new masters |
| **H3: the console's pictures** | §4.3 | H1; two new masters from the art director (§9) |
| **H4: the Library module** | §4.2 | H1; the specimen renderer brought into the public build (§4.2), and the art director's sign-off on its Home tone |

H2 and H3 can run side by side. H4 waits on its art.

## 1. Layout

| Region | Rect | Drawn as |
| --- | --- | --- |
| Top bar | [0, 0, 1024, 40] | the shared `frame-top-bar-1024x40`, with Home's own words (§2) |
| Vivarium bezel | [16, 48, 620, 400] | a panel: radius 10, 1 px `hairline` edge, 1 px `bevel` line on top, header 30 |
| Vivarium window | [24, 78, 604, 362] | radius 6, inner shade (§3) |
| Library bezel | [648, 48, 360, 400] | the same panel |
| Library window | [656, 78, 344, 362] | the specimen (§4.2) |
| Console | [16, 460, 992, 132] | `bar` ground, radius 10, 1 px `hairline` edge |
| Stations | 226 × 98 at y 477; x 32 (Pods), 270 (Incubator), 528 (Companion), 766 (Bay) | panel, radius 8, `bevel` line on top |

- **Gaps:** 12 between the bezels, 12 above the console, 8 at the foot. There is no bottom line on Home.
- **Panels, edges and bevels** are drawn by the face's own rect primitives, palette-exact, the same way the focus ring is. No masters are needed for them. If a radius can't be drawn palette-exact, the art director cuts corner pieces instead.
- **The bezel header:** the title (16, `bone`) at (x + 12, y + 7), then at most one readout (16, `fog`) 8 after it.
- **The expand mark:** four 4 px corner ticks in a 14 px square, `mist`, at (right − 30, y + 8). It is not a focus target.

## 2. The top bar and the line

- **Left:**
  - "Station" (20, `bone`) at x 16;
  - then the station's place name (16, `mist`), 12 after it, when the save has one.
- **Right:**
  - the date (16, `mist`), as "Sat 17 Oct";
  - the clock (20, `bone`), right edge at 1008;
  - both from the device clock.
  - The material counters and the Companion mark are not on Home's bar; they stay on every other screen.
- **Centre: the line**, in [320, 8, 520, 24], centred. It takes over the job of the bottom line:
  - **At rest (no ring):**
    - **With needs:** at most two needs, joined by " · ", in `amber`, with the 12 × 12 `home-lamp-amber` before them. The first carries the ✓ cap: "✓ Open the Bay · the bud is ready".
    - **With none:** the goal (`frame.json` `strings.goal`), in `mist`, with no lamp and no cap.
  - **With a target focused:** what ✓ does there, with its cap: "✓ Open the Bay". Its subject, if it has one, follows in `mist` after " · ".
  - The line never wraps. Only a subject may end in "…", and only at the zone's edge.
- **Needs, in this order** (the existing `strings.needs` and `needKey`, reordered):
  1. crates wait;
  2. the bud is ready;
  3. a portrait has come;
  4. a chapter cleared;
  5. a mibi grew up or was born (its name tag, §3);
  6. new or glinting pods;
  7. pods waiting for a well;
  8. a pod could be incubated.

  A need lights its station's lamp (§4.3) and clears when it is acted on.

## 3. The Vivarium window (H2)

**The picture:**
- **A 1:1 crop of the same Idle painting the Vivarium uses** (`idle-vivarium-{dawn,day,dusk,night}-1024x568`, by the light), so a Home mibi and a Vivarium mibi are the same size in the same world, with no new master.
- **The crop:** painting rows 194 to 555 (362 rows) and columns cx to cx + 603. **cx = 64** (the art director, `art/window-cx-proof-day.png`): the wall and pipe drop out, the burrow stays whole, and the view closes on the ridge and the pond.
- Everything below follows cx. The art director has checked the ground formula.
- The crop is cut in the logic process and cached per light.
- The old `home-glass-*-640x488` masters go.

**Residents:**
- **Up to six adults and juveniles at home walk** (stand sizes: home 54 and 40, as now). Each is drawn with its contact shadow as in the Vivarium.
- More than six: the readout counts them, and the window shows the six with the most recent activity.

**Ground:** the Vivarium's ground profile, moved to this crop, with no new measurement:
- groundTop_home(x) = groundTop_viv(x − 24 + cx) − 36;
- the window's foot is at feetY 435;
- F.x is held to 32 + ⌊W/2⌋ … 620 − ⌈W/2⌉.

This settles Home's profile, which the Vivarium spec had left to be measured.

**Ring and tags:**
- **On Home they are not focus targets.** The way down is the full-screen Vivarium (§6).
- **The event tag:** grown up, born, or back from a trip. It is the house name tag, on that mibi only, until the player visits it. It uses the Vivarium spec's rules (top at feetY + 16, flipped over the figure past the window's foot), and it carries no lift.

**Readout:** "{n} at home · {m} on a trip", with each part shown only when non-zero, and "all on a trip" when nobody is home.

**The away frame:**
- **Placement:** 64 × 64 at (556, 352), with a 1 px `hairline` edge and a `panel` ground.
- **The figure:** the first mibi out on a trip, at its world size (54 adult, 40 juvenile), composed from its stand and bottom-centred.
- **The caption:** "away" (16, `frost`), centred under the frame at y 418.
- **Walkers keep out of [548, 344, 80, 96]** while the frame shows.

**Sleepers:**
- The with-you bed and its sleepers leave Home. The bed is the Vivarium's.
- The Companion station says "{name} at home" (§4.3).

## 4. The Library module (H4) and the console (H3)

### 4.2 The Library module

**The picture:**
- **The specimen for the chosen species, at the Home module's tone**:
  - the radial form grown from the species' genome;
  - found looks as filled beads in their own colour;
  - unknown looks as open rings;
  - sealed chapters veiled, drawn with no beads;
  - a warm, deep ground, with print grain and no starfield.
- It fills the window at 344 × 362.

**How it is made:**
- **The renderer:** the team's specimen generator, brought into the public build as a module of the logic process (the Node side, as `layered-stand.mjs` is). It is ported as-is, not redrawn.
- **The output:** a painted RGB picture, ported as-is and **not** snapped to the palette (snapping turns the ground cold and the russet orange), plus a list of bead centres. It is treated as painted art, like the Idle painting. The window's inner shade (§1) replaces the generator's own edge gradient.
- **Caching:** the result is cached by a digest of the species' found looks, and it is re-rendered only when a look is found.
- **Print** the render time.

**The species:**
- the pinned wish's species;
- with no wish, the species with the fewest looks still unfound, ties going to the most recently active;
- never a species with nothing found.

**Words:**
- **Header:** "Library" alone, with **no count**. The beads show progress, and numbers are only for prices and supplies.
- **Captions:**
  - "{n} new" (16, `gold`), at the lower left (x 668, y 412), hidden at 0;
  - "{Species} genome" (16, `mist`), right-aligned at x 988, y 412.

**The new-look glint:**
- `glint-star-12x12`, centred on each bead of a look found since the Library was last opened full screen.
- It stays until seen, and nothing expires it.
- It fades on the 16-level stage dither, in and out over 2 s.
- At most 8 are drawn; more than 8 still count in "{n} new".

**The slow breathing:**
- **Four pre-rendered brightness levels** of the picture, made by the renderer with the main one.
- One whole-picture swap every 2 s, cycling 1 2 3 4 3 2.
- A swap is 124,528 px. On a swap frame the residents don't step (the scheduler skips them for that frame), so the frame stays under 153,600.
- Under reduced motion there is no breathing and no fade: the glints simply show.

**Counts:**
- Every trait's current looks count: 20 for the version-4 Loika.
- A plain look shows as a found bead once seen, and never counts toward "{n} new".

### 4.3 The console's stations

**Every station:**
- its name (16, `fog`) at (12, 8);
- the lamp at its top right (the existing 12 × 12 `home-lamp-hairline` off, `home-lamp-amber` when it needs the player);
- **line 1** (20, `bone`, at most 4 words) at (12, 34);
- **line 2** (16, `mist`, at most 4 words) at (12, 64);
- its picture, right-aligned 12 in and vertically centred.

Nothing is red or negative, and there is never a third line.

| Station | Picture | Line 1 / line 2 | Amber when |
| --- | --- | --- | --- |
| **Pods** | the case's **six wells**, 2 rows of 3, 32 × 32 `home-well` at a 4 px gap; a pod in a well is its layered rack pod (`home-rack-pod-*-24x32`); a glint `glint-star-12x12` on a pod with one | "{n} in the case" / "{k} kinds" (k ≥ 2); "the case is empty" when empty | a pod has a glint, or new pods are unread |
| **Incubator** | **the painted capsule** at 56 × 86 (`masters/capsule/*-56x86`: shell, glass, door, interior, and the bar lit to progress), with the bud's pod inside, as Home's Incubator module already draws it. No minutes on Home: the bar carries the progress | empty: "empty" / "a pod can incubate" (only when one can); growing: "a bud growing" / "a {Species}"; ready: "the bud is ready" / "a {Species}" | the bud is ready; the bar stays as it is, and only the lamp turns |
| **Companion** | `companion-upright-docked-28x46` (the device in its cradle, screen lit) or `companion-upright-away-28x46` (the empty cradle, the mark in line) | away: "{name} on a trip", with no line 2, no progress and no ETA; docked: "{name} at home", and as line 2 the Probe's plates as up to 4 `home-shield-{whole,lost}-12x24` | never: the dock lights the Bay |
| **Bay** | **three berths, 2 px apart**: `berth-shut-26x24` (slats) or `berth-crate-26x24` (a waiting crate with its 2 px amber underline); plus `berth-portrait-18x24`, the gilt frame, as a fourth while a portrait crate is in. Four come to 102 wide, inside line 1's room | waiting: "{n} crates in" / "from the last trip" or "from {n} trips"; clear: "berths clear", with no line 2 | crates are unopened, or a portrait crate has come |

- **The Probe has no station.** Its plates show on the Companion station when docked. Mending and upgrading are reached through the Companion station.
- **After a dock:** once the arrival's Later lands on Home, the Bay's berths show the crates by a cut. The old `crateIn` slide into the Cargo module goes with the module.

## 5. Keys and focus (H1)

- **Targets:** the two bezels and the four stations. The house ring (2 px, 4 out) follows each outline: radius 14 on a bezel, 12 on a station.
- **At rest** there is no ring. ✓ does the first need in the line. With no need, ✓ does nothing.

| From | ◀ | ▶ | ▲ | ▼ |
| --- | --- | --- | --- | --- |
| rest | — | — | Vivarium | Pods |
| Vivarium | — | Library | — | Pods |
| Library | Vivarium | — | — | Bay |
| Pods | — | Incubator | Vivarium | — |
| Incubator | Pods | Companion | Vivarium | — |
| Companion | Incubator | Bay | Vivarium | — |
| Bay | Companion | — | Library | — |

- **✓ on a bezel** opens it full screen (§6).
- **✓ on a station** opens its room:
  - Pods: the collection;
  - Incubator: the Incubator;
  - Companion: the Probe bench while docked, otherwise nothing, and the line says "the Companion is on a trip";
  - Bay: Cargo.
- **The line** names each verb ("✓ Open the Bay").
- **← on Home** does nothing.
- **Room keys:** Home with a ring on Home, the ring back to rest; **Home at rest, the Station rests: Idle** (today's `events.rest`, 200 ms then the 180 ms dither to Idle; Idle wakes as it does now); Vivarium, the Vivarium full screen; Library, the Library full screen; Research, Pods. From any other screen, Home opens Home at rest, so a second press rests.
- **Dock:** as `frame.json` `navigation.dock` (the arrival plays, then Later returns here).

## 6. Full screen (H1)

- **Open:** ✓ on a focused bezel, or the room key, goes to the Vivarium's whole (today's `vivarium.json`, with mibis focusable) or to the Library.
  - Until the Library build lands, the Library goes to today's Library screen.
- **The change is the 180 ms stage dither** (16 levels). Nothing scales.
- **Close:** ← from the Vivarium's whole or the Library returns to Home, with the ring on that bezel.

## 7. Budgets (asserted by the tests, as on the other screens)

- **Objects:** at most 400 on Home (the table holds 1,024). Estimate:
  - frame and words about 30;
  - window about 20;
  - Library 12;
  - stations about 50;
  - total about 110.
- **Props:** at most 32 KiB. Estimate about 4 KiB.
- **Dirty area:** at most 153,600 px per frame.
  - **Print:** a walk step with six residents, a breathing swap (residents held), a glint fade step, a lamp change, and the ring moving between a bezel and a station.
- `tickBudget` 148,000, as the Vivarium.

## 8. Gone from Home (H1)

- **Layout and words:**
  - the column of five modules and its `plate-device-320x88` use;
  - the Probe module;
  - the bottom line;
  - the material counters on Home's bar;
  - the old `home-glass-*` masters.
- **The Vivarium window's old pieces:**
  - the walk band and keepOut;
  - the with-you bed, its mark and the sendoff hops;
  - the rest knob;
  - every focus on a mibi.
- **The old Cargo slide:** the `crateIn` slide.

**Idle (ruled):** with the rest knob gone, Idle is reached by the Home room key pressed at rest (§5). The keys list (`Keys ?` and the Station key sheet) names it: "Home again: rest".

## 9. Masters

| Master | On the gate? |
| --- | --- |
| `idle-vivarium-{dawn,day,dusk,night}-1024x568` (the window's crop) | exists |
| S01 stands and contact shadows (`prototypes/ui/assets/stands/`) | exist |
| `home-well` 32 × 32, `home-rack-pod-*-24x32`, `glint-star-12x12` | exist |
| the capsule set at 56 × 86 (`masters/capsule/`) | exists |
| `home-shield-{whole,lost}-12x24`, `home-lamp-{amber,hairline}-12x12` | exist |
| `frame-top-bar-1024x40` | exists |
| panels, edges, ring, expand ticks | drawn in code, no master |
| `companion-upright-{docked,away}-28x46` | **signed** (the art director): work-queue `results/T-20261019-home/art/`, moved into `prototypes/ui/assets/masters/home/` by H3 |
| `berth-shut-26x24`, `berth-crate-26x24`, `berth-portrait-18x24` | **signed**, as above (proof `art/console-proof-3x.png`) |
| the specimen at the Home tone, 344 × 362 | **tone signed** for the generator's own render. The generator is not yet in the public build (H4 brings it), and the art director re-checks its first public render |

## 10. Checks

- **Goldens:**
  - rest, with nothing needed (the goal in the line);
  - rest with two needs;
  - each station focused, and each bezel focused;
  - all home, some away, none home;
  - an event tag;
  - each Incubator state;
  - the Bay waiting, with a portrait;
  - the Companion docked and away;
  - the Library with 0 and 3 new;
  - each light.
- **Tests:**
  - the focus graph above;
  - the need order;
  - the line's width never overflows;
  - walkers on the moved profile, never in the away frame's keep-out;
  - the budgets in §7.
- **Journeys:** `home-dock-arrival` keeps its arrival steps. Its Home asserts become the Bay station's state and the Companion station's "at home", not the bed.

## 11. Addendum (2026-10-18 22:22): rulings on the H1 build (8471d2cd, stills on work-queue b8bf8f4e)

### 11.1 The line at rest
- **The first need shows by its action, with the ✓ cap. The second shows by its notice.** For example: "✓ Open the Bay · the bud is ready". The builder's reading is right.
- **The needs, in order, with their action and notice** (Home's `strings.needs`):

  | # | Need | Action (first) | Notice (second) |
  | --- | --- | --- | --- |
  | 1 | `crates` | "Open the Bay" | "{count} crates wait in the Bay" / "a crate waits in the Bay" |
  | 2 | `budReady` | "Open the bud" if ✓ opens it in one press (as Home's ✓ does today), else "Go to the Incubator" | "the bud is ready" |
  | 3 | `portrait` (a sitting crate in the bay; new) | "Open the Bay" | "{name}'s portrait has come" (the name in orange); "a portrait has come" only with no name |
  | 4 | `meet` (a mibi grew up or was born) | "Meet {name}" | "meet {name}" |
  | 5 | `newPods` | "Look at the pods" | "{count} new pods in the case" / "a new pod in the case" |
  | 6 | `glints` | "Look at the pods" | as now |
  | 7 | `waitingPods` | "Look at the pods" | as now |
  | 8 | `couldGrow`, while it can be paid | "Look at the pods" | "{a} {Species} pod, ready to incubate" |

- **"A chapter cleared" waits for the Library build.** No such event exists yet, so it is not in the line, and the Library spec adds it.
- **`toRead`, `budGrowing` and `couldGrow`'s "short" variant are no longer needs on Home.** They light nothing, at rest ✓ does nothing for them, and the line shows the goal.
- **"Case", not "rack", Station-wide** in every player-facing string, Cargo's "two crates to the case" included (the game designer). Internal `rack` identifiers stay.
- The lamp and ✓ glyphs before the line are as built.

### 11.2 ✓ with a target focused

| Target | The line |
| --- | --- |
| Vivarium | "✓ Go to the Vivarium" |
| Library | "✓ Go to the Library" |
| Pods | "✓ Go to Pods" |
| Incubator | "✓ Go to the Incubator" |
| Companion, docked | "✓ Go to the Probe bench" |
| Companion, away | no ✓; "the Companion is on a trip", in `mist` (as built) |
| Bay | "✓ Open the Bay" |

There is no subject on a focus. The station's own lines already say its state. **"Open" is only for opening a thing (the Bay, the bud); going somewhere says where** (the decision points' "one verb, one act", per the game designer).

### 11.3 The top bar
- **Left:** with no place name in the save, the bar reads "Station" alone. The place-name slot waits for a save field.
- **Right:** the 24-hour clock and the 12 px gap from the date are confirmed.
- **Not drawn on Home:** the bar's rules at x 256 and 888.

### 11.4 The stations' inner layout (this replaces §4.3's offsets; **this was blocking H3**)

**The lamp** moves to the left of the name: 12 × 12 at (12, 10), with the name at (30, 8).

**The picture:** right-aligned 8 in from the station's right edge, and vertically centred in the 98, except where this table says otherwise.

| Station | Picture | Size |
| --- | --- | --- |
| Pods | 2 rows of 3 slots, 2 apart. A slot holds its rack pod (`home-rack-pod-*-24x32`), or, if empty, a 24 × 32 slot drawn as a 1 px `hairline` rounded outline (radius 6), with no well master | 76 × 66 |
| Incubator | the capsule | 56 × 86 |
| Companion | `companion-upright-*` | 28 × 46 |
| Bay | **in line 1's row** (top at y 32), 2 apart: three berths, plus the portrait berth while one is in | 82 × 24, or 102 × 24 |

**The text column** runs from x 12 to 8 short of the picture's left edge.

**Line 1** (at y 34):
- It is 20 px if it fits the column, else 16 px.
- If it still doesn't fit, only a name in it is cut with "…".

**Line 2** (16, at y 64):
- It is held to the column in Pods, Incubator and Companion.
- In the Bay, it runs to x 214, because the berths sit in line 1's row.

**Measured** (column width, with what fits):

| Station | Column | Line 1 |
| --- | --- | --- |
| Pods | 122 | "6 in the case" 121 at 20 |
| Incubator | 142 | "the bud is ready" 121 at 16 |
| Companion | 170 | "Pip on a trip" 112 at 20; "Maraschino at home" 154 at 16 |
| Bay | 96 (with the portrait) | "3 crates in" 79 at 16 |

### 11.5 Fills
- **Bay, line 1:** "a crate in" when there is one (spelled), "{n} crates in" otherwise.
- **Pods:**
  - empty, line 1 is "empty", with no line 2;
  - "{k} kinds" counts known species only, and shows only at k ≥ 2.
- **Companion's {name}:** the lead mibi, else the first carried. With none, line 1 reads "the Companion at home" or "the Companion on a trip" (16 px, by 11.4).
- **"At home"** = housed minus away. Confirmed.
- **"{n} trips"** = the distinct turns the waiting crates came from. Confirmed.
- **The Bay with only a portrait crate:** line 1 "a portrait in", line 2 "{name}'s portrait" (or "from a sitting" with no name; a sitting crate is never a trip's), the three berths shut plus the portrait berth, and the lamp amber. It never reads "berths clear" while anything waits.
- **The bevel** is the first row inside the edge. Confirmed.
- **The expand mark** is four L ticks with 4 px arms. Confirmed.
- **The windows have square corners.** The bezel carries the rounding, and the window's radius 6 is dropped to keep the face's last source slot free.
- **The window's inner shade** is 2 px of `shadow` along the inside top and left edges, drawn as rects. It is required from H2 (the painting) and H4 (the specimen), and omitted on placeholders.
- **The berths are 2 apart**, as the art director ruled (§4.3).
- **The Companion placeholder** is 28 × 46. Confirmed.
- The ring's dirty-area overrun on the large windows is the architect's.

## 12. Gate of the H1 fix round (b06ef9f9, stills on work-queue 8fadb652)

**PASS, with one wording fix.** The line, the verbs, the stations' inner layout and the fills match §11, and the ring moves are within the architect's limit.

- **The nameless Companion:** line 1 reads **"at home"** or **"on a trip"** (20 px). The station's own name already says "Companion". This replaces §11.5's "the Companion at home / on a trip", which overran the column.
- **Confirmed:**
  - the verb cap of 5 words ("Go to the Probe bench");
  - the line-width test on pairs in need order (only the first two ever show; the widest is 461 of 484);
  - the Companion's no-name lines are now 2 words, so their 5-word allowance is moot.

## 13. Gate of H2, the Vivarium window (2866bf68, stills on work-queue ed82b323)

**PASS.** I checked these against the stills:
- the crop at cx 64 in all four lights;
- the world-size walkers and their shadows;
- the night curls, which follow the Vivarium's night rule (sleepers curl where they rest);
- the event tag at feetY + 16;
- the away frame and its caption;
- the readout;
- the inner shade.

**The four gaps:**
1. **The inner shade's colour is `void`.** "`shadow`" in §11.5 meant the darkest palette ink, and the palette's name for it is `void`.
2. **"The six with the most recent activity":** the mibi with a pending meet is always in. The rest fill by the newest life event (born or grown up), newest first, with ties in bay order. That is the builder's rule, with grown up added. **The game designer has confirmed it:** born and grown up are the only dated events the Station records for a mibi. "Visited" and "fed" are not recorded, and "back from a walk" has no per-mibi turn yet.
3. **"Back from a trip" is dropped from the event tag.** No event marks it, and the dock's arrival already shows who came home. The tag stays for grown up and born (the `meet` need).
4. **A species with no layered stand:** its whole picture, bottom-centred and clipped to the away frame, is fine until its stand exists. Only S01 has stands, and it is unaffected.

## 14. Gate of H3, the console's pictures (f271ea88, stills on work-queue 12b7363b)

**PASS, with one added golden.** The four stations match §4.3 and §11.4 in every state captured:
- Pods: full, partly full, and empty slots;
- the capsule: empty, growing and ready;
- the Companion: docked, with the Probe's plates, and away, in outline;
- the berths: shut, with crates, and with the portrait berth;
- the lamps, and the 20 and 16 px fallback.

**The added golden:** `incubator-growing` captures the bar at 0, so it doesn't show "lit to progress". Add a golden at about half, so the clip is seen.

**The five gaps:**
1. **The glint over the pod's top-right corner** (`[12, 0]` in the slot) is right. The glint marks the pod itself, as on the crates.
2. **The bar:** a progress-clipped window of the capsule's lit-bar layer, from its first pixel, and whole when ready. The window [10, 71, 34, 10] is taken from the layer's alpha. It changes in whole pixels and redraws only when it changes.
3. **The Probe's plates:** 12 × 24, 4 apart, from (12, 64), one for each plate the Probe has (whole or lost). They are line 2 of the docked Companion, in the text column.
4. **The five new pictures in the ART family: confirmed** (the art director), and the two T-198 owed edges join them. They are pixel art in the Station colours only, flat, with no partial alpha. **A docs line for H3** in the station-screens guide's art-layer paragraph: "its only warm colours are signals (the focus ring's cream, the amber lamp and Confirm's orange) and the small drawn pictures of warm objects: the Companion's housing, a crate, the gilt frame."
5. **Berth order:** waiting crates first, then shut berths, then the portrait berth last, as the art director's proof shows. **An unidentified pod** shows the sealed generic shell (`rackpod:unknown`), as the T-236 ruling requires.

The 5 px gap before the portrait berth (T-198) builds with that ticket.

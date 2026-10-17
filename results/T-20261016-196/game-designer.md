# T-196: loss framing in the words (the game designer's sweep)

**Scope:**
- the Station's player-facing strings on station-gate (`prototypes/ui/specs/station/*.json` strings, and the notices and messages written in `prototypes/station/src`);
- the screen words in the specs I own.

The Companion's strings are not in this sweep. They follow in a second pass.

**The test for "detrimental":** does the outcome harm the player or a mibi, so that something is lost they did not choose? A choice between outcomes, a price paid for something wanted, or a rule that blocks for now is not harm. Nothing is changed here; fixes land with each screen's pass.

## Not detrimental: the wording changes

| # | Place | Current | Detrimental | Proposed |
| --- | --- | --- | --- | --- |
| 1 | specs/purpose-briefs-b20261017-1.md §6.1, Return panel (T-170) | "Gone for good. Its place will remember it." in coral, with ✕ | no | "Pip lives in the wild from now on" in the text colour, with ❀ +2. Already rewritten (T-195) |
| 2 | specs/purpose-briefs-b20261017-1.md §6.1, Grow panel | "The pod is used." | no | No line; the window paints the pod becoming the mibi. Already rewritten (T-195) |
| 3 | specs/purpose-briefs-b20261017-1.md §6.1, the "Keep" lines | "Stays with you.", "Nothing is spent." | no (neutral, but text the picture already says) | No line. Already rewritten (T-195) |
| 4 | habitat.json `wild` | Return {name} | no | Release {name} (the panel's verb) |
| 5 | habitat.json `wildAgain` / `wildAgainContext` | "Again: return {name}" / "never taken back" | no | Both go: "✓ again" arming is retired, and the decision panel replaces it (flow change 5). The one fact is the panel's "lives in the wild from now on" |
| 6 | state.mjs:914 (a released parent on Cross) | "gone to the wild" | no | "in the wild now" |
| 7 | incubator.json `noBayPlate` | "No bay free. Return a mibi to the wild first." | no (a limit, not harm) | "Every bay is home to a mibi". The plate states the fact and doesn't push release as the price of growing. More room comes from upgrades; the player chooses |
| 8 | create.json `traitLine.clash`, and state.mjs:804 | "✕ {Trait}: won't grow like this" / "this shape won't grow · …" | no (a constraint the player can change) | "{Trait}: turn one to grow" / "turn one of these to grow: …". The art director's sweep decides the ✕ mark (no ✕ unless harm) |
| 9 | habitat.json `portrayContext`, sitting.json `once` | "one sitting each, ever" | no | "one portrait for each mibi" |
| 10 | library.json `subjects.met` | "{species}, only seen" | no | "{species}, seen so far" |
| 11 | home.json / pods.json `subjects.pods.empty`, `empty` | "the rack is empty" | no | "the case is empty" (the room's noun, T-186). "Empty" is a plain fact, not a loss |

## Not detrimental: the wording stands (listed so the gate sees them)

| Place | Current | Why it stands |
| --- | --- | --- |
| `needs more {icons}` and its "go out" variants (pods, create, frame `goalWarn`) | "needs more ◆: go out" | A price not yet met, with the way to meet it. This is neutral and actionable |
| frame.json `goal.step.blocked` | "the pair cannot cross yet" | "Yet" makes it a step, not a loss |
| habitat.json `wildContext`, `releasePlate` | "goes back to the wild", "{name} goes back to the {place}" | A plain outcome |
| habitat.json `wildBlocks.*` | "a bonded mibi stays", "not until it is adult" | Rules, stated as what is true |
| habitat.json `carryRefused`, `incubator.noBay` | "{name} stayed home, no room", "no bay free" | A plain limit |
| namer.json `refuse.short` | "A name needs two letters" | A rule |
| cross.json, the forecast's kinship words | "close kin · a quarter" | A close cross is a trade-off the player may want, not harm. It is a plain fact (added at the creative director's review) |
| cargo, home, incubator, library `empty` and "away" subjects | "the bay is empty", "the Probe is away", "an empty frame" | A plain state |

## Detrimental: they stay negative, and why

| Place | Current | Why it is truly detrimental |
| --- | --- | --- |
| state.mjs:338, the dock message after a Probe break | "…" (the broke branch) | When the Probe breaks, the pods drop where it broke and nothing comes home (design/game.md, Return). The player loses what they gathered. It is said plainly, once |
| sitting.mjs `WARNING`, sitting.mjs:30–35 | "use your sitting first"; a sitting earned while one is held "is not given" | An earned sitting is lost. **This is a rule problem, not a wording one:** "use it or lose it" is the FOMO pressure design/game.md refuses (Pillar 4, the hooks we refuse). The fix is to keep the earned sitting (a queue, or a cap the player can see), not to soften the words. This goes to the lead as a rule ticket |

## For the creative director (the yes/no column)

Only two rows are "yes": the Probe break (a real loss of gathered pods) and the lost sitting (a real loss, and itself against the pillars). Every other loss word above is a choice, a price or a limit, and is reworded or stands as a plain fact.

## Agreed with the art director's mark sweep (fact-dependent rows)

- **A held sitting lost:** "yes" while today's rule stands. It becomes moot once T-20261016-198 is built (specs/sittings-never-lost.md).
- **The Companion's New world:** "yes". It replaces the world in play (map, places, state), and that truly discards, even though it is chosen. Said plainly, once.
- **The Companion's harm warnings** (the red lead word, and only these):
  - "lightning is coming": a strike can cost plates, and a break follows;
  - the Probe break: the pods drop, nothing comes home.

  **Not harm:**
  - "full · the Probe carries 20" and "stays home: the Companion is full", which are limits;
  - an outpost that "burns low" or "has gone out", a world fact relit with Energy;
  - growth and elder news.
- **Create's clash:** "no". It takes the needs-you amber, and its line is "{Trait}: turn one to grow", with no ✕.

The full sweep of the Companion's words is a second pass.

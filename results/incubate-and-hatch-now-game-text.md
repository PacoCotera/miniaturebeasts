---
for: the builder ticket "Incubate and Hatch now" (to be cut by the lead)
base: station-gate (state.mjs, intents/incubator.mjs, prototypes/ui/specs/station/*.json)
owner rulings: 2026-10-17 23:08 (Create's press is Incubate, the Incubator's press is Hatch now, Open stays); 23:26 ("yes to the hatch": Hatch now finishes and hatches in one press)
---
# Incubate and Hatch now: the game text and the behaviour change

Written by the game designer, 2026-10-17.

## 1. The behaviour change (Hatch now)

Today, the Incubator's pay-to-finish press only ends the wait. It pays the Essence, marks the bud ready, and leaves it in the chamber. Hatching is a second press, Open. A press called Hatch now has to hatch. So:

- **Hatch now** (a bud still growing) does three things in one press:
  1. pays the price for the minutes left (`instantGrowCost`, unchanged: 1 Essence for every 2 minutes left, rounded up);
  2. ends the wait;
  3. opens the bud as Open does: the juvenile steps out, fully known where Open makes it known, into the first free bay, and the hatch plays, then the meet.
- **Open** stays as it is, for a bud that finished its wait on its own.
- **The bay is guaranteed.** Incubate refuses when no bay is free, Cross refuses when no bay is free or a bud is in the chamber, and there is one bud at a time. So a free bay exists all the way from Incubate to the hatch.
- **Order of checks:** check the bay before taking any material. If no bay is free (only reachable through a developer path), Hatch now refuses with Open's words and spends nothing. A refused press never spends.
- **Motion:** the leaves turn whole (the old growNow event), then the hatch plays, as on Open. Reduced motion is a cut to the meet, as Open's is.
- **One log line,** not two: `Hatched {name} now · {species} · juvenile · bay {n} · {spend}`. For example, "Hatched Fig now · Loika · juvenile · bay 3 · ❀ 2".

The decision panel for this press reads **Hatch now | Wait**:
- the Hatch now window shows the juvenile in its bay, at juvenile size;
- the Wait window shows the bud in the chamber with its light still rising;
- the fact band on Wait stays "ready in about {n} min".

## 2. Player strings

| Where | Now | Becomes |
| --- | --- | --- |
| create.json `strings.action` | Grow it | **Incubate** |
| create.json, the line while the press plays | Growing | **Incubating** |
| incubator.json `strings.grow` | Grow now | **Hatch now** |
| state.mjs, the grow refusal | Grow it · {block} | **Incubate · {block}** |
| state.mjs, the pay-to-finish refusal | Grow now · {short} | **Hatch now · {short}** |
| state.mjs, the Incubate log | Grew {a} {species} founder · … | **Incubated {a} {species} founder · …** |
| state.mjs, the pay-to-finish log | Grew the bud now · {spend} | **Hatched {name} now · {species} · juvenile · bay {n} · {spend}** (§1) |
| frame.json `goal.step.grow` | grow the {species} pod | **incubate the {species} pod** |
| home.json `needs.couldGrow.notice`, and the same line in state.mjs | {a} {species} pod could grow | **{a} {species} pod is ready to incubate** |
| state.mjs, the short form of that need | a pod grows with {icons} | **a pod incubates with {icons}** |
| prototypes/station/index.html and prototypes/station/README.md (Create, Incubator, the jumps) | ✓ Grow it, Grow now | **✓ Incubate, Hatch now** |

**Unchanged** (these name something other than the two presses, and stay true):
- the juvenile-to-adult words: "one more walk grows the pair", "more walks grow the pair", "{name} grows with care", "the young mibi grows with care", "walks grow {name} up", "walks grow the pair up";
- the goal aim "grow a first mibi";
- the bud's state: "growing", "a bud is growing", "a {species} bud, growing", "a bud is already growing", the plaque's "growing" and "hatched";
- Create's trait lines "✕ {Trait}: won't grow like this" and "it grows as the pod is", which describe the body;
- **Open**.

## 3. Width

"Incubate" is wider than "Grow it" at 16, 20 and 28 px.
- Re-measure Create's bottom line against its zone: the check that the line with ⧗ 999 ends at 392 or less (prototypes/face/src/test/face_test.c).
- Regenerate prototypes/face/tests/vectors/metrics.json, the frame-word vectors and the golden journeys (journey-create.json, journey-incubator.json) with the repo's own tools, never by hand.
- If Incubate does not fit with the widest price, the zone is UI/UX's to resolve. Do not shorten the word.

## 4. Test cases

1. **Hatch now with a bay guaranteed:**
   - Set-up: Incubate a founder (a free bay is required), with minutes left.
   - Press Hatch now.
   - The price is paid once.
   - The chamber is empty, and the juvenile is in the first free bay, born on the current turn, stage juvenile.
   - Its chapters are known as Open makes them known (a founder in every chapter but a shut sealed one; a cross child only where the Station could be sure).
   - The field guide gains what Open adds.
   - The log line is exactly the Hatched form, with one line and no separate "Opened" line.
2. **Hatch now on a bred bud** (from Cross): same as case 1, with the cross child's unread chapters still unread.
3. **Open after a natural finish:** let the wait run out, then press Open. Behaviour, log and price are as today (no price). Hatch now is not offered on a ready bud.
4. **Refusals, unchanged except for the word:**
   - Hatch now short of Essence refuses with "Hatch now · {short}", and nothing is spent and nothing hatches.
   - Incubate with no free bay refuses as today (noBay), with "Incubate · {block}".
   - Incubate with a bud in the chamber refuses as today ("a bud is already growing").
   - Open with no free bay refuses as today ("No bay free · return a mibi to the wild first").
5. **No spend on a refused hatch:** fill every bay through the developer path while a bud grows, then press Hatch now. It refuses with Open's words, and Essence is unchanged.
6. **The free preset:** with `instantGrowPreset` "free", Hatch now hatches with no price, and the log line ends with no spend.
7. **Reduced motion:** Hatch now cuts to the meet on the frame of ✓, as Open does.

## 5. Out of scope

- The internal identifiers stay: `grow`, `growCost`, `growBlock`, `growBlockKey`, `instantGrow`, `instantGrowCost`, the goal key `grow`, Create's state `grow`, `events.grow`, `events.growNow`, the anim kinds, and `mark-can-grow-16`. No player sees them.
- `growNow`'s meaning now includes the hatch. That belongs to the build, not to a rename.
- The doc sweep (design/ and specs/) is a separate pass, listed for the lead by message.
- The art prompt records under art/concept-station/ are historical and stay as they are.

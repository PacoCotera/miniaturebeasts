# Home's bottom line: one message per slot (UI/UX, for the T-192 build)

The creative director asked for this to be folded into the T-192 build (T-181: one message per slot). It needs no separate proof.

## The fault

`home.json line.room.need` shows the most pressing need in the right zone ("the same wherever the ring is"). The room's ✓ does that same need (`strings.needs[*].action`). So whenever the room holds focus, the line says one thing twice:
- ✓ "Open the bay" beside "two crates wait in the bay";
- ✓ "Go to the Incubator" beside "the bud is ready", with "a Loika bud, ready" in the middle as well.

The same happens on a module focus when that module is the need's target.

## The rule

The need zone shows **the first need, in the existing order, whose target is not what ✓ does now**. If there is none, it shows the goal (`frame.json strings.goal`: mist, no lamp). If there is no goal, it is empty.

| Focus | ✓ does | Need zone |
| --- | --- | --- |
| the room, crates waiting | Open the bay (the crates need) | the next need with another target (for example "three new pods in the rack" from `newPods`), else the goal ("more walks grow the pair"), else empty |
| the Incubator module, bud ready | Go to the Incubator | as above: the bud need is skipped |
| a resident (T-191) | Look at {name} | the first need, unchanged: its target is another place |
| another module, bud ready | that module's own verb | "the bud is ready": it names something else, so it stays |

- **Target** means the screen and subject the need opens (`needKey` → its notice row in `specs/flow-pass-spec.md`). Two needs with the same target count as one.
- **The lamp:** amber only beside a need. The goal never has a lamp.
- **The middle zone** never repeats ✓ either. On the room it stays empty (`line.room.subject` is ""). The bud's "a Loika bud, ready" belongs to the Incubator module's focus only, where ✓ is "Go to the Incubator" and the middle names its subject.
- **The player's thread:** when T-186 proposal 3 (the pursuit) is built, its next step takes the goal's place in this zone. Until then the goal strings stand. No new words.
- **No sliding:** the zone's content changes with focus. It keeps its `slideMs` only when a need arrives or clears, never on a focus move, so moving the ring doesn't animate the line.

## For the build

- **`views/home-props.mjs`:** the need zone's choice takes ✓'s current target and skips needs that share it, then falls to the goal, then to empty.
- **Tests:**
  - room plus crates: the need zone is not "two crates wait in the bay";
  - Incubator focus plus bud ready: the need zone is not "the bud is ready";
  - Pods focus plus bud ready: the need zone is "the bud is ready";
  - room with only one need: the goal, in mist with no lamp, or empty.
- **The goldens to regenerate:** `home-docked`, `home-incubator-ready`, `home-away`, `home-waiting`.

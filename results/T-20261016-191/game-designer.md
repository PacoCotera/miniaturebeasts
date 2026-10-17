# T-191: the focused resident's context line (the game designer's call)

## The call: the line names where this mibi comes from

When a resident in Home's living window is focused, the bottom line's context slot names **one fact: its origin**, in at most six words.

| The mibi | The line | Source (the code keeps it) |
| --- | --- | --- |
| Bred from a cross | "child of Moss and Fig" | `from.how = "cross"`, `from.of` |
| A founder | "from a pond pod" | `from.how`, and the place kind of `from.g` |
| From a returned mibi's place (once built) | "of Moss's line" | the shed pod's origin |

**An event replaces it, while the event is open** (the same events as return signals' keys 5–6, and only until visited):

| The event | The line |
| --- | --- |
| It just grew up | "just grew up" |
| It became an elder | "an elder now" |

## Why this fact, and not another

- **The glance already shows the rest.** UI/UX's glance draws the chapter marks, the glints where something is unread or changed, and kin softly marked. The stand (T-190) shows its looks and its stage. The species is the stand itself. The line is the one place for what a picture can't say, and a name and a family are exactly that. Repeating "two chapters unread" would show one thing twice (flow change 5).
- **It serves both motivations at once.**
  - For the feel, "Dot, child of Moss and Fig" is a story: a name and a family.
  - For the mechanics, it is the pedigree: who to compare Dot with, and why Dot's coat looks as it does.
  - For the person moving between them, it is the question that leads down: "what did Dot get from Fig?" ✓ answers it.
- **It is true by construction.** Origin is recorded at birth and never changes. Nothing is inferred, and nothing hidden is hinted at.

## The words

- **No name:** the name is in ✓ ("Look at Dot", UI/UX §4), so the line never repeats it. Together they read "Look at Dot · child of Moss and Fig".
- **"child of A and B":** plain kinship words, not "offspring" or "parents:".
- **"from a {place} pod":** the place kind the pod was found in (meadow, pond, rock field, wood, cave), never a coordinate.
- **Long names:** if the parents' names would overflow the zone, it drops to "Moss's child" (the first parent). It never truncates mid-name.
- **No digits, no stage, no species.** The picture carries them.

## What it doesn't do

- It doesn't name what ✓ does. That is the action zone's job (UI/UX's verb).
- It never shows on an unfocused resident. The window stays a scene at rest.

## Answers to UI/UX (results/T-20261016-191/ui-ux.md §8)

- **Changed against unread:** neither goes on the line. Both are the glance's marks (glints on the chapter marks), so the line would show them twice. If a resident has both, the glance shows both, each on its own chapter.
- **The placeholder "Movement changed on a walk" is not true to the rules.** Only Glow (S03), Basking (S15) and Phase (S16) change by themselves, and only as a partner (specs/genome-screen-calls.md, T-137). Movement never changes after birth. The placeholder should go, so the wireframes don't teach a rule the game doesn't have.
- **"Coat, still a surprise"** is the card's own words for an unread chapter. That belongs to the glance or the card, not the line.

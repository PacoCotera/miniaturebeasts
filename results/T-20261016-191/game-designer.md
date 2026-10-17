# T-191: the focused resident's context line (the game designer's call)

## The call: the line names where this mibi comes from

When a resident in Home's living window is focused, the bottom line's context slot names **one fact: its origin**, in at most six words.

| The mibi | The line | Source (the code keeps it) |
| --- | --- | --- |
| Bred from a cross | "Dot, child of Moss and Fig" | `from.how = "cross"`, `from.of` |
| A founder | "Pip, from a pond pod" | `from.how`, and the place kind of `from.g` |
| From a returned mibi's place (once built) | "Bean, of Moss's line" | the shed pod's origin |

**An event replaces it, while the event is open** (the same events as return signals' keys 5–6, and only until visited):

| The event | The line |
| --- | --- |
| It just grew up | "Moss has grown up" |
| It became an elder | "Bean is an elder now" |

## Why this fact, and not another

- **The glance already shows the rest.** UI/UX's glance draws the chapter marks, the glints where something is unread or changed, and kin softly marked. The stand (T-190) shows its looks and its stage. The species is the stand itself. The line is the one place for what a picture can't say, and a name and a family are exactly that. Repeating "two chapters unread" would show one thing twice (flow change 5).
- **It serves both motivations at once.**
  - For the feel, "Dot, child of Moss and Fig" is a story: a name and a family.
  - For the mechanics, it is the pedigree: who to compare Dot with, and why Dot's coat looks as it does.
  - For the person moving between them, it is the question that leads down: "what did Dot get from Fig?" ✓ answers it.
- **It is true by construction.** Origin is recorded at birth and never changes. Nothing is inferred, and nothing hidden is hinted at.

## The words

- **The name first:** the player chose it, so it is the strongest hook for the feel.
- **"child of A and B":** plain kinship words, not "offspring" or "parents:".
- **"from a {place} pod":** the place kind the pod was found in (meadow, pond, rock field, wood, cave), never a coordinate.
- **Long names:** if the line would pass six words or the zone's width, it drops to "{Name}, Moss's child" (the first parent). It never truncates mid-name.
- **No digits, no stage, no species.** The picture carries them.

## What it doesn't do

- It doesn't name what ✓ does. That is the action zone's job (UI/UX's verb).
- It never shows on an unfocused resident. The window stays a scene at rest.

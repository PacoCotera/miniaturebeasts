# The glance on a focused resident: what it may truthfully show (genome engineer, T-20261016-191)

Answers UI/UX's three asks (`ui-ux.md` §2, §3, §8), checked against station-gate (`state.mjs`, `genome.mjs`, `cross.mjs`).

## 1. "Changed since last looked": yes, with one small record

A mibi's genome never changes after birth: no copy, digest or stamp ever moves. So for a resident, a chapter can only "change" in two ways:

- **It was read since the player last looked closely** (`readMibi` adds it to `mibi.read`). This is the common case: a bred child's unread chapters.
- **A self-changing trait's mark moved** (Glow, Basking, Phase; T-137's `selfChanging`), once the mark is built. It is held beside the copies, never in them.

**The record:**
- `mibi.seen = { [chapterId]: key }`, where `key` is the chapter's state as last shown up close: `"r"` when read, plus the marks of its self-changing traits, e.g. `"r:glow=2"`.
- **Set** when the chapter has been on screen up close: Habitat, the genome tree, or the Library entry for that mibi.
- **The glint shows** when the chapter is read and its key differs from `seen[chapterId]`. That covers newly read and mark moved. There is one glint, the house **gold** "something new here" (the creative director's correction: lit mint means "changed by you" in the marks register).
- **Starting state:** a mibi born before this record exists starts with `seen` equal to its current keys, so nothing glints on a save just loaded.

It is one small object per mibi, additive, with no schema bump and nothing on the stamp. The Station owns it; the framework needs nothing new.

## 2. Unread chapters: no glint just for being unread

An unread chapter on a resident is not evidence that anything new is there. The house glint means "something new here, never what" (`glint` in `state.mjs`, computed per chapter from looks the species' guide hasn't seen).

- **Unread chapter:** draw its emblem in the unread state (frosted). No glint.
- **Optional, and true:** the house **gold** glint on an unread chapter only where the code's own rule says so: the species has had that chapter read on some pod, and this mibi carries a look the guide hasn't seen. The same function can be applied to a mibi's genome, and it is the same gold glint as a changed chapter.
- **Sealed and shut:** the find's emblem, nothing else.

## 3. Kin to mark softly

From the record:

| Relation | Source |
| --- | --- |
| Parents | `mibi.parents`: snapshots with ids |
| Children | every mibi whose `parents` holds this id |
| Full siblings | same two parent ids |

**Mark:** parents, children and full siblings present in the window.

- **Why siblings:** a cross between full siblings carries the heaviest penalty a player can make by accident (kinship 1/4: hidden looks surface, and blends freeze at the midpoint). Seeing "these two are siblings" before choosing a pair is the most useful thing kin can tell.

**Don't mark** half-siblings, cousins, grandparents or the shed pod's line. They are correct in the pedigree, but too many soft marks at once read as noise. They belong on the Cross screen's forecast, which already warns from `relatedness`.

**Never show:** a kinship number, identity percentages, or a guess where a parent is unknown. A founder has no parents: its pod is its origin. A parent no longer in the vivarium (released) still counts for its children, but isn't marked because it isn't in the window.

## 4. Confirmed: every mark shows only what is read

| The glance may show | Never |
| --- | --- |
| Emblems read, unread or sealed, from `mibi.read` and `chapter.sealed` | Any look of an unread chapter, as a word, a picture or a colour |
| The gold glint per the `seen` rule above (read chapters only) | A hidden copy, or that a hidden copy exists, unless the chapter is read. Once read, "hides a pale copy" is known, but it belongs in Habitat or the tree, not on the glance |
| The gold "new here" glint only by the code's `glint` rule | A forecast as a fact |
| Kin marks from recorded parents | Kinship numbers, identity scores, or relations inferred from looking alike |
| The drawn stand from `drawnLooks` (T-190) | A stand look that `drawnLooks` would not give |

I'll check the wireframes against the frames when they're final.

# Genome screen: the game designer's calls (T-20261016-136) and the self-changing trigger rules (T-20261016-137)

Game designer, 2026-10-17. These answer the genome engineer's fidelity check (results/T-20261016-135.md). The code wins on facts, and each call below is checked against it. UI/UX applies the T-136 calls to the spec and wireframes; the genome engineer implements the T-137 rules in the framework.

## T-136: three calls

### 1. Clash: keep it as a guard, drop the link

- **Kept, at the smallest cost.** The rules promise it: "Some combinations can't make a body. Create names the traits that clash and offers no Grow until one changes." The code's guard (`clashTraits`) exists. Today's frames can't reach it (0 in 37,946 edits, because every pool combination builds), but a future species with tighter viability could. A screen without the state would then have nothing to show.
- **The mark:** a red rim on every trait `clashTraits` returns (one to n), mirrored on their drums, with no ✓ cap and the bottom line naming the traits. **No link.** A link implies a pair, the code returns a set, and drawing a set's links is work for a state nobody can reach today.
- **Art priority: none.** The rim is a tint of the existing ring. Wireframe 02 can stay as the one example, with real S03 trait names, or be dropped from the owner's set. It is not shown to the owner as a feature.

### 2. The first mark: "a look new to your field guide"

- **Accepted:** the meaning is the code's `p.first`, the traits whose look was new to the player's field guide when the chapter was read. It replaces "no resident has this look" in specs/slip-reward.md and specs/editing-life.md, which are updated.
- **Where it shows:** on the gene (`p.first` is per trait), in the house's "new" sense, the same as the "new" mark a read leaves on Pods. On Create it tells the player that this pod taught them something, and invites shaping toward it. On the Incubator, a cleared chapter whose looks were new to the guide shows it as the chapter clears.
- **The mark** stays UI/UX's cream triangle. Only its meaning changes.

### 3. The wish rule, made unambiguous

The code stores one pinned look per trait (`st.wish[species][trait] = look`). The rule:

- **On the genome screen,** a gene wears the yellow four-point glint **if and only if** a wish is pinned for this species, its trait is pinned, and **the founder as edited now shows the pinned look.** Turning a drum to the pinned look lights it; turning away puts it out. The edit visibly moves toward the wish, which is the reward of the wish on Create.
- **On the drum,** the face that would give the pinned look carries the small yellow glint, so the player can see which way to turn. If no face gives it, this pod can't make that piece, and there is no mark.
- **No wish pinned for the species:** no wish marks anywhere.
- **An unread trait** never shows a wish mark on its gene, because the founder's look there is unknown. The rule that a pod glints on a chapter holding a piece of the wish already covers it, per chapter, on the frosted row.

### Also confirmed from the check

- **Glint per chapter, on the frosted row, never on a gene** (fix 3). The game designer's earlier wording ("a capped drum shows the glint star") is corrected to per chapter in specs/slip-reward.md and specs/editing-life.md.
- **Self-changing until the frames carry it:** S03 Glow draws as inherited-only (fix 2, T-136 step 2). After T-137, only the loci named below draw the step marks. On Create and the Incubator the marks are always unlit, because only a partner moves a mark.
- **Sleeping:** no gate bar on an unread chapter (fix 4a); a switch that is already on shows its dots in a plain lit tone, and only dots the player woke are mint (fix 4b). Agreed.
- **"Legs & tail" against "Legs & Tail":** the code wins. The design doc's capital should change in its next edit. On screen it is an emblem, so nothing changes there.

## T-137: the self-changing trigger rules

These come from station-gate design/creatures-and-genomics.md, "Self-changing traits", made exact against today's frames and world. They are the game designer's to own (T-137 step 1), offered to the genome engineer to implement.

### Which loci

One trait per species, one locus each. Each is the trait the design doc names, matched to the frame:

| Species | Trait (frame id) | Locus | Chapter | Moves toward |
| --- | --- | --- | --- | --- |
| S03 Tuikis | `glow` (Glow) | `appearance.emission-brightness` | Glow (open) | brighter |
| S15 Lehten | `light-feeding` (Basking) | `energy.light-feeding` | Stamina (sealed) | sun-hungrier |
| S16 Blikur | `phase` (Phase) | `physiology.phase` | Charge (sealed) | more solid |

S03's `glow-length` (`appearance.emission-length`) is **not** self-changing, and neither is any other locus. The genome engineer should confirm that `light-feeding` is the doc's Basking. It is the only Lehten trait that matches.

### What triggers a step

A trigger is met on an expedition when the mibi is the **partner** on it (not only carried) and:

| Trait | The partner… |
| --- | --- |
| Glow | enters a **cave** (under a burrow) or a **wood** place |
| Basking | enters a **meadow**, **pond edge** or **rock field** place |
| Phase | is in a place a **storm** passes over while the partner is there |

"Enters" means the partner walks into a place of that kind during the expedition. The four land templates (meadow, pond edge, rock field, wood) and the cave are the world's own place kinds (station-gate design/world-and-exploration.md).

### How the mark moves

- **The mark** is an integer, 0 to 4, kept in the mibi's record beside its genome, never in the copies. The genome, its digest, its name code, its stamp and its family record never change.
- **Step up:** when the partner docks after an expedition on which its trigger was met, its mark goes up one, at most to 4. One step per dock, however often the trigger was met.
- **Fade:** after **three expeditions in a row as partner without its trigger**, the mark goes down one, never below 0. The count resets to 0 after each fade and on each step up. A mibi that is not the partner (at home, or carried but not leading) keeps its mark and its count unchanged: such a trip neither counts nor resets.
- **Direction:** a mark moves only toward its end; it goes back only by fading.
- **Step size:** one sixteenth of the species' **pool** range for that trait.
- **Storm:** a storm passed over the place the partner was in, while it was there, at any point in the trip. A storm elsewhere on the map does not count.
- **Effect:** the trait shows the mean of its two copies plus the mark × the step, clamped to the species' pool.
- **Never inherited:** a child starts at 0, and a cross reads the copies only. A founder starts at 0.
- **Sealed:** a self-changing trait in a sealed chapter moves from birth like any other, but shows no hint of the change until the chapter is opened and read. (The doc says it gives no hint of a change until the chapter is read.)
- **Field guide, wish and forecast:** a mark never adds a look to the guide, never counts toward a wish and never changes a forecast.

### What crosses the dock

The Companion records, per expedition and per partner, whether each trigger was met. It already knows the partner and the places walked. At the dock the Station applies the step or fade rule above. This fits the existing "the Station mirrors care at the dock" path (`mergeCare`). The genome engineer and the architect choose the field names.

### What the screens draw (for UI/UX, after T-137)

- **Create and the Incubator:** the step marks, always unlit (a founder or a bud is at 0), with the trigger's place badge: a cave and a wood for Glow; a meadow, pond edge and rock field for Basking; a storm for Phase.
- **The vivarium, up close:** the steps lit to the mark, and the words the rules already give ("brighter after walks in caves and woods").

**Agreed with the genome engineer (2026-10-17):** the frames carry `changedBy` (species / player / breeding / self) on every locus and `selfChanging: { toward, places, storm }` on the three traits above. The rules are held as framework constants.

**Amended (T-173):** the wish mark is no longer the four-point glint in yellow. It gets its own silhouette, so it doesn't differ from the gold glint by colour alone; the art director draws it in the style guide. The rule above (when it shows) is unchanged.

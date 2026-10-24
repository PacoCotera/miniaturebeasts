# Sittings, the curl, the read-once mark (game designer, 2026-10-23 16:45 Mexico City)

Scope: game rules, what the player learns and when, and truth rules. Layout is UI/UX's, art the art director's, words the copywriter's, code structure the architect's. No clone was edited.

**What I read.**
- Internal work-queue (/home/user/iwq): results/T-20261023-post-library/uiux-k5q-sitting-curl.md (B and C), results/T-20261017-library/art/sheet-art.md (§1), results/T-20261017-library/gd-followups.md, kit-map.md (C11), words.md (`sheet.readonce`), build-spec.md and structure.md (read once). iwq/MOVED.md says the queue moved to the public work-queue branch; these files were read as named in the brief.
- The owner's decisions of 2026-10-08 (the portrait), 2026-10-11 14:03 (night; a carried mibi sleeps only while docked) and 2026-10-18 22:45 (sittings are never lost).
- station-gate 95f9762a, read only with `git -C /home/user/sg show`: prototypes/station/src/sitting.mjs, state.mjs (readCost, read, readMibi, glint, hatchBud), views/home-props.mjs (restOf, bay), views/habitat-props.mjs, intents/habitat.mjs (Greet), host.mjs:135, tests/sitting.test.mjs; ui/specs/station/habitat.json (`events.moment`), vivarium.json (`rules.rest`, `regions.resident.asleep`, `regions.bed`); design/proposals/the-portrait.md; design/style-guide/README.md §6.
- The T-198 record (work-queue branch in the same clone): results/T-20261016-198-game-design.md, specs/sittings-never-lost.md, results/T-20261016-198/ui-ux.md, and my rewrite of the-portrait.md at 3df1acf0 (§7.2, §8).

---

## 1. Sittings

### 1a. What "owed" means: `st.owed.length ≥ 1 || st.welcomePending`. Yes.
- **"Owed" means a sitting is waiting behind the held one.** Today the save has two such waits:
  - `st.owed`: the research moments that are waiting;
  - `st.welcomePending`: the welcome sitting, which came due while a sitting was held.
- Both are sittings the player has earned, so both light the one edge. There is one edge whatever the count, and nothing tells the two kinds apart.
- **Invariant:** a waiting sitting implies a held one. Nothing waits behind an empty slot, because `giveOwed` fills the slot as soon as it empties: at the door's opening and at every begin. So row 2's `st.sitting` test and the owed test never disagree. A save that breaks this invariant is a bug, not a state to draw.
- **The paid monthly sitting is not shown.** It waits on the account, not in the kit's save (the-portrait.md §7.2 as rewritten; specs/sittings-never-lost.md). It is not in `st.owed`, it does not light the edge, and it is not built. When it is built, it comes into the slot only when the slot is empty, so it comes after the kit's own waiting sittings.

### 1b. `grantSitting` with a sitting held: it must queue, and today it discards. This is the rule build.
**Today (sitting.mjs:32-37).** While a sitting is held, `grantSitting` writes the key to the ledger and then returns `{ ok: false, lost: true, msg: "A sitting is held · use your sitting first" }`. That discards an earned sitting, which the owner's 2026-10-18 22:45 rule forbids. In play no moment is paid yet: `collectMoments` and `openSittingDoor` are reached only from dev.mjs. So nothing is lost in a real save today, but the rule is wrong and must change before the moments are wired.

**Ruling (exact):**
1. **A sitting earned while one is held is given and waits.**
   - Its key goes into the ledger when it is earned, as now, so it never pays twice.
   - It joins the queue as `{ key, at: now }` with its source.
   - The result is a success, never `lost`. Its shape is the architect's.
2. **One queue, oldest first, by the time each sitting was earned.** The welcome sitting is included: its place is the time it came due while a sitting was held.
   - This replaces the code's "the welcome comes first because it teaches", in `giveOwed`'s welcome guard and `beginSitting`'s order.
   - Where it differs, the welcome teaches nothing that a held frame has not already taught, and the source of a held sitting shows nowhere.
   - Whether the welcome stays a flag or joins `st.owed` is the architect's choice. Either way 1a's definition holds.
3. **When the held sitting is begun,** the oldest waiting sitting becomes the held one, at once, with its own source (today `giveOwed` writes `"moment"` for every entry).
4. **Several moments from one act** (for example a sealed read that also fills the guide) are queued in `momentsEarned` order: the sealed chapter first, then the guide, as already ruled.
5. **The queue is kept in the save, survives a restart, never expires and is never trimmed.**
6. **The warnings go:** `WARNING`, `sittingWarning`, `readWarning`, `crossWarning`, `losesOne` and `momentsOf` as their only reader, and dev.mjs:110's "use your sitting first" line. No price line or screen warns, because nothing can be lost.
7. **Unchanged:**
   - behind the shut door nothing is paid and nothing is lost (X21);
   - `devGrantSitting` still refuses while one is held (a developer tool, not an earned sitting);
   - "one sitting per mibi, ever".
8. **Acceptance:** a test that earns two sittings while one is held, then begins three times. All three arrive in the order they were earned, none is lost, and the ledger pays each key once.
   - The test "one slot, one frame … is not given and does not wait" (sitting.test.mjs:53) is rewritten to this.
   - The warning tests at :81 and :207 go.
   - X21 (:224) stands. Its welcome is already held when the door opens, so the order rule does not change it.

### 1c. The slide forward (UI/UX B3): no contradiction with the owner's rule. It stands as drawn.
The owner's rule: "an earned sitting is never discarded; extras wait behind the held one, shown only as the edge of one unlit frame behind it (no number, no word, no amber); when the held one is begun, the next slides forward." I checked each case against it:
- **A begin with sittings waiting** → the next one slides into the berth, and the edge returns while any are still waiting. ✓
- **A begin with nothing waiting** → no fourth berth, and `berthSeen` is cleared. No slide, because nothing waited. ✓
- **A sitting earned into an empty slot, or a waiting one the player never saw as an edge** → it appears by a cut. A slide would show something moving forward that the player never saw waiting. ✓ (truth)
- **Two begins before Home is drawn again** → one slide to the end state. The edge returns only if more still wait. ✓
- **A ready crate takes the berth (row 1)** → the held frame and the edge are hidden, not lost. `berthSeen` is kept, so the slide plays when the crate is opened. "Shown only as the edge" limits *how* a waiting sitting is shown, not *whether* it is shown at every moment. The owner approved "the crate takes the berth" in the 22:46 addendum. ✓
- **The Habitat plate after a begin** shows the begun mibi's "painting" state. The new held frame appears there by a cut when another mibi is shown, and Home plays the slide later. No sitting is ever shown as lost, and no number, word or amber appears. ✓
- **A reload and reduced motion** show the end state. ✓
- **Truth note (no change):** the slide is the begin's echo on Home, played at the next Home draw. It is never a second event, and it never replays. That is as UI/UX ruled.

---

## 2. The sleeping curl: Greet on a layered sleeper

**Ruling: yes, Greet wakes it; yes, it curls again; the rule that decides is `rest`, never the Greet.**
- **Greet is a hello, not an alarm.** It changes nothing in the save and is never rewarded (habitat.json `events.moment.do`). Sleep belongs to the household's clock: `restOf` is a pure function of the time of day, the group and the seed. So a Greet cannot change `rest`.
- **The order of a sleeper's Greet:** it wakes, it is present for the moment, and it curls again. This is the existing rule for sleepers with a moving set (Station M1 §2.4, habitat.json `events.moment.asleep`, 2880 ms), and it now applies to the layered still S01 as well. Today `UI.hab.asleep` (host.mjs:135) is true only when the sleeper has a moving set. It must also be true for a layered sleeper (architect).
- **When it curls again:** at the end of the moment, in the form that `rest` gives at that tick.
  - If `rest` is still asleep, the curl closes the moment. UI/UX times it at 2700 to 2880 ms, which is not mine to set.
  - If `rest` turned awake during the moment (the mibi's wake flip fell inside it), it does not curl. It ends standing, and no separate wake plays.
  - The reverse also holds: if an awake mibi is greeted across its settle flip, the settle plays after the moment ends, never during it.
  - What the player learns: Greet never puts a mibi to bed and never keeps it up.
- **A carried mibi while docked is asleep on Habitat too (truth fix).**
  - vivarium.json `conditions.docked` says "the carried set asleep on the bed". But habitat-props.mjs:45 asks `restOf` only about `homeMibis`, which excludes the carried set, and falls back to "awake". So the same mibi is curled on the bed and standing up close.
  - **Ruling:** on Habitat, the `rest` of a carried mibi while docked is "asleep" at every hour, the same as the bed. Its Greet wakes it and it curls again, by the rule above.
  - This follows from decisions 2026-10-11 14:03 (5) ("a carried mibi sleeps only while docked"). The code is the architect's.
- **Reduced motion:** it stays curled. The moment cuts to its end form, which is the curl, so the outcome is the same as with motion.
- **Unchanged:**
  - no Greet on the walking screens: the bed's sleepers neither settle nor wake there (UI/UX C4);
  - Greet's cap and words;
  - a sleeper woken by Greet is not the "one wakes to wander" of 10-11 (5). That is a rest rule, and Greet never triggers it.

---

## 3. The Library's read-once mark: it goes

**What read-once means in the game.** The species' chapter is in `st.readOnce[species]` once it has been read on at least one pod or mibi of that species (state.mjs `read`, `readMibi`, `skipRead`). The player gets three things from it:
1. **Every later read of that chapter, on any pod or mibi of the species, costs half, rounded up** (`readCost`). The player sees this as the lower number on the read's price line on Pods and Habitat (pods.json `price`: "a half price is the lower number"; habitat.json `price`).
2. **The chapter can glint on a pod** ("new here", `glint`). A glint needs the chapter to have been read once.
3. **A sealed chapter's first read opens it for the species.** The sheet shows this as "sealed" going away (gd-followups §3).

**Ruling: the mark goes from the plate and the page. It gets no word, and nothing replaces it.**
- **It informs no decision where it stands.** The Library sells and reads nothing. Read-once matters only at the moment of a read, and that place already says it: the price is the lower number. The glint and "sealed" carry the other two consequences.
- **Its absence would lie.**
  - A founder and a Create mibi add their looks to the guide without a read (state.mjs `hatchBud`, :910, :1022). Such a chapter shows found looks on its page and in the mosaic, but would have no mark.
  - So "no mark" would tell the player "not read" about looks they can see. The mark is also species-wide, while a read belongs to one pod or mibi.
- **It fails the house rules either way.**
  - Bare, it is a 10×10 glyph that needs a legend (style guide §6: "a mark that needs a legend fails").
  - The half-filled ring also reads as "half done", which competes with the L1 progress quarters.
  - With the words "read once" it would name a fact without its consequence. A word that does say the consequence ("half price") would be a price in a screen that sells nothing.
- **What stays:**
  - `readOnce` in the sheet digest, because `shutOf` still needs it to open a sealed chapter;
  - the plate states found, shut, met-only and lit, each without a mark.
- **What goes:**
  - the mark slots [134,8,10,10] (plate) and [286,8,10,10] (page);
  - the generator's mark;
  - words.md `sheet.readonce`;
  - build-spec.md:65 and :131 and structure.md:71's "read-once mark" lines.
- **For the owner (nothing to decide).** The plates the owner saw at 16:14 lose one 10×10 ring beside the chapter name. Nothing else changes.

---

## Cross-remit (one line each)
- **Architect:**
  - the rule build in sitting.mjs per 1b (the queue entry shape and source, welcome as a flag or a queue entry, removing the warning API) and its tests;
  - `UI.hab.asleep` true for a layered sleeper;
  - Habitat `rest` "asleep" for a carried mibi while docked;
  - the Greet end form read from `rest` at the moment's end.
- **UI/UX:**
  - B stands as drawn, with owed = `st.owed.length ≥ 1 || st.welcomePending`;
  - drop the read-once slots from sheet-layout.md (plate and page);
  - Greet's timing when the end form is standing (no curl dither).
- **Art director:** the generator's read-once mark is no longer drawn (sheet-art.md §1, §2 head).
- **Copywriter:**
  - `sheet.readonce` goes;
  - the-portrait.md's §7.2 and §8 wording is already rewritten at 3df1acf0, and the copywriter confirms it lands with the rule build;
  - a check: "berths clear" beside a held frame in the portrait berth (B1 row 2). The walk berths are clear, so the line is true; the words are the copywriter's.
- **Animator:** none from me. The Greet's wake and curl dithers are UI/UX's C4.

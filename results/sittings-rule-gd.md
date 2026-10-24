# Sittings are never lost: the rule (game designer, 2026-10-23 16:45 Mexico City)

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

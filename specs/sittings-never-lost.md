# Sittings: an earned sitting is never lost (T-20261016-198)

Game designer, 2026-10-17. This replaces design/proposals/the-portrait.md §7.2 and the second rule of §8 ("A moment while a sitting is held is not given…"). That file is edited to match when the build lands. Owner, 12:52: "you most avoid positioning something as negative, unless it indeed is."

## The rule: (a) a queue behind the one slot

- **The slot holds one sitting,** as now: one gilt frame on Home's instrument.
- **A research moment that comes while the slot is full is kept, never discarded.** It waits, owed, in the order earned, and drops into the slot the moment the slot empties (when a sitting is begun). This is the path the save already has for the moments earned before the sitting's door opened (`st.owed`), and for the welcome sitting (`welcomePending`). The rule makes it the only path.
- **The moment is paid once,** into the ledger when it happens, as now, so nothing pays twice.
- **There are no warnings:** "use your sitting first" goes from the slot, the price line and every screen. Nothing is at risk, so nothing needs a warning.
- **The paid monthly sitting** waits on the account, as now, until the slot is empty. It is not put in the kit's queue, since it was never at risk.

## Why a queue, and not a cap where earning pauses

- **The moments are milestones, not a stream.** A filled field guide, a sealed chapter opened, a drop's first pod and a deep line: each is finite and rare (once per species, per drop, per line). A queue can't grow without bound, so it needs no cap.
- **A cap that pauses earning is still a loss.** The player fills a field guide, the moment plays, and nothing comes. That tells them to go back and spend their sitting first: the same use-it-or-lose-it pressure, made quieter. Pillar 4 rules it out either way.
- **"Holding two"** (§7.2's reason for discarding) is not the risk it seemed. The player still begins one sitting at a time. The queue asks nothing of them, and nothing in it expires. Respecting the player's time means letting them sit when they like.

## How it shows (for UI/UX; minimal words, nothing as a warning)

- **The held frame in the slot,** as now.
- **Behind it,** while sittings are owed, the edge of a second frame, with no number and no word. The player sees that another is kept for them. When the held one is begun, the next frame drops into the slot, in the same motion as an earned one.
- **The Habitat's Portrait plate** reads as now ("Portray {name}"). It says nothing about the queue.

## The gate (game design)

The proof passes when:
- every moment earned while the slot is full arrives later, in order;
- no screen warns about losing one;
- no word or mark frames the owed sitting as a problem.

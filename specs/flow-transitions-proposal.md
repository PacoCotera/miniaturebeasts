# Proposal: the hand-offs between screens (UI/UX, for the creative director)

2026-10-17. Unasked, at the creative director's request under the owner's standing rule ("experts must propose"). Read from the device sheet as one flow (`results/T-20261016-175/device-sheet-1x.png`). This is a proposal for T-20261016-177's scope, not a build.

## What the sheet shows when read as a flow

**The game's main thread is the player's pod**, and no screen hands it to the next one. It goes from the crate (Cargo) to a well (Pods), to the bench (Create), into the chamber (the Incubator), to the hatch, and finally to the Vivarium. On every screen it is drawn differently and arrives by a cut: the screen changes, and the pod is simply there. The "Grow it now?" panel even shows a generic orange egg (against §2 rule 4, one pod). The player cannot follow *their* pod through the machine. They follow menus.

## Five changes nobody has asked for

1. **The pod travels on the screen change.** Each hand-off moves the same object, using the same species shell (the one-pod slice at each screen's size):
   - Cargo to Pods: the pod flies out through the hatch, and Pods opens with it settling into its well;
   - Pods to Create ("Create from this pod"): it lifts out of the well and lands in Create's socket;
   - Create to the Incubator: it seals and slides out at the right, then arrives in the chamber's clamp from the left;
   - the hatch: the young mibi steps out of the chamber, and "Say hello" ends with it walking into the Vivarium.

   The object carries the eye across the cut. Dither stays only for room changes from Home.
2. **A notice lands on what it named.** Entering from a Home module's amber notice, or from ✓ on Idle's line, the target screen opens with focus on that thing and ✓ ready to do it. "The bud is ready" opens the Incubator on the pod with ✓ Open. "Two crates wait" starts Cargo's crate sequence. The notice clears only once that thing is on screen (the `seen` rule). Today, a notice opens a room and leaves the player to find the reason.
3. **← always names where it goes, one step back along the path that led here.** The sheet shows ← as "Back", "Home", "Probe", a species name and "Cargo" with no rule behind them. Proposal: ← names the screen it returns to; on a panel, ← is the safe option's verb (decided); from a room entered from Home, it is "Home".
4. **Every panel shows the subject the player brought.** "Grow it now?" shows *their* pod at its candling step, not an egg. The dock's choice in Cargo uses the decision panel (P1), not a strip in the bay. One panel component and one subject rule, on every screen.
5. **A consequence is shown once, where it lands.** After a panel's ✓, the next screen shows the result happening (the stamp prints, the pod seals, the mibi walks home), never a second confirmation or a toast saying the same thing. Where a result happens off screen (Return to the wild), the panel's window *is* the record, and the Vivarium shows the gap where the mibi was, once.

## What it costs

- The pod's travel frames for four hand-offs, at existing slice sizes (the art director).
- A `from` and `focus` argument on each room entry (the build).
- The ← rule in the frame's key table (the build).
- No new screens.

## The game designer's sign-off (changes 2, 3, 4 and 5)

All four are signed, on the meanings below. Change 1's carry also replaces the arrival line (specs/station-decision-points.md, recommendation 3) on the four hand-offs it covers, since the moving pod already says where the player is and why. The ribbon stays only for a jump with no carry.

**2. What counts as "seen".**
- An event notice (a chapter cleared, grown up, an elder, a portrait come) clears when its own thing is on screen once the screen has settled, after its carry. Passing through a screen does not count, and opening the room without the thing in view does not count.
- A steady wait (a ready bud, crates in the bay) is not an event. Seeing it clears nothing; it clears only when acted on (the bud opened, the crates opened).
- Each notice clears only its own thing; the others keep their lamps.
- This is written into specs/station-return-signals.md's seen flag.

**5. Which spends still go through a panel.** Exactly the existing list:
- Grow it;
- Cross them;
- Return to the wild;
- Fit the upgrade;
- a large Grow now;
- Spend a sitting;
- Read it now, when ▲ ▼ lands on an unread gene on Create.

Every other spend (Identify, Read, Mend) is one press, with its price on the bottom line before the press. Neither kind gets a second confirmation or a toast. The result lands where it happens, and the counters tick as the record. "✓ again" arming is gone everywhere. For Return to the wild, the panel's window is the record, and the Vivarium shows the gap once, on the next visit.

**4. The dock choice as P1.** It fits the dock moment, and specs/dock-moments.md now says P1. It needs these conditions:
- the panel comes after the show (any key skips to it), never in place of it;
- it has two windows: ✓ Open the bay, drawn as the player's own crates going to their pods through the Pods hatch, and Later, drawn as the crates staying with Home's Cargo lamp. ← is Later;
- it has no price, because opening costs nothing, and it accepts nothing by itself;
- there is no panel on an empty trip, and it is deferred while the player is mid-decision, as the dock moment's cases already say;
- Home's ✓ on "two crates wait" opens the bay directly, with no panel, because that choice is already made.

The same edit brings the dock moment in line with the Cargo redesign: no report card, no rack wells, and the gold glint (not the star, which is now the wish) on a crate holding a pod new to the player.

**3. What ← names.** ← goes one step back along the path that led here, and the bottom line names that screen:
- on a panel, ← is the safe option's verb, and nothing is spent;
- from a room entered from Home, or from a Home or Idle notice, ← names Home;
- after a jump (Grow → the Incubator, Open the bay → Pods, the hatch → the Vivarium), ← returns to where the jump came from, until the player moves on;
- if the action used up that screen's subject (the pod grown, the crates opened, the bud hatched), ← skips that screen. It names the step before it, or Home, so ← never lands on an empty bench, an empty bay or an empty chamber;
- during a carry, ← waits until the screen has settled.

Signed: game designer.

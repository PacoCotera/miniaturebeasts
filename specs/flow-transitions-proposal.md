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

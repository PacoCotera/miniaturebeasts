# Architecture

The devices share one world. A player's discoveries, supplies and mibis must never
duplicate, vanish or contradict each other, even when a device is away, offline,
switched off mid-transfer or lost. This document explains who owns what and how
things move.

## One kit, one world

**Working rule:** the core game runs on the kit alone. It never needs a phone,
account, internet connection or online service, including when two nearby kits
play together. Accepted progress on the kit is real game state, not a draft
waiting for a server.

**Owners of state** (**Working rule**, partly **Built in v1**):

- **Companion** owns the current expedition: what was observed, which finds were
  taken, the cargo, and the expedition's identity.
- **Station** owns everything accepted: supplies, research knowledge,
  creations, incubation, residents, habitats and expedition records. Devices do
  not keep separate inventories.
- **Caddy** shows accepted facts or a clearly dated copy. It is not an authority
  and not a required gateway.

A live view, a dated copy and an accepted result are three different things, and
the screens must say which one they show.

## Sending cargo home

**Working rule**, **Built in v1**:

1. **Send** seals the exact cargo and stops collection. Sealed cargo can't be spent.
2. **The Station accepts it once.** That ends the expedition.
3. **The Companion clears it** only after a matching confirmation.

If the confirmation is lost, the Station still has it exactly once, and the
Companion shows "delivery unknown" and asks again with the same request. Waiting
never unlocks the cargo. A full Station turns the cargo away without breaking its
seal.

v1 runs all three devices in one process, so this has not been proven over a real
radio link.

## Operations that survive interruption

**Working rule, Built in v1:**

- Every consequential action has a stable identity, and its result is saved
  together with its effect.
- Repeating the same request returns the saved result. A changed request under
  the same identity is refused.
- A request arriving, a picture finishing or a screen redrawing is not a commit.
- Damaged or unsupported saves are kept and refused, never guessed at.
- Missing art means the art is unavailable, not that the mibi is gone.

## A mibi away from home

**Open.** When a bonded mibi travels on the Companion, does what happens away
count right away, or only once the Station accepts it on return?

- **A. The Station accepts on return.** It's simpler. Interactions away are
  remembered, but lasting development waits until the Companion is home.
- **B. Bounded authority travels with the mibi.** One named mibi's development is
  handed to the Companion and handed back on return. It's richer offline, but a
  lost Companion loses that development, and the handover rules are harder.

The first prototype's specs leaned toward B if lasting offline development is
essential. That was never decided. It doesn't block the exploration work; it
blocks the design of care and bonding.

## Sharing and rights

**Working rules:**

- One household kit can hold several profiles, each with its own collection,
  supplies and discoveries. An expedition belongs to whoever started it.
- Scanning a code or printout shows permitted facts about a mibi. It never grants
  ownership, custody or breeding rights, and a copy proves nothing about where
  the mibi has been.
- Owning a mibi, looking after it and being allowed to breed it are separate
  rights.
- A shared research clue is tied to the person who received it and carries no
  genes.
- No global "first discoverer" rankings.

**Open:** trades, loans, gifts, how nearby kits recognize each other, and rewards
for scanning.

## Optional online services

**Proposal:** an optional paid service for global trading and breeding, lineage
records, certificates and minigames. It would never be needed for core play.
Cancelling it would never delete local records. Results come back as accepted,
rejected or unresolved, never last-write-wins. Nothing here is designed or built.

## Software

**Built in v1:**
- Native C with LVGL 9.6 for all device screens.
- Game rules live in shared domain code. Adapters handle controls, display,
  storage, radio, printing and power.
- The three devices currently run in one Linux process, as a simulation.

**Working rule:** creatures are produced from their genome by algorithm, with no
hand-made art per individual. Results and their sources are kept byte for byte,
and the core game never depends on a remote model call.

**Open:**
- where heavy creature generation runs;
- whether the Companion can render creatures itself;
- the service design, if online play is built at all.

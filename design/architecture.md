# Architecture

The devices share one world. A player's discoveries, supplies and mibis must never
duplicate, vanish or contradict each other, even when a device is away, offline,
switched off mid-transfer or lost. This document explains who owns what and how
things move.

## One kit, one world

**Decided:** the kit works standalone, out of the box. The core game never needs
a phone, account, internet connection or online service, including when two
nearby kits play together. Accepted progress on the kit is real game state, not
a draft waiting for a server.

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

**Decided:** the cloud experience is a gated, paid, enhanced layer on top of the
standalone kit: wireless sync for the Companion, a global mibi exchange,
mini-games, lineage records, printer games and certificates, and more. It is
never needed for core play. **Working rule:** cancelling it never deletes local
records, and results come back as accepted, rejected or unresolved, never
last-write-wins. The service itself is not yet designed or built.

## Software

**Decided 2026-10-08** ([technical architecture](proposals/technical-architecture.md)):
the loop is defined first on the browser sandbox at each device's true
resolution and colour depth, then ported. The Station's hardware is the Raspberry
Pi 4 and will not grow; everything is optimised for underpowered hardware, and
no hardware prototyping starts until the loop is complete in software. The
Station's device runtime is being re-proposed (a browser on the Pi was
withdrawn). The Companion and the Caddy port to native C on
ESP-IDF with LVGL 9 for chrome and an indexed renderer for the world view,
once the loop is stable. Screens are a spec file, a pure view and an intent
table on a shared screen layer; rules stay pure functions; the layout numbers
have one home, the spec file. This replaces the v1 rule below.

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
- the design of the cloud layer.

**Decided 2026-10-08** ([art pipeline](proposals/art-pipeline.md) v2): the first two are
settled. Every mibi's art is the **standard look**, rendered from the rig on the
Station and derived for the Companion and Caddy; the Companion renders nothing.
The unique cloud-painted render is a **prize** earned by a research item, brokered
by the Caddy, stored on the Caddy forever and archived under the kit's account;
the paid tier adds a monthly allowance and the archive. The core game still never
depends on a remote call. The first feature of the cloud layer is thereby named;
its design otherwise stays open.

**Decided 2026-10-08** (the standard painting, [art pipeline](proposals/art-pipeline.md)
§1.1): the note above is revised. Every mibi's standard look is a **cloud painting
made at Grow**, not a render from the rig; the Station renders the genome's control
passes and the **placeholder**, the Caddy **brokers** the painting and **stores**
every return forever, and the Station validates the painting and **derives** the
Companion and Caddy versions from it. Offline, a mibi wears the placeholder until the
Caddy reconnects; the game plays on, so core play still never waits on a remote call,
but a mibi's finished look does. The portrait stays the paid or earned layer on top.
A daily grow cap behind the developer toggle bounds the spend.

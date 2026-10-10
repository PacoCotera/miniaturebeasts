# Architecture

This document is the overview of the kit's software structure, for engineers:
who owns each piece of game state, how things move between the devices, what
survives an interruption, and how the software is split between the devices
and the cloud. The build specifications are
[technical-architecture.md](proposals/technical-architecture.md) (the
structure every Station, Companion and Caddy build follows) and
[lvgl-switch.md](proposals/lvgl-switch.md) (the Station's LVGL face). The
devices themselves are [devices.md](devices.md).

The devices share one world. A player's discoveries, supplies and mibis never
duplicate, vanish or contradict each other, even when a device is away,
offline, switched off mid-transfer or lost.

## One kit, one world

The kit works standalone, out of the box. The core game never needs a phone,
account, internet connection or online service, including when two nearby kits
play together. Accepted progress on the kit is real game state, not a draft
waiting for a server.

**Owners of state:**

- **Companion** owns the current expedition: what was observed, which finds
  were taken, the hold, the sealed crates in its bay, and the expedition's
  identity.
- **Station** owns everything accepted: supplies, research knowledge,
  creations, incubation, residents, habitats and expedition records. Devices
  do not keep separate inventories.
- **Caddy** shows accepted facts or a clearly dated copy. It is not an
  authority, and play never needs it. It is the kit's route to the cloud
  painter and the store of every painting (below).

A live view, a dated copy and an accepted result are three different things,
and the screens say which one they show.

## Sending cargo home

The Companion works away from the Caddy and the Station with no connection
between the devices. Cargo moves only on docking.

1. **Head home** seals the hold as one crate in the Companion's bay, three
   crates at most, and ends the expedition. Sealed cargo can't be spent. The
   player may set out again at once, with the crates sealed aboard.
2. **On docking, the Station accepts each crate once**, by its id. A pod with
   no free well waits, still sealed, and lands when a well is free, oldest
   first.
3. **The Companion clears a crate** only after a matching confirmation.

If the confirmation is lost, the Station still has the crate exactly once, and
the Companion shows "delivery unknown" and asks again with the same request.
Waiting never unlocks the cargo. Where Head home may be used, and what a broken
Probe loses, are game rules: [game.md](game.md) and the
[play manual](play-manual.md#8-going-home-head-home-the-sealed-bay-and-the-station).

## Operations that survive interruption

- Every consequential action has a stable identity, and its result is saved
  together with its effect.
- Repeating the same request returns the saved result. A changed request under
  the same identity is refused.
- A request arriving, a picture finishing or a screen redrawing is not a
  commit.
- Damaged or unsupported saves are kept and refused, never guessed at. A save
  change carries a schema number, a forward-only migration and a fixture
  ([technical-architecture.md §5.7](proposals/technical-architecture.md#57-conformance-review-checklist-for-every-build)).
- Missing art means the art is unavailable, not that the mibi is gone.

## Sharing and rights

- One household kit can hold several profiles, each with its own collection,
  supplies and discoveries. An expedition belongs to whoever started it.
- Scanning a code or printout shows permitted facts about a mibi. It never
  creates or moves a mibi, never grants ownership, custody or breeding rights,
  and a copy proves nothing about where the mibi has been. What a scanned
  stamp shows is [creatures-and-genomics.md](creatures-and-genomics.md).
- Owning a mibi, looking after it and being allowed to breed it are separate
  rights.
- A shared research clue is tied to the person who received it and carries no
  genes.
- No global "first discoverer" rankings.

## Creature art

Creatures are produced from their genome by algorithm, with no hand-made art
per individual. Results and their sources are kept byte for byte.

- Every mibi's **standard look** is a cloud painting made at Grow. The Station
  renders the genome's control passes and the **placeholder**; the Caddy
  brokers the painting and stores every return forever; the Station validates
  the painting and derives the Companion's and the Caddy's versions from it.
  The Companion renders no creature.
- Offline, a mibi wears the placeholder until the Caddy reconnects. The game
  plays on: core play never waits on a remote call, though a mibi's finished
  look does.
- The **portrait** is the paid or earned layer on top.
- A daily grow cap behind the developer toggle, and a server ceiling no page
  can raise, bound the spend.

The flow, the formats and the components are the
[art pipeline](proposals/art-pipeline.md#11-the-components).

## Optional online services

The cloud experience is a gated, paid, enhanced layer on top of the standalone
kit: cloud paintings and portraits, wireless sync for the Companion, a global
mibi exchange, mini-games, lineage records, printer games and certificates,
and more. It is never needed for core play. Cancelling it never deletes local
records, and results come back as accepted, rejected or unresolved, never
last-write-wins. The cloud layer's code lives outside this repository.

## Software

The loop is defined on the browser sandbox at each device's true resolution
and colour depth, then ported. The Station is a Raspberry Pi 4, and software
is built for that ceiling. Hardware prototyping starts once the loop is
complete in software.

- **Station.** An LVGL 9 face in C draws every screen, the same face in the
  sandbox (compiled to WebAssembly) and on the Pi. The logic (rules, genome,
  rig, stamp, the Caddy client, the save) is the sandbox's own JavaScript, run
  headless by Node beside the face on the Pi, with no browser. The two meet at
  one seam: props in, intents out.
- **Companion and Caddy.** Native C on ESP-IDF, with LVGL 9 for chrome and an
  indexed renderer for the Companion's world view, on the Station face's
  shared words. They port once the loop is stable.
- **Screens.** A screen is a spec file, a pure view that gives props, and an
  intent table, drawn by the face's C words. Rules are pure functions. The
  layout numbers have one home, the spec file. The LVGL face is the only face;
  nothing is drawn in JavaScript.

The layers, contracts and milestones are
[technical-architecture.md](proposals/technical-architecture.md); the face is
[lvgl-switch.md](proposals/lvgl-switch.md).

## Not designed yet

- When a partner travels on the Companion, does what happens away count right
  away, or only once the Station accepts it on return? This blocks the design
  of care and bonding, not exploration.
- Trades, loans, gifts, how nearby kits recognise each other, and rewards for
  scanning.
- The cloud layer beyond brokering paintings: its services, accounts and sync.
- The link that carries crates from the Companion to the Station at the dock.

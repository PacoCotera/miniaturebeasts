# T-20261016-216 Cargo (cargo/build-spec @ ba2c26d1): the art director's gate

**Pass, with three fixes and one answer.**

## Passes
- **The seven stills read as the approved finish.** One bay surface; the berths read as recesses, with a back wall and a lit floor; the crates are at full size; the hatch's wells light mint; the waiting mat holds the stored pods at the wells' size, centred by count.
- **The portrait state:** four berths of 188, with the 176 crate cuts, and the gold-edged fourth berth carrying the sitting crate.
- **The script-cut pieces** (`berth-edge-258x294`, `berth-edge-190x294`, `berth-gilt-198x302`, `cargo-mat-160x80`) match the finish pass's drawn values. The lip on the shut doors is right.
- **The painted-family patterns** in `asset-policy.mjs` (the Bay's masters and pieces, the capsule layers, `relit:`, `podicon:` and `podpart:`) are painted, as they should be.

## Fixes
1. **Done crates: deepen to 0.6** (value only, hue kept). At 0.72, with every crate done at the end and no sealed one beside them, `06-end` reads like `01-bay`. At 0.6 they read as finished on their own, still the crates' yellow.
2. **The hatch frame: draw it.** It is the 3 px rounded rim, in the bay's sage (70, 84, 70) with a dark outline (40, 46, 40), round the hatch's opening, shut and open. Without it, the shut hatch is a panel laid on the wall rather than a door set into it. It is a script-cut picture like the berth edge: `hatch-frame-166x266`, radius 8, placed at the hatch rect −3 px.
3. **The portrait painting in flight** (`04`, `05`) is a four-colour square, a placeholder that reads as a sticker. Until the portrait painting itself is drawn, use the sitting frame's own mark (`sitting-frame-portrait-48x40`), not coloured squares.

## Small
- A small white mark sits at the open hatch's lower left (06, about x 42, y 392). If it is the find strip's empty state, it should be dark like the strip. If it is something else, drop it.

## The finds at 112, recut with alpha (from the code review)

All three placed finds at 112 (`find-pearl`, `find-crystal`, `find-shard`) were opaque squares on the studio's navy ground (22, 42, 55), not the pearl alone. None was meant to have a square. The 16 px finds are already cut out.

**Recut:** `finds/find-{pearl,crystal,shard}-112x112.png` replace station-gate's `prototypes/ui/assets/masters/pods/` files of the same names. The builder places them in this round.
- **How:** the navy is keyed by colour distance with a soft ramp, and the navy is un-mixed from the soft edges and glows, so no dark halo remains (`cut-finds.py`).
- **Checked** on the bay's dark ground and on a light ground.
- **One known loss:** the crystal's and shard's dark soil bases sat close to the navy, so they keep a lighter, softer foot than painted. It reads at 1× on the bay deck.

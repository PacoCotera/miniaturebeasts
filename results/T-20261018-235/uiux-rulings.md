# T-235 Vivarium polish: UI/UX rulings (build 1be7ffed; stills at work-queue 31c04907)

**PASS on UI/UX, with the answers below.**

What the stills show:
- In the twelve-resident still, every resident stands on the moss, including the ones on the back ridge, which stand on the ridge itself and not in the haze above it.
- The rings sit at the feet and are sized to the figure.
- The tag flips over a resident near the window's foot (Dot), and a sleeper's tag stands over its curl (Moss).
- The shadows ground the figures without darkening the moss round them.
- Idle and Home carry the figures at 54/40.

The art director's gate is asked separately.

## Open questions

1. **keepOut: 356.** The spec's rule is "recomputed from the measured curlH", and 353 was an estimate from about 31. The measured adult curl is 28, so the sleepers' tag top is 456 − 28 − 32 = 396, and keepOut's top is 396 − 40 = **356**.
   - The build derives it from the measured curl, never a typed number, so a new curl moves it.
2. **Moving residents get figure geometry, measured once per atlas.** For each moving set, the logic process measures, when it composes the atlas:
   - the union bbox of the ink (alpha ≥ 128) over the set's grounded frames (walk and idle, not a hop's airborne frames): its W, its H, and its x-centre;
   - the feet line, as the lowest ink row over those frames.
   
   These are cached with the atlas and sent as the resident's `figure`. The ring and tag then hold still while the figure animates, with no per-frame jitter. A hop draws from the same F, so its shadow stays on the ground.
3. **Every species' curl is reduced to world size.** A species without the 96 × 88 nap master still reduces whatever nap picture it has by its standing figure's factor, offline, by the same tool. A world view never shows the old-size curl.
   - If a species has no nap picture at all, its sleeper draws as its standing figure, with no curl. That is a stand-in, not the old size.
4. **The draw order is accepted as built:** the ring, then the picture with its baked shadow.
   - The ring is (W + 10) wide, so its outer 5 px at each end show past the shadow, which is as wide as the foot. The stills read correctly.
   - The spec's §3 order is amended to "ring, picture (with its shadow), dither, lamp".

## The builder's readings: all confirmed

| Reading | Ruling |
| --- | --- |
| The shadow only in home, vivarium and idle (not the Habitat or the tiles) | **Confirmed.** The tiles are pictures, not the world. The Habitat's shadow belongs to its own ticket (its 150/110 close-up will want it, at that view's reduction) |
| The stand canvas extended 17 rows, with the figure about 4 px above the picture's bottom | **Confirmed.** All geometry comes from F (the ink), so the picture's margin doesn't matter |
| The figure measured at alpha ≥ 128 | **Confirmed** (§0) |
| A curl's foot line is its last ink row | **Confirmed** |
| Ground draws rejected above the profile (8 tries, then the fallback to groundTop) | **Confirmed** (§4) |
| Home's event tag isn't built, because no event tag exists yet | **Confirmed.** Nothing to build until the event exists. The rule (§2) waits for it |

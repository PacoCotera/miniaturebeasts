# K1 gate (architect, 2026-10-22 13:23 Mexico City), build ad5a3979

**Verdict: FAIL on scope; one fix round K1.1 (T-20261022-265) on the same branch, then gate again.** Everything in ad5a3979 is correct and stays: the six helpers match their headers; F5 is gone (only vocab.c's own prim_ops/FN_COMPOSED and prim_source at home_builds.c:119 remain); the 44 v_slot conversions were checked old vs new.

## 1. Missed in K1 (go in K1.1)
- F7: create.c:184 `founderShadow` (shown and hidden at the same x, y).
- F8 exact copies: frame.c `rect_of` (= v_srect), `colour` (= v_scol of `colours.<key>`), `fs`; library.c `lstr`; bench.c `bs`; home.c `vrule` (= v_si("vivarium",…)); pods.c `sa` (= v_sk(S, v_fmt("%s.%s",base,key), k)); list.c `sa` (= v_si(S, v_fmt("%s.%d",base,k), d)).
- Header nit: vocab.h:22, the `v_sprite` comment is orphaned; move the K1 block below `v_sprite_hidden` and put that comment back on `int v_sprite(`.

## 2. "has" (confirmed)
A non-empty id the host has sent. "" is the picture table's free-slot marker (wire.c:138, 147, 151, 152 clear ids to "" on drop or refused load; face-lvgl.mjs:61, :72 drop LRU pictures in play), so `wire_asset_slot("")` finds a dropped slot. Bridge fix ticket T-20261022-266 (after K1.1, before K2): `wire_asset_slot` returns -1 for NULL or "" (wire.c:122); a face_test case drops a picture, then checks `v_sprite` and `v_sprite_hidden` with "" make no node; names any node logs it changes. A bug fix, not a refactor.

## 3. The 15 parked sites: extend v_slot in K1.1
A refactor must not change any node record it emits (kind, x, y, w, h, asset); leaving them puts 15 raw calls into K7's ratchet baseline.
- `int v_slot_at(const char *id, const char *asset, const char *fallback, int x, int y, int w, int h, int shown, int hx, int hy);` as v_slot with the zero-size node at (hx, hy); contract header beside v_slot; `v_slot` becomes `return v_slot_at(id, asset, fallback, x, y, w, h, shown, x, y);`.
- habitat.c: speciesLine.mark, plate ground, plate emblem, door.glyph, portrait.frame, wild.gate: shown = 1, fallback = glass picture, (hx, hy) = the old hidden position; door.lamp: shown = `some && waiting`; portrait.picture: fallback = `has(f) ? f : glass`.
- panel.c: card picture shown = `pwid>0 && ph>0`, hidden at (r0, r1); card mark shown = 1, hidden at (r0+w-40, r1+16); strip picture shown = `pw>0 && ph>0`, hidden at (c0, c1).
- home_frame.c berth: shown = `i<n`, fallback = portrait, hidden at (0, 0); advance x only when `i<n`.
- home_builds.c tile.N.glyph: shown = `out`, hidden at (x+tx, y+ty).
- leafarc.c both leaf.%d: plain `v_slot(…, x, y, w, lh, on)` (x = y = 0 already when off, leafarc.c:24).
- Accepted change: home_frame berth and home_builds tiles gain a zero-size node when a shown picture has not been sent yet (§3.1's definition; on no golden scene).
- Proof: node records (id and box) identical on all 181 golden states, only the known 13 Pods order variation. A site whose log changes is parked alone and reported (expected candidate: panel.c card.N.mark, whose old hidden node over "" could only bind a dropped slot).

## 4. Other private accessors
- K1.1: the exact copies in §1; new `const char *v_sstr(const char *spec, const char *path)`: the string at path ("" when absent), ring of 16 buffers of 96 bytes (wire.c's id size), valid for the next 15 calls; replaces library `lstr`, bench `bs`, frame.c `fs` and the body of home_builds `home_lamp_pic` (the function stays). Cosmetic: home_frame.c's 8 `v_scol("frame", v_fmt("colours.%s","x"))` become `v_scol("frame","colours.x")`.
- K4 (amends K1's done-when for these only): panel.c col/rcol/pcol, cargo.c fcol, via K4's `const char *v_scol_or(const char *spec, const char *path, const char *d)` and `const char *v_token(const char *spec, const char *name)` (the palette name at `<spec>.colours.<name>`, else name).
- When the word is next touched (K6 or the Library tickets): page.c sa/sexists/colour, specimen.c si/sa/colour, rail.c fi/fcol become inline v_si/v_sk/v_scol over v_fmt.
- K8: the v_sprite_hidden-only dither/timing sites (home.c 475/510, habitat 122–148, cargo 190/336, bench 33/105/115, home_builds 28, create.c 129). Not F7.

## 5. v_scol's 16-slot ring: fine
Checked pointers held across calls (create.c:109, namer.c:31, home_builds.c:77): safe. In K1.1 make the ring counters `static unsigned` in v_scol and v_sstr (and v_fmt, v_pstr if free): a signed counter overflows on a long-running device.

# Re-gate (architect, 2026-10-22 14:52 Mexico City), head 6b18d684
- **K1 (K1 + K1.1): PASS.** Every K1.1 item done; node records identical on all 181 golden states. Accepted behaviour changes (one definition of "has", none on a golden scene): a zero-size node for an unsent named picture at home_builds lamp, strip, tiles, home.c g.bed.mark, leaves.c, home_frame berth; no hidden node for an empty id at panel card mark, cargo, create, habitat. Still open as ruled: panel col/rcol/pcol and cargo fcol → K4 (v_scol_or, v_token); page.c, specimen.c, rail.c when next touched; hidden-only dither/timing sites → K8.
- **Note for K7:** guard rule 7 must define "static spec accessor" exactly. cargo.c `well_centre`, incubator.c `stage_top`, moving.c `num` and screens.c props reads (`is_not_built`, `incubate_open`, `hatchnow_open`) call spec_* but are computations, not copies; K7 exempts that shape or rewrites them, never fails on them by surprise.
- **T-266: PASS.** wire_asset_slot returns -1 for NULL or "" (wire.c:122); face_test drops a picture and checks "" and NULL find nothing and make no node.
- **New: T-20261022-267.** In `on_asset`, refuse an empty id: `fail("asset: id is required")` before the drop branch (also stops slot_of("") matching). Today an empty-id message loads into a free slot that stays "free", unreachable, overwritten by the next load. Proof: a face_test case (empty id, with or without drop, refused, no slot changed); journeys show no new host-side error; node records unchanged. wire.c and face_test.c only; may run alongside K2.

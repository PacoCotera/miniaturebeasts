# K5 code review (reviewer, 2026-10-23 15:19 Mexico City), head 06f6723c

**Verdict: PASS.** No blocking items.

## Blocking
None.

## Non-blocking notes
1. prototypes/face/src/screens/panel.c:32: the strip's card_rect now uses layout_list_pitch with n; ncards() clamps to 3 but strip.cards.forms holds 2 (frame.json strip.cards.max 2). A strip given 3 cards would get zero boxes with no error (old code laid them at the strip pitch). Not reachable by the specced strip (two cards); the architect may want strip.cards forms or a v_error.
2. prototypes/face/src/screens/cargo.c:107 find_box: a find slot >= 7 now errors and draws at 0,0,0,0 (old code drew past the strip). Intended refusal path; no state reaches it.
3. prototypes/face/src/vocab/common/nameTag.c: needs regions.nameTag.plate (min/max/pad/round); a spec without it gives width 0 (old code defaulted min 48, max 1<<20). All three users (home, vivarium, habitat) carry it.
4. Habitat centring changed from box[0]+v_half(box[2]-w) to box[0]+box[2]/2-w/2. Equal while the anchor width and w are even (resident rect 304 wide; w a multiple of 8 or max 224). Verified by hand; the builder's note is right.
5. Specs now hold two sources (older keys `at`/`pitch` and `forms.*.first`); tiles.test.mjs guards agreement, except Home's Companion plates and Cargo's leaving faces which are checked only by tiles.test (leaving) and the layout vectors (companion plates); I checked the companion numbers by hand: first [540,541] = rect [528,477] + at [12,64], pitch 16 = 12 + gap 4.
6. station/tools journey run rewrites 36 tracked img/*.png in the worktree (binary diffs, no text change); not part of the commit.

## What I checked by hand against the old arithmetic
- namer keys: 636+48*(i%7), 160+48*(i/7), 40x40 = form grid upTo 28.
- home pods slots: x0=32+226-8-76=174, y0=477+(98-66)/2=493, pitch 24+2, 32+2; companion plates as above.
- habitat cross: rect [592,376]; oneRow first [608,432], twoRows first [608,414], row pitch 26 (64-38), 7 per row, up to MAXF 11 = form upTo 11; draw uses b[1]+dy as before.
- cargo find strip [36,384] pitch 20 max 7; leaving faces first x 960/928/896 for 1/2/3 (984-(16+8+32n-8)+24).
- bench: switch plates [624+152, 96+68] pitch 24 (upTo 4, longest()==4); adds pods [824,336], plates [824,384] (slot rect [624,272]); hidden places keep their position.
- panel cards n=1,2,3: w 776/380/248, pitch 792/396/264, strip form row x 108 pitch 412.
- dock ribbon: layout_plate_width(min 160, max 608, pad 16, round 8) = old ((m+32)+7)/8*8 clamp 160..rect w.
- vivarium/habitat props: listForm(R.tiles,n).first[2] equals old name==="full"?152:72 for n=0..14 (node check, no differences; n>12 throws in both); words.mjs and requests.mjs untouched.
- kit_tiles: bounds (n<0 or no form: -1, error, no draw), n=0 not a refusal, forms-less list uses own first/pitch/grid; buffers name[48]/m[160] snprintf-bounded; boxes NULL-safe. kit_nameTag: centring, 8 px clamp order, AUTO/OVER/BELOW, slot draws only nameTag and nameTag.text, out always set; v_scol ring buffer (16) is not disturbed between caller and use. No new allocation in the new C; face_test arrays (kt_rec 8, o[7]) are in bounds.
- layout.c unchanged; JS/C parity through layout.json 386 -> 753 cases (make-layout-vectors --check inside layout.test.mjs); refused counts are in the vectors.
- Changed tests: specs.test.mjs only drops `forms` from the pods.slots deepEqual; bench.test.mjs moves forms.row.first[1] instead of adds.pods.at[1] (the face now lays by the form, the checker reads `at`): both forced by the spec additions. face_test FILES list gains home/cargo/namer/bench.
- Kit checks (§5): guard green; new statics are per-site callbacks (pod_slot, pod_glint, comp_plate, switch_plate, adds_piece, leaving_face, cross_face, key_tile, find_box), none duplicates a v_* helper or kit component; both new components have contract headers; goldens check unchanged, no golden retaken; props builders use views/words.mjs and views/requests.mjs. Old build_nameTag/build_nameTagAt and g_tag* globals have no remaining references.
- Commit: author and committer Paco Cotera <paco@cotera.org>; message has no trailers and no model/tool/session names.

## Parked items (architect's gate, not mine)
Cargo build_band probe plates and Home's berths loop remain as written, as reported.

## Check lines (verbatim)
- build.sh all: `layout: 753 cases, 0 differ` / `face_test: 15177 checks, 0 failed` / `native build 46.6 s   LVGL 9.6.0 1024x600 hash=47e09df8 dirty=0 keys=1 last=17` / `wasm   build 70.5 s   face.wasm 664483 bytes (266505 gzipped)   face.mjs 12427 bytes`
- node --test (one run, all listed files): `# tests 1603` `# pass 1602` `# fail 0` `# cancelled 0` `# skipped 1` (duration 603 s)
- station journey: `journey ok · screenshots in img/` exit=0
- play journey: `play journey ok` exit=0
- face guard: `guard: 75 removed paths, 318 files read, 0 failures` / `guard ok`
- layer-check: `layer check ok` exit=0
- goldens --check: `idle: goldens match` exit=0
- station checks.mjs: `layer checks ok` (regions: 1200 boxes compared with the spec files; ink: 138 regions compared in 25 frames) exit=0
- place-masters --check: `masters: 1006 placed, 0 problems` exit=0
- public guard: `public guard ok` exit=0

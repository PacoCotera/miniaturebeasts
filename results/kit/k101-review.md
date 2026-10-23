# K10.1 code review (reviewer, 2026-10-23 17:39 Mexico City), head 3fe61bde

Verdict: PASS. No blocking items.

## Commit metadata
- Author and committer: Paco Cotera <paco@cotera.org>; message body has no trailers and no model, tool or session names. Parent 3cecde15.

## Diff read, line by line (2a-2j)
- 2a words.mjs: spell(n, beyond) = NUMBER_WORDS[n] ?? beyond ?? String(n); fill uses Object.hasOwn first, then /^([^|]+)\|([^|]+)$/ (exactly one bar, both sides non-empty) -> plural(values.n, one, many); other names stay as written; one regex /\{([^{}]+)\}/g. As ruled.
- 2b req(requests, once=false): as ruled. 2c plateDevice until default unchanged. 2d slotAt: body identical to the old pods-props slot (id master:WxH, key order kind,id,master,size,until).
- Import sites: bench, capsule, create, incubator, panel, pods import from requests.mjs; pods-props no longer defines or exports slot; grep finds no remaining importer of slot from pods-props (remaining imports there: podsProps, compareBackFocus, shellSpecies, railOf, inWords).
- cargo/habitat literals: same ids, same key order, size = rect.slice(2) gives the same arrays; until strings unchanged.
- 2e create: ph = phOf(...); only the two chamber calls exist, so exactly those gain hollow:false and the until. spell(n,"many") keeps the old fallback.
- 2f bench/home/pods; 2g panel/cargo (cargo uses spell(n,"many") per the copywriter ruling). 2j artOf w = listForm(P.cards, n).first[2] = 776/380/248 for n 1-3.
- Tests: spell beyond, fill one|many (1, 2, missing, own-key, 2 bars, empty side, constructor, toString), req once, plateDevice until, slotAt id and key order, Cargo 7/12/13 waiting and crates, Panel dockCards 12/13. They would fail on a wrong fallback or order.

## Non-blocking notes
- 2j: artOf(n=0) used to give Infinity widths (nonsense ids) and now gives 776; n>3 now throws in listForm. artOf is called only with 1..3 cards (strip skips it); behaviour only differs on unreachable input.
- fill in home-props used /\{(\w+)\}/ and now matches any name between braces (same as every other site); no home string differs (tests and journeys unchanged).
- I did not rerun the K10 props-record comparison (base vs after over the 19 views test files) or the 44-shot type log; I rely on the 1611-test run and the unchanged journeys/goldens. The builder's quoted numbers (725 of 4462 create-props, 10 of 165 policy-families) are theirs, not mine.
- Journey rewrites 36 files in prototypes/station/img: all 36 are pixel-identical to the committed PNGs (PIL difference bbox None), so only encoding bytes differ; nothing committed from my worktree.
- UI/UX fit check of "twelve pods wait for a well" / "twelve sealed crates" is still owed per the ticket (not a code item).
- Builder report says it deleted every /tmp/bake-c-* (possibly another builder's); noted for the lead.

## Checks (verbatim lines)
- build.sh all: wasm   build 106.4 s   face.wasm 664483 bytes (266505 gzipped)   face.mjs 12427 bytes
- layout: 753 cases, 0 differ
- face_test: 15177 checks, 0 failed
- native build 102.0 s   LVGL 9.6.0 1024x600 hash=47e09df8 dirty=0 keys=1 last=17
- node --test group 1 (roadmap, ui, station): # tests 671 / # pass 671 / # fail 0 / # skipped 0
- node --test group 2 (exploration, caddy, face, workbench framework, genome-stamp bins): # tests 940 / # pass 939 / # fail 0 / # skipped 1
- station journey: journey ok · screenshots in img/
- play journey: play journey ok
- face guard: guard: 75 removed paths, 318 files read, 0 failures / guard ok
- layer-check: layer check ok
- goldens --check: idle: goldens match
- station checks.mjs: ink: 138 regions compared in 25 frames / layer checks ok
- place-masters --check: masters: 1006 placed, 0 problems
- public guard: public guard ok / exit=0

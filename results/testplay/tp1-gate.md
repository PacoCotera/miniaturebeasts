# TP1 gate (architect, Mon 26 Oct 2026 20:24 Mexico City), 39ee534f

## Verdict

Not merge-ready yet. Five fix lines (F1 to F5) stay in this ticket. The layout itself conforms: every region I sampled matches the amendment within ±1 px. The architecture also conforms: the page draws no screen, it never reads the save, the frames are the standalone pages' screens, and the page talks to them through the existing `mb-dock`/`mb-caddy` messages. The footer is imported from its home and not copied. Merge once F1 to F5 are in and the test page's journey passes in CI.

## Fix lines

- **F1. `?safe` is dev-only (the lead's ruling); today it works without `?dev`.**
  - `prototypes/test/src/page.mjs:14`: `const q = DEV ? params.get("safe") : null;`
  - `prototypes/test/tools/journey.mjs:228`: change the query to `"?dev&safe=0,47,21,47"`.
  - Add one assertion: at 844×390 with touch, `?safe=0,47,21,47` without `?dev` leaves the switch at `8 8 88 44`.
- **F2. The cream dot fires on the hidden Station's own animation.**
  - Evidence: the builder's shots `phone-companion-390x664.png` and `desktop-hardware-companion-1280x720.png` both show the dot on the Station half, and the Station had no input.
  - Change `fingerprint` in `prototypes/test/src/page.mjs:356-360`. It should read the device's state, not its pixels:
    - Station: `const p = win("station").__st.props; return p ? [p.screen, p.state ?? null, p.overlay?.id ?? null].join("|") : null;`
    - Companion: `return win("companion").__mb.S.phase ?? null;`
    - `differs = (a, b) => a != null && b != null && a !== b`
    - Delete the two canvases and `GRID`, `page.mjs:353-355`.
  - Journey C: add an assertion that the Station half's dot stays hidden after 8.5 s with the Companion shown and the Station idle on Home.
- **F3. The Companion's hardware view drops keys under 44 at 1280×720.**
  - Measured: `hardware()` gives s 0.7837, so the pad keys are 52 × 0.784 = 40.8 px (41 px in the shot). The proof requires every key ≥ 44×44.
  - `prototypes/test/src/layout.mjs:142`: `const s = Math.max(44 / 52, Math.min(1, (W - 32) / 522, (H - bar - 28) / 832));`
  - At 720 tall the shell then ends at 744, and `#world.hw` already scrolls, as it does for the Station's Caddy row.
  - Journey: assert every hardware key box ≥ 44 at 1280×720 for both devices.
  - Whether scrolling is the right answer is UI/UX's to confirm; see R3. The alternative is switching that size to full screen.
- **F4. Keep focus out of the frames, so the page always catches `Shift+D`, `1`, `2` and `F` first.**
  - `prototypes/test/index.html:192` and `:193`: add `tabindex="-1"` to both iframes.
  - Today Tab can move focus into a frame. Inside the Companion frame, Shift+D then means "right".
- **F5. CI and the smoke check. These are the sign-off's measured checks, so they are approved; no new suite.**
  - `.github/workflows/site.yml:124`: append `prototypes/test/tests/*.test.mjs prototypes/play/tests/footer.test.mjs` to the `node --test` list. The footer test, from T-311 and changed here, is not in CI today either.
  - `.github/workflows/site.yml`, after `:126`: `PLAYWRIGHT_BROWSERS_PATH="$RUNNER_TEMP/pw" PW_DIR="$RUNNER_TEMP" node prototypes/test/tools/journey.mjs`. Add one comment line above it: "The test page's journey (prototypes/test/tools/journey.mjs): …".
  - The builder reports the step's time. If it passes 12 min, raise `timeout-minutes` at `:116` from 15 to 20.
  - `.github/smoke.mjs:8`: add `'/sandbox/test/'`.
  - `.github/smoke.mjs`, after `:25`: `if (path === '/sandbox/test/' && page.frames().length < 3) errors.push('test: the Station and Companion frames did not load');`
  - `.github/smoke.mjs:27`: `const foot = path === '/' ? '#build' : path === '/sandbox/test/' ? '#foot' : /\/sandbox\/(station|exploration)\/$/.test(path) ? '#buildFoot' : null;`

## Rulings

1. **Build against the lines.** It conforms apart from F1 to F4. I checked a sample against the amendment, recomputed from `layout()`:
   - 390×664 Station and Companion, 390×844 Companion, 844×390 with iPhone insets for both devices, 915×412 for both, bare 844×390, and the 844 menu without dev (417 8 284 144): all within ±1 px.
   - Behaviour: the journey's switch round trip and its Shift+D steps check what the spec asks. Shift+D from the Companion docks and shows the Station, it never reaches the Companion, and Lift shows the Companion. I read these steps in the code but did not run them (see Checked).
2. **Scope: the standalone pages' key sizes go to a follow-up (TP1b), not this ticket.** This is a departure from ux-play §10.1, which the lead files. Sequencing is the lead's; this is my recommendation.
   - Reason: the owner tests on the standalone pages today and calls them the usable ones.
   - Reason: the test page copies the Station's key CSS (`prototypes/test/index.html` .fk rules against `prototypes/station/index.html:71-87`). Resizing the keys in two places would make two homes drift apart.
   - TP1b lines: move the key look into one shared stylesheet under `prototypes/ui/`, linked by the Station, Companion and test pages. Then set the standalone sizes from the §5 hardware column:
     - Station: pad 68, view 64, ← 76, ✓ 112.
     - Companion: pad 52, Call and ← 60, ✓ 92.
   - TP1b proof: the station journey and the smoke check pass, and no golden moves.
3. **The builder's choices:**
   - 1280×720: accept the formula, s 0.84375 (864×506). The prose "0.85 (870×510)" is a rounding slip; UI/UX corrects ux-play §4.1 through boards/docs.md. The hardware 1440×900 s 0.8467 matches §4.2's "0.85" the same way.
   - The Full screen "F" hint, hidden while the word is "Full screen" (76 px holds the word or the hint, not both): accept. UI/UX to confirm.
   - The Companion's desktop full-screen keys (pad 32 px left of the face and centred on its middle; Call and ← 32 px right; ✓ 16 px beyond): accept. UI/UX to confirm.
   - The turn-the-phone line (portrait Station, 8 px under the footer, first visit only, `page.mjs:368`): accept. UI/UX to confirm what "once" means.
   - The landscape Companion pad x (centred in the left band; gives 92 and 82, as the table): accept.
   - The menu without Full screen where the API is missing (no rule line, ≡ hidden on the Companion when it would be empty): it conforms to amendment §4. Accept.
   - The cream dot: the pixel rule is rejected (F2). What counts as "changed" (the screen id only, or also a new need or a world turn) is UI/UX's. F2 builds the screen-id reading, the smallest one.
   - F3's scroll at 1280×720 is UI/UX's to confirm.
4. **CI.** Add the test page's tests and its journey in this ticket (F5). They are the ticket's own proof, so the owner's test rule already covers them. Retiring the play page's journey from CI is the owner's call, outside this ticket. The play page is still published and the journey guards it.
5. **The site.**
   - Published: yes. `site.yml` copies every `prototypes/*/` to `_site/sandbox/*`, so the page will be at `sandbox/test/` on merge.
   - Linked from the website: no, and I recommend keeping it unlinked. It is the owner's test tool; the website's links are the owner's and UI/UX's.
   - The smoke check should read it: yes, F5.
6. **The glyphs.** The switch's device glyphs, flag and ≡ are inline SVG chrome (`index.html:198,203,205`, the `SV` table at `page.mjs:42-46`). They are acceptable as stand-ins. Each lives in one place, so a master replaces it in one edit. Their look is the art director's to sign later; it is not a placeholder-register item, because they are not device art.

## Checked

- Read: the ticket, ux-play.md §1 to §5 and §10, the amendment in full, decisions 2026-10-26 13:39, 13:43 and 13:57, and the builder's regions.md.
- Code: `layout.mjs`, `page.mjs`, the test page's CSS and markup, and the diffs of station/exploration `index.html` (one raw rule each, as stated) and `footer.mjs` (footerParts/compact; footerText unchanged in output).
- Workflows: `site.yml` and `smoke.mjs`.
- Ran at 39ee534f in a sparse detached worktree: `node --test prototypes/test/tests/layout.test.mjs` gave 7/0 (14 asserts), and `prototypes/play/tests/footer.test.mjs` gave 6/0.
  - The builder's "test-page tests 20/0" does not match this. The builder should say what the 20 counts.
- Recomputed `layout()`, `menuLayout()` and `hardware()` at the sizes in Ruling 1 and at 1280×720, 1440×900 and 1920×1080 (F3 came from this).
- Looked at two of the builder's shots (F2, F3).
- Not run: the journeys, goldens, face_test, the full `node --test` and masters. The disk had 1 GB free and a full checkout is 1.8 GB. The face dist is not tracked and needs the emsdk build. On the lean allowance I took the builder's numbers for these; none looked wrong.

## Cleanup

My worktree (sparse, detached at 39ee534f) is removed and pruned, and I deleted my scratch script. Nothing was committed or pushed. The builder's worktree was not touched. This file is written and not committed.

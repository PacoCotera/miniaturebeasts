# Footer gate (architect, 2026-10-26 17:05 Mexico City), 4b3c7f6e

## Verdict
Merge once one fix lands: the smoke line below. With it, the build meets T-20261026-311. There is one shared module (prototypes/play/src/footer.mjs), its unit test, the three pages, the Station's ?dev stamp replaced, the Developer tools button still ?dev only, and no golden moved. The rest is accepted as built. One follow-up ticket is listed under Rulings (3). It does not block the merge.

## Fix lines
- `.github/smoke.mjs:27`: replace
  `if (path === '/' && !/build/.test(text)) errors.push('home: build stamp missing');`
  with
  ```js
  const foot = path === '/' ? '#build' : /\/sandbox\/(station|exploration)\/$/.test(path) ? '#buildFoot' : null;
  if (foot) await page.waitForFunction((s) => /^© 2026 Dirty Pawz Press · [0-9a-f]{7} · \d\d\/\d\d \d\d:\d\d( · save v\d+ · Caddy (online|offline))?$/.test(document.querySelector(s)?.textContent || ''), foot, { timeout: 5000 }).catch(() => errors.push(path + ': build footer missing or local'));
  ```
  Leave `text` on line 26 in place, since nothing else reads it but it does no harm. Proof for the PR: smoke ok on the assembled site.

## Rulings
1. **Merge-ready against the ticket:** yes, after the smoke line. The line format, the dd/mm HH:MM time in Mexico City from build.json's UTC `built`, "local" with no build.json, "save v3" on the Station (S.ST_SCHEMA), "save v8" on the Companion (SAVE_V), no save or Caddy part on the website, placement in the page chrome outside the device and wrapping at phone width: all match the ticket and the owner's 2026-10-26 line. The Companion has no Caddy client of its own, so the ticket's "already know" did not hold for it. The probe is what gives the Companion its Caddy part.
2. **Hash and time on the deployed site:** correct. site.yml:79 writes `_site/build.json` during "Assemble the site". The hash is `$GITHUB_SHA`, which on a push to main is the merged commit that the same job releases and mirrors to gh-pages. The time is `date -u` at assembly, so it is the build's time, which is what the ticket asks for. It is not the commit time or the moment the site went live. The shots show 67dc6e9 only because they came from a local build. Two cases are honest by design. A push to main that matches no path in site.yml:6, or a docs-only push, rebuilds nothing, so the footer keeps the last site build. The sandbox server shows the release it actually installed.
3. **Caddy state:** keep the shared probe (GET /caddy-api/v1/status, online only on a 200, at load and every 30 s) on both pages for this ticket. Do not read `caddy.state.online` yet. That value does not say what the service does:
   - `api()` in prototypes/station/src/caddy.mjs:22-27 marks any reply below 500 online, so a 404 from static hosting would read "online".
   - It is only refreshed while work is waiting (`poll()` returns early at caddy.mjs:49), so between Grows it goes stale.
   - In a local static serve it was still `null` 3 s after load.

   The probe asks the same question the game asks, with the honest reading. On the published static site (gh-pages), both pages show "Caddy offline": no service runs there and the probe gets a 404. That is honest. On the sandbox server, behind its proxy, they show "online" when the service answers.

   Follow-up ticket (architect's remit, the Caddy client's home): make `status()` set `online` from `r.status === 200`, refresh it every POLL_MS whether or not work is waiting, then point the Station's footer at `() => caddy.state.online` and keep `caddyAnswers` for the Companion only. That way the Station's footer and its lamp cannot disagree. The lamp would then say "offline" on static hosting. Whether those lamp words are right there is the game designer's question.
4. **Website through sandbox/play/src/footer.mjs:** accepted. It keeps one module with no copy, and the assembled site always carries it (site.yml:70-75). Opening website/ on its own leaves the static "© 2026 Dirty Pawz Press · local", which is true, since there is no build there. The smoke line in Fix lines catches a deployed site that falls back to "local".
5. **smoke.mjs:** tighten it in this ticket. Line 27 now passes trivially: `textContent('body')` includes the module script's own source (`getElementById('build')`, `buildUrl`, `build.json`), and the footer text itself never contains the word "build". The ticket's proof ("smoke.mjs still finds the build stamp") is therefore not met as built. The replacement in Fix lines checks the website, the Station and the Companion footers.
6. **Dynamic import() in the Companion** (prototypes/exploration/index.html, the `import('../play/src/footer.mjs')` line in section 17): sound. The footer is page chrome and holds no state, so loading it late changes nothing the game computes. In the vm-run tests the import rejects asynchronously and `.catch(() => { })` swallows it. In a browser, a failed load leaves the static "© 2026 Dirty Pawz Press · local", and `notesText()` still reads `footEl.textContent`. `loadBuild` and `caddyAnswers` catch their own failures. So a failed load degrades quietly.
   - Optional, not required: skip `mountFooter` when the page is embedded. Under html.embed the body is hidden, yet each of the play page's two iframes still probes every 30 s.

## Checked
- Read the full diff 67dc6e95..4b3c7f6e (10 files), footer.mjs, the `mexicoParts` refactor in stamp.mjs, the Station's caddy.mjs, site.yml and smoke.mjs.
- `node --test` on the play footer and stamp tests and the exploration world and freeze tests: 127 tests, 127 pass, 0 fail.
- Assembled the site in a private scratch folder the way site.yml:69-79 does, with a test build.json (4b3c7f6, built 2026-10-26T23:01:00Z), and loaded it in headless Chromium:
  - website: "© 2026 Dirty Pawz Press · 4b3c7f6 · 26/10 17:01"
  - Companion: "… · 26/10 17:01 · save v8 · Caddy offline"
  - Station: "… · 26/10 17:01 · save v3 · Caddy offline"
  - The /caddy-api/v1/status 404 reads as offline.
- The smoke replacement passes on that site with build.json present and fails on all three pages with it removed ("local"). /sandbox/play/ is unaffected.
- The builder's full-suite, journey, guard, goldens, layout and masters figures were not re-run. This is a lean gate and no number looked wrong.

## Cleanup
- Removed the private worktree and scratch site; `git worktree prune` run.
- Nothing committed or pushed, and no existing worktree touched.
- This file is not committed.

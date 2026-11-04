# Gate: Realm S2, the Settings screen and Home's knob (build/realm-settings, 10009e090)

Verdict: SIGNED. No fix. No test added (none needed), no product change.

## Read of the code
- Focus graph (home.json): knob is `settings` {up vivarium, down companion, left/right none}; Companion up is `["settings","vivarium"]`, so with the target absent from the props it falls to the Vivarium. The vectors and focus.json have the eight places, 32 cases. Frame ring and target shape are the ruling's (rect 588,446,32,6, lift 0).
- Knob only with realmSleep: home-props adds `settings` to the targets only when settings.realmSleep; the face draws the tab only when the props list it (has_target), so target and picture come together. A ring on `settings` with the setting off goes to the room (tested).
- Home with it off equals station-gate: golden home-focus-companion-nosleep.png is byte-identical (sha256 1cfa46e2...) to station-gate's home-focus-companion.png. Every other Home golden changed only because the tab is drawn (setting on in the captures).
- Intents: Home confirm on `settings` goes to the Settings screen only if h.settings.realmSleep; only confirm acts. Settings back goes Home with the ring on the knob; confirm on any row does nothing; focus kept in UI.settings, reset on a fresh entry. Settings is in BUILT, nav (parent home), frame title "Home".
- Settings props: pure selectors, no rect or colour (tested, schema-checked). `sleepBlock` follows the sleep's preflight order (not docked, no key, no save). A reason is shown (row sub, dim, notice block) only when a block exists; with nothing blocking the row sub is the plain line, no notice, dim false (tested). World turn is st.turn + 1, same as the top bar (host.mjs `turn: v.turn + 1`); tested for both the realm and sleep detail. SLEEP_INDEX_KEY held equal to sleep.mjs INDEX_KEY by a test.
- Spec strings: settings.c takes every word, role, rect, colour and pitch from settings.json (the C holds only row ids and the `sleep` id for the loss variant). No Settings words in C or JS; "Go to Settings" is home.json strings.actions. Note (not a fix): settings_key names the initial row "realm" as a literal where the props already carry focus.initial; harmless, same id.
- Kit ratchet: only adds a `settings: 0` entry in two maps; no count raised. The knob is a composed picture (no direct v_rect in home_frame.c).

## Deliberate breaks (reverted; tree clean after)
1. home-props gives the `settings` target regardless of the setting: FAIL, home-props "the targets are ... the Settings knob" (off-list and no-ring checks).
2. Settings world turn without the +1: FAIL, settings.test "the realm's words" and "one turn on one screen".
3. Sleep row always dim (a reason where nothing blocks): FAIL, settings.test "the sleep row says why..." and "the sleep row's title is dimmed...".
4. Home confirm on the knob ignores the setting: FAIL, settings.test "Home's Settings knob: ... only behind realmSleep".
5. home.json Companion up = `settings` only (no Vivarium fallback): FAIL, home.test "with the developer setting realmSleep off there is no Settings knob...".
Baseline home-props + settings tests: 60/60 pass.

## Checks
- tools/gate/full-parallel.sh from wt-realm: exit=0, TOTAL 563s, 161 jobs, 0 failed (face_test 26193 checks, 0 failed; journeys, layer check, goldens, node suites all rc=0).
- node .github/public-guard/guard.mjs --base origin/station-gate: public guard ok, exit=0.
- prototypes/station/img restored; wt-realm tree clean.

## Carried
- Settings rows do nothing on confirm yet (S3 opens the plates).
- The 4th test of the "off" case filters the targets in props rather than building from settings; the build side is covered by home-props, so both halves are tested but not in one test. Fine.

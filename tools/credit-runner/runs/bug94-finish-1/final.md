# bug94-finish-1 final
Verdict: PR 430 answers his note; nothing added.
- His note (mwp8fqwa0b5eb5, 2026-11-20, build 32f268e, seed 9, gen 7, patch 7,16 tile 18,24): carried "20 energy, 20 data, 19 essence". The Data hold was really full (20 of 20); his shot shows the bottom line "No room for Data · mark stays" and the HUD Data at 20. He read it as a range refusal (the Probe-range sign was on screen).
- PR 430 changes the line to "Data full · mark stays" (creature act: "Data full (20 of 20)"). That names the cause in his own terms, beside the HUD count of 20. Where to empty the hold is the established dock flow (←Leave, End expedition, dock); no new line added (rule 2a: smallest fix; rule: words only in his terms).
- Test: gen7-press 8/8 and creature-data 5/5 (creature-data earlier run) pass; node_modules linked from wt-fix9d to run gen7-press (not committed).
- Phone check 522x935, seed 9, hold full, facing a strike mark: full-hold-522x935.png here; the line "Data full · mark stays" fits, nothing clipped. (Exact tile 18,24 not rebuilt; a seed-9 mark used.)
- PR stays draft + hold. Next step: lead looks and marks ready.

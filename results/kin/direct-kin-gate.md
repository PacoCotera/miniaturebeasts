# Gate: no direct kin (build/direct-kin, 379643bd2)

Verdict: SIGNED. No must-fix. Squash-merged to station-gate abc6ac989.


## Checklist
1. directKin cases: PASS. cross.mjs directKin (parentLinks, ancestors walk to KINSHIP_DEPTH 3). framework.test.mjs "direct kin: the line to three generations..." (ll. 361-394) covers parent, grandparent, great-grandparent refused, great-great allowed, same parents either order and with equal genomes, half kin/cousins/uncle allowed, released record walked (l. 374), missing record counted by id (l. 375), null parents (ll. 379-380), shed pod x parent refused and x parent's other child allowed, bare genomes. T6: state.returnPod stores shed/of/genome (state.mjs); pods-rules.test "letting a shed pod go keeps its line"; exploration dock-frames.test "a shed pod the Station returns is buried again with its line" (index.html l. 1012). Minor: the ancestor map keeps the first-seen generation, so a rel label could name a deeper generation than the nearest; refusal itself is unaffected.
2. Refusal order: PASS. crossBlock: pick two, one mibi, species, gone to the wild, family, not adult, tucked, away, busy, full (state.mjs). cross.mjs refuse(): species, one mibi, locked, direct kin. Matches the design. direct-kin.test.mjs asserts family before not adult and gone-to-wild before family.
3. Pods trigger: PASS. pods-props.mjs needsPartnerSpecies: a living mibi with no allowed partner (lone, or all of the species direct kin), or best allowed pair kinship 0.25+; named mibi is the newest in need; shed pod keeps "line" and never takes it; rank 2. Test pods-props "the partner tag...". Copy "a partner for {name}" (pods.json).
4. Reading room: PASS. reading-props.mjs mate skips direct kin of the pod (kid built from origin.parentIds). Test pods-props "the reading room's mate...".
5. Old saves: PASS. Scratch test (deleted): mibis with no parents field and no genome.origin, and a JSON round trip through normalize: no throw, crossBlock "" and a forecast is made. Null parent ids match nothing, also tested.
6. Wording: PASS. No breed/blood/brother/sister/sibling in any player string in ui/specs/station/*.json (remaining hits are keys, spec notes, glyph names); "blood" appears nowhere in prototypes code or specs; "breeding is same-species only" is now "a cross needs two of the same species". Strings match the copy (partnerFamily, breedFamily, msg.held.family, pair.rel.*, partner, "no kin in common"). Only dev-tool strings still say "siblings" (dev.mjs, state.mjs seedSiblings).
7. Breaks: see table.
8. Full gate: PASS after rerun, see totals.
9. Public guard: PASS, exit=0.

## Breaks (each reverted with git checkout)
| Break | Caught by |
|---|---|
| directKin depth off by one (`g < depth - 1`): great-grandparent allowed | workbench/tests/framework.test.mjs "direct kin: the line to three generations, the same two parents, and what is not family" |
| same-parents compared in given order (no sort) | same framework.test.mjs test (the "either order" assertion) |
| null guards removed from the same-parents test (null matches null) | same framework.test.mjs test (the null-parents assertions) |
| extra: crossBlock family check moved after "not adult" | station/tests/direct-kin.test.mjs "direct kin: the refusal, the order of refusals..." |

All three required breaks are caught by one test; only one test guards the walk, which is thin but sufficient.

## Gate totals
full-parallel.sh: 162 jobs, 1 failed, 426 s. The one failure was goldens:pods, "read, Tuikis, Shape in hand" drawn twice with two different hashes (a non-determinism flake, not a golden mismatch). Rerun twice: "pods: goldens match" both times. So 161/162 first run, 162/162 with the rerun; 0 real failures. Build 0 failed (26335 face checks). Journeys, layer-check, masters, face-guard, public-guard all rc=0. Tree clean after breaks.

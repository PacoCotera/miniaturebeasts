# The realm sheet

The generator's standing check (map-making-research-1, scheme item 7; Smith and Whitehead's "expressive range": score many realms on chosen measures). Every realm job runs it before and after.

    sh tools/realm-sheet/run.sh <out dir> 1 2 3 ... 15      # dump (dump.mjs), measure.py, measure2.py, check.py per seed; up to 6 at once; about 3 minutes for 15 seeds
    python3 -I tools/realm-sheet/summarize.py <after dir> <before dir> > table.txt
    python3 -I tools/realm-sheet/landdiff.py <before>/realm-7.json <after>/realm-7.json     # did the land move?

- `dump.mjs <seed> <out.json> [SRC]` writes one realm of the tree it sits in (or SRC's) to JSON. `measure.py` (drainage, mountains, cliffs, coast, wetlands, posts, trails, roaming), `measure2.py` (ravines, fords and bridges, choke points, T1) and `check.py` (R1 trips, W4 cliff foot, R2 reach) read it. The dumps are about 3 MB each: keep them in scratch.
- `summarize.py` prints the changed checks and the 17 kept rules of report.md (with the report's targets) as one table; with a second folder it shows before and after.
- The land rules (rain shadow, a lake lets out one stream) are measured by the land tools (world-f3, world-f3a); `landdiff.py` shows the levels, fords, heights, flow, water, coast and features are equal before and after.
- Numbers are for seeds 1-15 unless a run says more. A run's own scratch goes in a temporary folder outside the repo.

# The pass checks (M1, K3) of a realm-sheet folder, mean over seeds 1-15 and each seed:
#   python3 -I tools/realm-sheet/m1k3.py <dir> [<dir> ...]     (reads m-<seed>.json and k-<seed>.json from run.sh)
# Targets: passes on a divide 80+, valley head both sides 40+, range runs touching a pass 80+, choke points with a land reason 60+.
import json, sys
keys = [('m', 'M9_passes'), ('m', 'M9_on_divide_pct'), ('m', 'M9_valley_both_sides_pct'), ('k', 'K3_range_runs'), ('k', 'K3_range_runs_via_pass_pct'), ('k', 'K3_chokes'), ('k', 'K3_choke_with_land_reason_pct'), ('k', 'K3_borders_with_one_way_pct')]
for d in sys.argv[1:]:
    print(d)
    for f, key in keys:
        vals = [json.load(open('%s/%s-%d.json' % (d, f, s))).get(key, 0) for s in range(1, 16)]
        print('  %-34s mean %6.1f  seeds %s' % (key, sum(vals) / len(vals), vals))

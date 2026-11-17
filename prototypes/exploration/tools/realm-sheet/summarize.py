"""The realm sheet's table: the changed checks and the kept rules, from m-<seed>.json, k-<seed>.json and c-<seed>.json in a folder.
   python3 summarize.py <dir> [<before dir>] > summary.md
With a before folder, each row shows before and after. Seeds are whatever the folder holds (the checks name seeds 1-15)."""
import json, sys, os, re

D = sys.argv[1]; B = sys.argv[2] if len(sys.argv) > 2 else None

def load(dr, pre):
    rows = {}
    for n in sorted(os.listdir(dr)):
        m = re.fullmatch(pre + r'-(\d+)\.json', n)
        if m: rows[int(m.group(1))] = json.load(open(os.path.join(dr, n)))
    return rows

def merged(dr):
    m, k, c = load(dr, 'm'), load(dr, 'k'), load(dr, 'c')
    seeds = sorted(set(m) & set(k) & set(c))
    return seeds, [{**m[s], **k[s], **c[s]} for s in seeds]

def mean(rows, key):
    v = [r[key] for r in rows if isinstance(r.get(key), (int, float))]
    return sum(v) / len(v) if v else None

def rng(rows, key):
    v = [r[key] for r in rows if isinstance(r.get(key), (int, float))]
    return (min(v), max(v)) if v else (None, None)

def pooled_under8(rows, key):
    g = [x for r in rows for x in r[key]]
    return 100 * sum(1 for x in g if x < 8) / max(1, len(g))

def p90(rows, key):
    g = sorted(x for r in rows for x in r[key])
    return g[int(len(g) * 0.9)] if g else None

seeds, rows = merged(D)
bseeds, brows = merged(B) if B else ([], [])
f = lambda v: '-' if v is None else ('%.1f' % v if isinstance(v, float) else str(v))
def row(name, key, target, ok, fn=mean):
    a = fn(rows, key); b = fn(brows, key) if brows else None
    lo, hi = rng(rows, key)
    status = '' if ok is None else ('ok' if ok(a) else 'MISS')
    print('| %s | %s | %s | %s | %s | %s |' % (name, target, f(b) if brows else '', f(a), '%s-%s' % (f(lo), f(hi)), status))

print('# The realm sheet: seeds %s (%d), mean over seeds; before = %s\n' % (','.join(map(str, seeds)), len(seeds), B or 'none'))
print('## Changed checks (R1, W4, R2)\n')
print('| check | target | before | after | range after | |')
print('| --- | --- | --- | --- | --- | --- |')
a = pooled_under8(rows, 'R1_gaps_any'); b = pooled_under8(brows, 'R1_gaps_any') if brows else None
print('| R1 trips whose longest stretch with nothing beside it (any destination) is under 8 places, percent of trips pooled | 90+ | %s | %s | | %s |' % (f(b) if brows else '', f(a), 'ok' if a >= 90 else 'MISS'))
a = pooled_under8(rows, 'R1_gaps_feature'); b = pooled_under8(brows, 'R1_gaps_feature') if brows else None
print('| R1 the same counting feature destinations only (a filler spot is no destination) | (report) | %s | %s | | |' % (f(b) if brows else '', f(a)))
print('| R1 longest stretch, any destination, 9th decile of trips (pooled) | under 8 | %s | %s | | %s |' % (f(p90(brows, 'R1_gaps_any')) if brows else '', f(p90(rows, 'R1_gaps_any')), 'ok' if p90(rows, 'R1_gaps_any') < 8 else 'MISS'))
print('| R1 longest stretch, feature destinations only, 9th decile (pooled) | (report) | %s | %s | | |' % (f(p90(brows, 'R1_gaps_feature')) if brows else '', f(p90(rows, 'R1_gaps_feature'))))
row('R1 each seed\'s 9th decile of the longest stretch (any destination), places', 'R1_gap_any_p90', 'under 8', lambda v: v < 8)
row('R1 trail places with any destination beside them, %', 'R1_trail_beside_any_dest_pct', '(report)', None)
row('R1 trail places with a feature destination beside them, %', 'G8_trail_beside_feature_dest_pct', '(report)', None)
row('W4 escarpment faces with water within 2, %', 'W4_faces_with_water_2_pct', '40+', lambda v: v >= 40)
row('W4 escarpments of 8+ faces with no water within 2 of the foot', 'W4_escarpments_8plus_dry', '0', lambda v: v == 0)
row('W4 springs a realm', 'springs', '(report)', None)
row('R2 trail places with no feature destination in a 7 x 7 reach, %', 'G2_reach_no_feature_dest_7x7_pct', 'under 25', lambda v: v < 25)
row('R2 the same, 11 x 11, %', 'G2_reach_no_feature_dest_11x11_pct', '(report)', None)
row('R2 the same, 5 x 5, %', 'G2_reach_no_feature_dest_pct', '(report)', None)
row('Filler spots (land\'s own) a realm', 'reach_spots', '(report)', None)

print('\n## The 17 kept rules (report.md "kept" table; the land rules hold by the land hash)\n')
print('| rule | target | before | after | range after | |')
print('| --- | --- | --- | --- | --- | --- |')
row('1 bifurcation ratio', 'M3_bifurcation_mean', '3-5', lambda v: 3 <= v <= 5)
row('2 Hack exponent', 'M4_hack_exponent', '0.5-0.65', lambda v: 0.5 <= v <= 0.65)
row('3 still water in a hollow, %', 'M7_in_hollow_pct', '85+', lambda v: v >= 85)
row('4 crest cells with a stream, %', 'M8_crest_with_stream_pct', 'under 3', lambda v: v < 3)
row('5 ranges are long (long / short axis)', 'M10_range_ratio_median', '3+', lambda v: v >= 3)
row('7 outposts at a cove, confluence or fork, %', 'M20_outposts_good_site_pct', '60+', lambda v: v >= 60)
row('8 Clark-Evans, outposts', 'M21_R_outposts', '1.2-1.6', lambda v: 1.2 <= v <= 1.6)
row('8 Clark-Evans, feature destinations', 'M21_R_feature_dest', '1.2-1.6', lambda v: 1.2 <= v <= 1.6)
row('8 Clark-Evans, landmarks', 'M21_R_landmarks', '1.2-1.6', lambda v: 1.2 <= v <= 1.6)
row('10 walkable places over 6 from a destination, %', 'G1_far_from_any_dest_over6_pct', '0', lambda v: v == 0)
row('11 feature destinations 2+ places off the trail, %', 'G7_feature_dest_2plus_off_pct', '10-25', lambda v: 10 <= v <= 25)
row('12 neighbour regions with one biome, %', 'G5_same_biome_neighbours_pct', 'under 25', lambda v: v < 25)
row('13 loops a realm', 'loops', 'as before (47.6)', None)
row('14 ravine steps on the flow, %', 'K1_ravine_steps_on_flow_pct', '100', lambda v: v >= 99.5)
row('14 ravine heads at a level edge, %', 'K1_ravine_head_at_level_edge_pct', '95+', lambda v: v >= 95)
row('15 through-ravines carrying a stream, %', 'K1_through_water_gap_pct', 'no target', None)
row('16 trail beside inland water, %', 'T1_trail_beside_inland_water_pct', 'under 5', lambda v: v < 5)
row('17 ford width at the ford (cells)', 'K2_ford_width_mean', 'about 1', lambda v: v <= 1.2)
row('17 fords on a bend, %', 'K2_ford_on_bend_pct', 'under 1', lambda v: v < 1)
row('trail on open water not at a ford or bridge', 'K2_trail_on_water_not_ford_or_bridge', '0', lambda v: v == 0)
print('\nThe rain shadow and "a lake lets out one stream" are measured by the land tools (world-f3, world-f3a) and read the land only; "destinations follow site factors" holds by construction.')
print('Did the land move? Run landdiff.py on the before and after dump of a seed: the levels, fords, heights, flow, water, coast and features must be equal (a trail lane may turn a ground cell beside a new trail).')

"""map-making-research-1, second pass: ravines, fords and bridges, choke points (rules K1-K3 in report.md), one seed per call.
   python3 measure2.py <realm-<seed>.json> <out.json>
Reads the same realm dump as measure.py; cells are realm cells (one cell = one place)."""
import json, sys, math
from collections import deque, defaultdict, Counter

d = json.load(open(sys.argv[1]))
RW, RH = d['RW'], d['RH']; NR = RW * RH
WATER, POND = 4, 1
land, level, ford, coast, acc, down, E = d['land'], d['level'], d['ford'], d['coast'], d['acc'], d['down'], d['E']
X = lambda c: c % RW; Y = lambda c: c // RW
inR = lambda x, y: 0 <= x < RW and 0 <= y < RH
def nb4(c):
    x, y = X(c), Y(c)
    return [(y + dy) * RW + x + dx for dx, dy in ((0, -1), (1, 0), (0, 1), (-1, 0)) if inR(x + dx, y + dy)]
def nb8(c):
    x, y = X(c), Y(c)
    return [(y + dy) * RW + x + dx for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dx or dy) and inR(x + dx, y + dy)]
F = d['features']; byKind = defaultdict(list)
for f in F: byKind[f['kind']].append(f)
fid = {f['id']: f for f in F}
out = {'seed': d['seed']}
wet = lambda c: land[c] == WATER
walk = [1 if (not coast[c] and not d['island'][c] and (land[c] != WATER or ford[c])) else 0 for c in range(NR)]
def slope(c):
    x, y = X(c), Y(c)
    gx = (E[y * RW + min(RW - 1, x + 1)] - E[y * RW + max(0, x - 1)]) / 2
    gy = (E[min(RH - 1, y + 1) * RW + x] - E[max(0, y - 1) * RW + x]) / 2
    return math.hypot(gx, gy)

# ---------- K1 ravines: cut by running water, downhill, where the ground steepens ----------
rav = byKind['ravine']
downhill = 0; headAtEdge = 0; ravSlope = []; streamSlope = []
for f in rav:
    h, m = f['links']['head'], f['links']['mouth']
    if h is not None and m is not None and m >= 0 and E[h] > E[m]: downhill += 1
    if h is not None and any(level[n] != level[h] for n in nb8(h) + [h]): headAtEdge += 1
    ravSlope += [slope(c) for c in f['cells']]
ravCells = set(c for f in rav for c in f['cells'])
for f in byKind['stream']:
    streamSlope += [slope(c) for c in f['cells'] if c not in ravCells]
# does the ravine follow the flow? share of its steps that run along the realm's down[] link (either way), and which way the water goes
along = steps = 0; flowsToMouth = 0
for f in rav:
    cs = f['cells'] + ([f['links']['mouth']] if f['links'].get('mouth') is not None and f['links']['mouth'] >= 0 else [])
    fw = bw = 0
    for a, b in zip(cs, cs[1:]):
        steps += 1
        if down[a] == b: along += 1; fw += 1
        elif down[b] == a: along += 1; bw += 1
    if fw >= bw: flowsToMouth += 1
out['K1_ravine_steps_on_flow_pct'] = round(100 * along / max(1, steps), 1)
out['K1_ravine_water_runs_head_to_mouth_pct'] = round(100 * flowsToMouth / max(1, len(rav)), 1)
out['K1_ravines'] = len(rav)
out['K1_ravine_downhill_pct'] = round(100 * downhill / max(1, len(rav)), 1)
out['K1_ravine_head_at_level_edge_pct'] = round(100 * headAtEdge / max(1, len(rav)), 1)
out['K1_ravine_slope_vs_stream'] = round((sum(ravSlope) / max(1, len(ravSlope))) / max(1e-9, sum(streamSlope) / max(1, len(streamSlope))), 2)
# through-ravines (cuts through a ridge): a water gap carries a stream, a wind gap is dry
gaps = byKind['through-ravine']
streamCells = set(c for f in byKind['stream'] for c in f['cells'])
waterGap = sum(1 for f in gaps if any((c in streamCells or wet(c) or acc[c] >= 20) for c in f['cells'] + sum((nb4(c) for c in f['cells']), [])))
out['K1_through_ravines'] = len(gaps)
out['K1_through_water_gap_pct'] = round(100 * waterGap / max(1, len(gaps)), 1)
out['K1_through_ravine_cells'] = [f['cells'][0] for f in gaps]

# ---------- K2 fords and bridges: a ford on a small, slow flow; a bridge where the water is too big to wade ----------
fordCells = [c for c in range(NR) if ford[c]]
bodyKind = {}
for f in F:
    if f['kind'] in ('river', 'lake', 'pond'):
        for c in f['cells']: bodyKind[c] = f['kind']
fk = Counter(bodyKind.get(c, 'other') for c in fordCells)
out['K2_ford_cells'] = len(fordCells)
out['K2_ford_on_kind_pct'] = {k: round(100 * v / max(1, len(fordCells)), 1) for k, v in fk.items()}
def width(c):
    """the shortest run of water across the cell, in cells (x or y)"""
    best = 99
    for dx, dy in ((1, 0), (0, 1)):
        n = 1
        for s in (1, -1):
            x, y = X(c) + dx * s, Y(c) + dy * s
            while inR(x, y) and wet(y * RW + x): n += 1; x += dx * s; y += dy * s
        best = min(best, n)
    return best
riverFords = [c for c in fordCells if bodyKind.get(c) == 'river']
riverCells = [c for f in byKind['river'] for c in f['cells']]
fordFlow = sorted(acc[c] for c in riverFords)
bridgeFlow = sorted(acc[b['mid']] for b in d['roads']['bridges'])
riverFlow = sorted(acc[c] for c in riverCells)
med = lambda a: a[len(a) // 2] if a else None
out['K2_ford_flow_median'] = med(fordFlow)
out['K2_bridge_flow_median'] = med(bridgeFlow)
out['K2_river_flow_median'] = med(riverFlow)
out['K2_bridges'] = len(bridgeFlow)
# a ford on a bigger flow than the median bridge: a wade where a real road would need a bridge
bm = med(bridgeFlow)
out['K2_fords_above_bridge_median_pct'] = round(100 * sum(1 for v in fordFlow if bm is not None and v > bm) / max(1, len(fordFlow)), 1) if bm else None
out['K2_ford_width_mean'] = round(sum(width(c) for c in riverFords) / max(1, len(riverFords)), 2)
out['K2_river_width_mean'] = round(sum(width(c) for c in riverCells) / max(1, len(riverCells)), 2)
# a ford at a bend (the river turns at the ford cell) vs a straight reach
def bend(c):
    w = [n for n in nb4(c) if wet(n)]
    if len(w) != 2: return None
    a, b = w
    return not (X(a) == X(b) or Y(a) == Y(b))
bends = [bend(c) for c in riverFords]
bk = [b for b in bends if b is not None]
out['K2_ford_on_bend_pct'] = round(100 * sum(bk) / max(1, len(bk)), 1)
allBend = [bend(c) for c in riverCells]
ab = [b for b in allBend if b is not None]
out['K2_river_cells_on_bend_pct'] = round(100 * sum(ab) / max(1, len(ab)), 1)
# the trail crosses a river only at a ford or a bridge (the trail never wades open water)
on = d['roads']['on']
bridgeCells = set(c for b in d['roads']['bridges'] for c in b['cells'])
out['K2_trail_on_water_not_ford_or_bridge'] = sum(1 for c in range(NR) if on[c] and wet(c) and not ford[c] and c not in bridgeCells)
out['K2_fords_on_trail_pct'] = round(100 * sum(1 for c in fordCells if on[c]) / max(1, len(fordCells)), 1)

# ---------- K3 choke points: where the trail network has one way through, and whether the land explains it ----------
adj = defaultdict(set)
for lst in d['roads']['lists']:
    for a, b in zip(lst, lst[1:]):
        if a != b: adj[a].add(b); adj[b].add(a)
nodes = list(adj)
N = len(nodes)
def comps_without(x):
    seen = {x}; sizes = []
    for s in adj[x]:
        if s in seen: continue
        q = [s]; seen.add(s); k = 0
        while q:
            u = q.pop(); k += 1
            for v in adj[u]:
                if v not in seen: seen.add(v); q.append(v)
        sizes.append(k)
    return sizes
# the whole graph's main component
seen = set(); main = []
for s in nodes:
    if s in seen: continue
    comp = [s]; seen.add(s)
    for u in comp:
        for v in adj[u]:
            if v not in seen: seen.add(v); comp.append(v)
    if len(comp) > len(main): main = comp
mainSet = set(main)
passC = set(f['cells'][0] for f in byKind['pass'])
gapC = set(c for f in byKind['through-ravine'] for c in f['cells']) | ravCells
fordS = set(fordCells)
def reason(c):
    near = nb8(c) + [c]
    if any(n in passC for n in near): return 'pass'
    if any(n in bridgeCells or n in fordS for n in near): return 'crossing'
    if any(n in gapC for n in near): return 'ravine'
    if sum(1 for n in nb8(c) if walk[n] and level[n] == level[c]) <= 4: return 'land neck'
    return 'none'
chokes = []
for c in main:
    if len(adj[c]) < 2: continue
    sizes = comps_without(c)
    if len(sizes) < 2: continue
    sizes.sort()
    cut = sum(sizes[:-1])
    if cut >= 20: chokes.append((c, cut))
# keep one choke per run (neighbouring chokes on one corridor are one choke point): the one cutting off the most, then drop its 8-neighbours
chokes.sort(key=lambda t: -t[1]); kept = []; taken = set()
for c, cut in chokes:
    if c in taken: continue
    kept.append((c, cut))
    for u in nb8(c) + [c]: taken.add(u)
# collapse corridors: a choke whose cut-off part is the same size as a kept one within 6 places is the same corridor
final = []
for c, cut in kept:
    if any(abs(cut - k2) <= 3 and max(abs(X(c) - X(c2)), abs(Y(c) - Y(c2))) <= 6 for c2, k2 in final): continue
    final.append((c, cut))
rs = Counter(reason(c) for c, _ in final)
out['K3_trail_places'] = len(main)
out['K3_chokes'] = len(final)
out['K3_choke_reason'] = dict(rs)
out['K3_choke_with_land_reason_pct'] = round(100 * sum(v for k, v in rs.items() if k != 'none') / max(1, len(final)), 1)
out['K3_choke_cells'] = [[c, cut, reason(c)] for c, cut in final]
out['K3_cut_off_mean'] = round(sum(k for _, k in final) / max(1, len(final)), 1)
# K3b ways across each region border: trail steps from one region slot to the next, runs of neighbouring steps counted once
MW, MH = d['MW'], d['MH']
reg = lambda c: (X(c) // MW, Y(c) // MH)
cross = defaultdict(list)
for a in adj:
    for b in adj[a]:
        if a < b and reg(a) != reg(b): cross[tuple(sorted((reg(a), reg(b))))].append(a)
ways = []
for pair, cs in cross.items():
    cs = sorted(set(cs)); groups = []
    for c in cs:
        for g in groups:
            if any(max(abs(X(c) - X(o)), abs(Y(c) - Y(o))) <= 2 for o in g): g.append(c); break
        else: groups.append([c])
    ways.append(len(groups))
pairsAll = 2 * 5 * 4
out['K3_border_pairs_crossed'] = len(ways)
out['K3_border_pairs_total'] = pairsAll
out['K3_ways_per_border_mean'] = round(sum(ways) / max(1, len(ways)), 2)
out['K3_borders_with_one_way_pct'] = round(100 * sum(1 for w in ways if w == 1) / max(1, len(ways)), 1)
out['K3_borders_with_4plus_ways_pct'] = round(100 * sum(1 for w in ways if w >= 4) / max(1, len(ways)), 1)
# K3c range crossings: runs of trail inside the range belt that enter on one side and leave on another; through a pass or not
lift = lambda c: E[c] - d['e0'][c]
inRange = [1 if (level[c] and not wet(c) and lift(c) >= 320) else 0 for c in range(NR)]
passNear = set(n for p in passC for n in nb8(p) + [p])
runs = []
for lst in d['roads']['lists']:
    cur = []
    for c in lst:
        if inRange[c]: cur.append(c)
        else:
            if len(cur) >= 2: runs.append(cur)
            cur = []
    if len(cur) >= 2: runs.append(cur)
out['K3_range_runs'] = len(runs)
out['K3_range_runs_via_pass_pct'] = round(100 * sum(1 for r in runs if any(c in passNear for c in r)) / max(1, len(runs)), 1)
out['K3_range_run_cells'] = [r for r in runs if not any(c in passNear for c in r)]
# T1 split: trail beside open water away from a crossing, beside the sea ring vs beside inland water (a shore path is fine)
wetW = lambda c: wet(c) and not ford[c]
bridgeAll = set(c for b in d['roads']['bridges'] for c in b['cells'] + b['ends'])
crossNear = set(n for c in list(fordS) + [b['mid'] for b in d['roads']['bridges']] for n in nb8(c) + [c])
besideSea = besideIn = 0
for c in range(NR):
    if not on[c] or wet(c) or c in bridgeAll or c in crossNear: continue
    ws = [n for n in nb4(c) if wetW(n)]
    if not ws: continue
    if any(coast[n] for n in ws): besideSea += 1
    else: besideIn += 1
tn = sum(on)
out['T1_trail_beside_sea_pct'] = round(100 * besideSea / max(1, tn), 1)
out['T1_trail_beside_inland_water_pct'] = round(100 * besideIn / max(1, tn), 1)
json.dump(out, open(sys.argv[2], 'w'))
print(json.dumps({k: v for k, v in out.items() if not (isinstance(v, list) and len(v) > 6)})[:3000])

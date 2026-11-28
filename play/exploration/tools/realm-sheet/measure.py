"""map-making-research-1: the realm-scale rules, measured on today's realm (dump.mjs output), one seed per call.
   python3 measure.py <realm-<seed>.json> <out.json>
Every measure is named M<n> as in report.md. Cells are realm cells (one cell = one place of 24 x 28 tiles)."""
import json, sys, math, random
from collections import deque, Counter, defaultdict

d = json.load(open(sys.argv[1]))
RW, RH, MW, MH = d['RW'], d['RH'], d['MW'], d['MH']
NR = RW * RH
MEADOW, POND, ROCK, WOOD, WATER = 0, 1, 2, 3, 4
land, level, ford, wk, coast = d['land'], d['level'], d['ford'], d['wkind'], d['coast']
E, e0, Z, acc, down, M = d['E'], d['e0'], d['Z'], d['acc'], d['down'], d['M']
X = lambda c: c % RW
Y = lambda c: c // RW
inR = lambda x, y: 0 <= x < RW and 0 <= y < RH
def nb4(c):
    x, y = X(c), Y(c)
    return [(y + dy) * RW + x + dx for dx, dy in ((0, -1), (1, 0), (0, 1), (-1, 0)) if inR(x + dx, y + dy)]
def nb8(c):
    x, y = X(c), Y(c)
    return [(y + dy) * RW + x + dx for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dx or dy) and inR(x + dx, y + dy)]
cheb = lambda a, b: max(abs(X(a) - X(b)), abs(Y(a) - Y(b)))
wet = lambda c: land[c] == WATER
F = d['features']
byKind = defaultdict(list)
for f in F: byKind[f['kind']].append(f)
out = {'seed': d['seed']}
rnd = random.Random(d['seed'])

# multi-source distance (Chebyshev rings, in places) from a set of cells
def ringdist(src):
    dist = [10 ** 6] * NR
    q = deque()
    for c in src:
        if dist[c]:
            dist[c] = 0; q.append(c)
    while q:
        u = q.popleft()
        for n in nb8(u):
            if dist[n] > dist[u] + 1:
                dist[n] = dist[u] + 1; q.append(n)
    return dist

walk = [1 if (not coast[c] and not d['island'][c] and (land[c] != WATER or ford[c])) else 0 for c in range(NR)]
trail = d['roads']['on']
trailCells = [c for c in range(NR) if trail[c]]
dTrail = ringdist(trailCells)

# ---------- DRAINAGE ----------
# M1 river continuity: where a river body's water leaves it, does the flow reach water again at once?
water = [1 if wet(c) else 0 for c in range(NR)]
bodyOf = [-1] * NR
for i, f in enumerate(F):
    if f['kind'] in ('river', 'lake', 'pond'):
        for c in f['cells']: bodyOf[c] = i
rivers = byKind['river']
gaps, gapLen, splits, endsCoast, endsLake, endsRiver = 0, [], 0, 0, 0, 0
gapCells = []
for f in rivers:
    i = F.index(f)
    cells = set(f['cells'])
    exits = [c for c in f['cells'] if down[c] >= 0 and down[c] not in cells]
    dests = set(); bodyGap = 0
    for c in exits:
        u, k = down[c], 0
        path = []
        while u >= 0 and not water[u] and not coast[u]:
            path.append(u); u = down[u]; k += 1
        if k > 0:
            bodyGap = max(bodyGap, k); gapCells.append(path)
        dests.add('coast' if (u < 0 or coast[u]) else bodyOf[u])
    if bodyGap: gaps += 1; gapLen.append(bodyGap)
    real = [x for x in dests]
    if len(real) >= 2: splits += 1
    first = list(dests)[0] if dests else 'coast'
    if 'coast' in dests: endsCoast += 1
    elif any(F[b]['kind'] == 'lake' for b in dests if b != 'coast' and b >= 0): endsLake += 1
    else: endsRiver += 1
out['M1_river_bodies'] = len(rivers)
out['M1_rivers_dry_gap'] = gaps
out['M1_gap_len_mean'] = round(sum(gapLen) / len(gapLen), 2) if gapLen else 0
out['M1_gap_len_max'] = max(gapLen) if gapLen else 0
out['M1_gap_cells'] = gapCells
out['M2_rivers_split'] = splits
out['M16_rivers_reach_coast'] = endsCoast
# big flow left dry: cells with flow at least the river threshold (100) that are dry and not raised
bigDry = sum(1 for c in range(NR) if acc[c] >= 100 and not water[c] and not coast[c])
bigAll = sum(1 for c in range(NR) if acc[c] >= 100 and not coast[c])
out['M1_bigflow_dry_pct'] = round(100 * bigDry / max(1, bigAll), 1)

# M3 Strahler order on the flow tree of channel cells (acc >= 20, the stream threshold), M4 Hack's law
order = sorted(range(NR), key=lambda c: acc[c])
up = defaultdict(list)
for c in range(NR):
    if down[c] >= 0: up[down[c]].append(c)
chan = [1 if acc[c] >= 20 and not coast[c] else 0 for c in range(NR)]
so = [0] * NR
cnt = [1] * NR
ln = [0] * NR
for c in order:   # acc grows downstream, so ascending acc is upstream-first
    ups = [u for u in up[c]]
    for u in ups:
        cnt[c] += cnt[u]
        ln[c] = max(ln[c], ln[u] + 1)
    if not chan[c]: continue
    cu = [so[u] for u in ups if chan[u]]
    if not cu: so[c] = 1
    else:
        m = max(cu); so[c] = m + 1 if cu.count(m) >= 2 else m
heads = Counter()
for c in range(NR):
    if not chan[c]: continue
    if all(so[u] < so[c] for u in up[c] if chan[u]): heads[so[c]] += 1
ks = sorted(heads)
rb = [heads[k] / heads[k + 1] for k in ks if heads.get(k + 1)]
out['M3_strahler_counts'] = {str(k): heads[k] for k in ks}
out['M3_bifurcation_mean'] = round(sum(rb[:-1]) / max(1, len(rb[:-1])), 2) if len(rb) > 1 else (round(rb[0], 2) if rb else None)
# Hack: L = longest flow path (cells), A = cells upstream; fit on channel cells
pts = [(math.log(cnt[c]), math.log(ln[c] + 1)) for c in range(NR) if chan[c] and cnt[c] >= 20]
if pts:
    mx = sum(p[0] for p in pts) / len(pts); my = sum(p[1] for p in pts) / len(pts)
    sxy = sum((p[0] - mx) * (p[1] - my) for p in pts); sxx = sum((p[0] - mx) ** 2 for p in pts)
    out['M4_hack_exponent'] = round(sxy / sxx, 3)

# M7 still water in a hollow: lakes and ponds whose cells sit in a filled depression (Z > E)
still = byKind['lake'] + byKind['pond']
inHollow = 0; perchedLake = 0; perchedCells = []
for f in still:
    dep = sum(1 for c in f['cells'] if Z[c] > E[c])
    if dep * 2 >= len(f['cells']): inHollow += 1
    else:
        perchedCells.extend(f['cells'])
        if f['kind'] == 'lake': perchedLake += 1
out['M7_still_bodies'] = len(still)
out['M7_in_hollow_pct'] = round(100 * inHollow / max(1, len(still)), 1)
out['M7_lakes'] = len(byKind['lake'])
out['M7_lakes_not_in_hollow'] = perchedLake
out['M7_perched_cells'] = perchedCells

# ---------- MOUNTAINS ----------
lift = lambda c: E[c] - e0[c]
inRange = [1 if (level[c] and not wet(c) and lift(c) >= 320) else 0 for c in range(NR)]
crest = set(c for f in byKind['range'] for c in f['cells'])
streamCells = set(c for f in byKind['stream'] for c in f['cells'])
riverCells = set(c for f in rivers for c in f['cells'])
out['M8_range_cells'] = sum(inRange)
out['M8_crest_cells'] = len(crest)
out['M8_crest_with_stream'] = sum(1 for c in crest if c in streamCells)
out['M8_crest_with_stream_pct'] = round(100 * out['M8_crest_with_stream'] / max(1, len(crest)), 1)
out['M8_crest_stream_cells'] = [c for c in crest if c in streamCells]
# M9 passes on a divide: the two low sides of the pass drain to different outlets, or meet only far downstream (20+ cells)
def flowpath(c, lim=4000):
    p = []
    while c >= 0 and len(p) < lim:
        p.append(c); c = down[c]
    return p
passes = byKind['pass']
onDivide = 0; valleyBoth = 0; passOff = []
chanNear = lambda c, r: any(chan[(Y(c) + dy) * RW + X(c) + dx] for dy in range(-r, r + 1) for dx in range(-r, r + 1) if inR(X(c) + dx, Y(c) + dy))
for f in passes:
    c = f['cells'][0]; x, y = X(c), Y(c)
    # the low sides: the two opposite 4-neighbours lower than the pass
    pairs = [((x, y - 1), (x, y + 1)), ((x - 1, y), (x + 1, y))]
    best = None
    for a, b in pairs:
        if inR(*a) and inR(*b):
            ca, cb = a[1] * RW + a[0], b[1] * RW + b[0]
            if E[ca] < E[c] and E[cb] < E[c]: best = (ca, cb)
    if not best: passOff.append(c); continue
    pa, pb = flowpath(best[0]), flowpath(best[1])
    sa = {u: i for i, u in enumerate(pa)}
    meet = next((j for j, u in enumerate(pb) if u in sa), None)
    far = meet is None or (meet + sa[pb[meet]]) >= 20
    if far: onDivide += 1
    else: passOff.append(c)
    # a valley heads at the pass on both sides: a channel cell (acc >= 20) within 3 cells along each low side
    def side(a):
        dx, dy = X(a) - x, Y(a) - y
        return any(chan[(y + dy * k) * RW + x + dx * k] for k in range(1, 5) if inR(x + dx * k, y + dy * k))
    if side(best[0]) and side(best[1]): valleyBoth += 1
out['M9_passes'] = len(passes)
out['M9_on_divide_pct'] = round(100 * onDivide / max(1, len(passes)), 1)
out['M9_valley_both_sides_pct'] = round(100 * valleyBoth / max(1, len(passes)), 1)
out['M9_pass_off'] = passOff
# M10 range elongation (long axis / short axis from the cells' second moments)
ratios = []
rid = [-1] * NR
comp = 0
for s in range(NR):
    if not inRange[s] or rid[s] >= 0: continue
    cells = [s]; rid[s] = comp
    for u in cells:
        for n in nb4(u):
            if inRange[n] and rid[n] < 0: rid[n] = comp; cells.append(n)
    comp += 1
    if len(cells) < 12: continue
    mx = sum(X(c) for c in cells) / len(cells); my = sum(Y(c) for c in cells) / len(cells)
    sxx = sum((X(c) - mx) ** 2 for c in cells) / len(cells); syy = sum((Y(c) - my) ** 2 for c in cells) / len(cells); sxy = sum((X(c) - mx) * (Y(c) - my) for c in cells) / len(cells)
    tr, det = sxx + syy, sxx * syy - sxy * sxy
    l1 = tr / 2 + math.sqrt(max(0, tr * tr / 4 - det)); l2 = tr / 2 - math.sqrt(max(0, tr * tr / 4 - det))
    ratios.append(math.sqrt(l1 / max(l2, 1e-6)))
ratios.sort()
out['M10_range_ratio_median'] = round(ratios[len(ratios) // 2], 2) if ratios else None

# ---------- CLIFFS ----------
# M12 spring line: share of escarpment south faces with water coming out within 2 cells of the face's foot
emerge = set()
for f in byKind['falls']: emerge.add(f['links']['foot'])
for f in byKind['stream']:
    s = f['links'].get('seen', 0)
    if s is not None and s < len(f['cells']) and s > 0: emerge.add(f['cells'][s])
for x in d['destinations']:
    if x['kind'] in ('spring', 'ravine head'): emerge.add(x['c'])
emergeD = ringdist(list(emerge)) if emerge else [10 ** 6] * NR
faces = [c for f in byKind['escarpment'] for c in f['cells']]
nearW = sum(1 for c in faces if c + RW < NR and emergeD[c + RW] <= 2)
out['M12_escarp_faces'] = len(faces)
out['M12_faces_with_water_2_pct'] = round(100 * nearW / max(1, len(faces)), 1)
out['M12_springs'] = sum(1 for x in d['destinations'] if x['kind'] == 'spring')
out['M12_falls'] = len(byKind['falls'])
# M13 scree at the foot: rock share on the low cell under a south face vs low dry land as a whole
foot = [c + RW for c in range(NR - RW) if level[c] and not level[c + RW] and not wet(c + RW)]
lowDry = [c for c in range(NR) if not level[c] and not wet(c) and not coast[c]]
out['M13_rock_at_foot_pct'] = round(100 * sum(1 for c in foot if land[c] == ROCK) / max(1, len(foot)), 1)
out['M13_rock_low_pct'] = round(100 * sum(1 for c in lowDry if land[c] == ROCK) / max(1, len(lowDry)), 1)
# M14 escarpment lengths (south faces per escarpment) and how many end in a stair
esc = byKind['escarpment']
out['M14_escarpments'] = len(esc)
out['M14_escarp_faces_mean'] = round(sum(len(f['cells']) for f in esc) / max(1, len(esc)), 1)
out['M14_escarp_without_stair'] = sum(1 for f in esc if not f['links']['stairs'])

# ---------- COASTS ----------
sea = [0] * NR
q = deque(c for c in range(NR) if coast[c])
for c in q: sea[c] = 1
while q:
    u = q.popleft()
    for n in nb4(u):
        if not sea[n] and wet(n) and not ford[n]: sea[n] = 1; q.append(n)
shore = 0
shoreLand = Counter()
for c in range(NR):
    if sea[c]: continue
    k = sum(1 for n in nb4(c) if sea[n])
    if k:
        shore += k; shoreLand[land[c]] += 1
box = 2 * ((RW - 2) + (RH - 2))
# the share of the shore that runs on the ring's own straight line (land on the first cell in from the ring)
onLine = sum(1 for c in range(NR) if not sea[c] and (X(c) in (1, RW - 2) or Y(c) in (1, RH - 2)) and any(coast[n] for n in nb4(c)))
out['M15_shore_on_ring_line_pct'] = round(100 * onLine / max(1, shore), 1)
out['M15_shore_edges'] = shore
out['M15_shore_over_box'] = round(shore / box, 3)
# sea reaching inland: sea cells not on the ring
out['M15_sea_cells_inland'] = sum(1 for c in range(NR) if sea[c] and not coast[c])
tot = sum(shoreLand.values())
out['M15_shore_land_pct'] = {k: round(100 * v / tot, 1) for k, v in [('meadow', shoreLand[MEADOW]), ('pond', shoreLand[POND]), ('rock', shoreLand[ROCK]), ('wood', shoreLand[WOOD])]}
# raised land within 2 cells of the sea (sea cliffs): none by the land rule
out['M15_raised_within2_of_sea'] = sum(1 for c in range(NR) if level[c] and any(sea[n] for n in nb8(c)))
# river mouths at the sea, and marsh at the mouth
mouths = [f for f in rivers if any(sea[n] for c in f['cells'] for n in nb4(c))]
out['M15_river_mouths_at_sea'] = len(mouths)
mouthMarsh = 0
for f in mouths:
    near = set(n for c in f['cells'] for n in nb8(c) if any(sea[m] for m in nb8(c)))
    if any(land[n] == POND for n in near): mouthMarsh += 1
out['M15_mouths_with_marsh'] = mouthMarsh
streamToCoast = sum(1 for f in byKind['stream'] if f['links']['mouth']['kind'] == 'coast')
out['M15_streams_to_coast'] = streamToCoast

# ---------- WETLANDS ----------
def slope(c):
    x, y = X(c), Y(c)
    gx = (E[y * RW + min(RW - 1, x + 1)] - E[y * RW + max(0, x - 1)]) / 2
    gy = (E[min(RH - 1, y + 1) * RW + x] - E[max(0, y - 1) * RW + x]) / 2
    return math.hypot(gx, gy)
pond = [c for c in range(NR) if land[c] == POND]
lowMeadow = [c for c in range(NR) if not level[c] and land[c] in (MEADOW,) and not coast[c]]
sp = sum(slope(c) for c in pond) / max(1, len(pond)); sm = sum(slope(c) for c in lowMeadow) / max(1, len(lowMeadow))
out['M17_marsh_cells'] = len(pond)
out['M17_marsh_slope_vs_meadow'] = round(sp / max(sm, 1e-9), 2)
# share of marsh by the lower half of rivers (by flow) vs the upper half
out['M17_marsh_on_raised'] = sum(1 for c in pond if level[c])

# ---------- VEGETATION ----------
dry = [c for c in range(NR) if not wet(c) and not coast[c]]
dec = sorted(dry, key=lambda c: E[c])
n = len(dec)
def share(cells, k): return round(100 * sum(1 for c in cells if land[c] == k) / max(1, len(cells)), 1)
out['M18_wood_by_height_quintile'] = [share(dec[i * n // 5:(i + 1) * n // 5], WOOD) for i in range(5)]
out['M18_rock_by_height_quintile'] = [share(dec[i * n // 5:(i + 1) * n // 5], ROCK) for i in range(5)]
out['M18_wood_raised_vs_low'] = [share([c for c in dry if level[c]], WOOD), share([c for c in dry if not level[c]], WOOD)]
out['M18_wood_on_range'] = share([c for c in range(NR) if inRange[c]], WOOD)

# ---------- POSTS AND SITES ----------
def wetW(c): return land[c] == WATER and not ford[c]
cove = [1 if walk[c] and not ford[c] and sum(1 for nn in nb4(c) if wetW(nn)) == 1 else 0 for c in range(NR)]
conf = [0] * NR
for f in byKind['stream']:
    m = f['links']['mouth']
    if m['kind'] in ('river', 'lake', 'stream'):
        c = m['c'] if m['kind'] == 'stream' else f['cells'][-1]
        for nn in nb8(c) + [c]: conf[nn] = 1
endSet, forkSet = set(d['roads']['ends']), set(d['roads']['forks'])
wD = ringdist([c for c in range(NR) if wet(c) and not coast[c]] + list(streamCells))
fordD = ringdist([c for c in range(NR) if ford[c]] + [b['mid'] for b in d['roads']['bridges']])
passD = ringdist([f['cells'][0] for f in passes]) if passes else [10 ** 6] * NR
def site(cs, name):
    k = len(cs)
    out[name + '_n'] = k
    out[name + '_good_site_pct'] = round(100 * sum(1 for c in cs if any(cove[nn] or conf[nn] for nn in nb8(c) + [c]) or c in forkSet) / max(1, k), 1)
    out[name + '_water_within1_pct'] = round(100 * sum(1 for c in cs if wD[c] <= 1) / max(1, k), 1)
    out[name + '_on_trail_pct'] = round(100 * sum(1 for c in cs if dTrail[c] == 0) / max(1, k), 1)
    out[name + '_at_fork_or_end_pct'] = round(100 * sum(1 for c in cs if c in forkSet or c in endSet) / max(1, k), 1)
    out[name + '_on_marsh_pct'] = round(100 * sum(1 for c in cs if land[c] == POND) / max(1, k), 1)
    out[name + '_crossing_or_pass_within1_pct'] = round(100 * sum(1 for c in cs if fordD[c] <= 1 or passD[c] <= 1) / max(1, k), 1)
site(d['outposts'], 'M20_outposts')
site(d['starts'], 'M20_starts')
# M21 nearest-neighbour index (Clark and Evans 1954), on the walkable area, Euclidean in cells
area = sum(walk)
def clark(cs):
    if len(cs) < 3: return None
    s = 0
    for a in cs:
        s += min(math.hypot(X(a) - X(b), Y(a) - Y(b)) for b in cs if b != a)
    return round((s / len(cs)) / (0.5 / math.sqrt(len(cs) / area)), 2)
featDest = [x['c'] for x in d['destinations'] if x['kind'] != 'reach']
allDest = [x['c'] for x in d['destinations']]
out['M21_R_outposts'] = clark(d['outposts'])
out['M21_R_feature_dest'] = clark(featDest)
out['M21_R_all_dest'] = clark(allDest)
lmc = [p['c'] for p in d['landmarks']]
out['M21_R_landmarks'] = clark(lmc)

# ---------- TRAILS ----------
tc = trailCells
out['M23_trail_cells'] = len(tc)
onR = [c for c in tc if inRange[c]]
out['M23_trail_on_range_pct'] = round(100 * len(onR) / max(1, len(tc)), 1)
out['M23_trail_on_range_off_pass_pct'] = round(100 * sum(1 for c in onR if passD[c] > 1) / max(1, len(onR)), 1)
out['M23_trail_raised_pct'] = round(100 * sum(1 for c in tc if level[c]) / max(1, len(tc)), 1)
out['M23_land_raised_pct'] = round(100 * sum(1 for c in range(NR) if walk[c] and level[c]) / max(1, area), 1)
# M25 (R8) trail beside water away from a crossing
bridgeCells = set(c for b in d['roads']['bridges'] for c in b['cells'] + b['ends'])
beside = [c for c in tc if not wet(c) and any(wetW(nn) for nn in nb4(c)) and fordD[c] > 1 and c not in bridgeCells]
out['M25_trail_beside_water_pct'] = round(100 * len(beside) / max(1, len(tc)), 1)
out['M24_trail_on_open_water'] = sum(1 for c in tc if wetW(c) and c not in bridgeCells)

# ---------- ROAMING (Q2) ----------
walkCells = [c for c in range(NR) if walk[c]]
dF = ringdist(featDest); dA = ringdist(allDest)
out['G1_far_from_feature_dest_max'] = max(dF[c] for c in walkCells)
out['G1_far_from_feature_dest_over6_pct'] = round(100 * sum(1 for c in walkCells if dF[c] > 6) / len(walkCells), 1)
out['G1_far_from_any_dest_max'] = max(dA[c] for c in walkCells)
out['G1_far_from_any_dest_over6_pct'] = round(100 * sum(1 for c in walkCells if dA[c] > 6) / len(walkCells), 1)
out['G9_filler_share_pct'] = round(100 * (len(allDest) - len(featDest)) / max(1, len(allDest)), 1)
out['G9_dest_kinds'] = dict(Counter(x['kind'] for x in d['destinations']))
# G2 the reach (5 x 5 places round a walkable place on a trail): feature destinations and edges in view
edgeCell = [1 if (wet(c) and not coast[c]) or any(level[nn] != level[c] for nn in nb4(c)) or inRange[c] else 0 for c in range(NR)]
featSet = set(featDest); lmSet = set(lmc)
noDest = noEdge = noLm = 0; kindsIn = []
sample = [c for c in walkCells if dTrail[c] == 0]
kindAt = {x['c']: x['kind'] for x in d['destinations'] if x['kind'] != 'reach'}
for c in sample:
    x, y = X(c), Y(c)
    win = [(y + dy) * RW + x + dx for dy in range(-2, 3) for dx in range(-2, 3) if inR(x + dx, y + dy)]
    ks = set(kindAt[w] for w in win if w in kindAt)
    if not ks: noDest += 1
    if not any(edgeCell[w] for w in win): noEdge += 1
    if not any(w in lmSet for w in win): noLm += 1
    kindsIn.append(len(ks))
for r, name in ((3, '7x7'), (5, '11x11')):
    nd = 0
    for c in sample:
        x, y = X(c), Y(c)
        if not any(((y + dy) * RW + x + dx) in kindAt for dy in range(-r, r + 1) for dx in range(-r, r + 1) if inR(x + dx, y + dy)): nd += 1
    out['G2_reach_no_feature_dest_%s_pct' % name] = round(100 * nd / max(1, len(sample)), 1)
# landmarks: is a landmark the only one of its kind in a 5 x 5 reach round it (Lynch: a landmark works by being singular)?
lmKind = defaultdict(list)
for p in d['landmarks']: lmKind[p['kind']].append(p['c'])
notAlone = 0
for p in d['landmarks']:
    if any(o != p['c'] and cheb(o, p['c']) <= 5 for o in lmKind[p['kind']]): notAlone += 1   # 11 x 11, the widest reach (landmarks stand 3+ apart, so a 5 x 5 never holds two)
out['G3_landmark_same_kind_in_reach_pct'] = round(100 * notAlone / max(1, len(d['landmarks'])), 1)
out['G3_landmarks_per_region'] = round(len(d['landmarks']) / 25, 1)
# trail coverage: share of trail places with a destination beside them (within 1 place)
out['G8_trail_beside_feature_dest_pct'] = round(100 * sum(1 for c in trailCells if dF[c] <= 1) / max(1, len(trailCells)), 1)
out['G8_trail_beside_any_dest_pct'] = round(100 * sum(1 for c in trailCells if dA[c] <= 1) / max(1, len(trailCells)), 1)
out['G9_filler_spots'] = dict(Counter(x.get('spot', '?') for x in d['destinations'] if x['kind'] == 'reach'))
out['G2_reach_no_feature_dest_pct'] = round(100 * noDest / max(1, len(sample)), 1)
out['G2_reach_no_edge_pct'] = round(100 * noEdge / max(1, len(sample)), 1)
out['G2_reach_no_landmark_pct'] = round(100 * noLm / max(1, len(sample)), 1)
out['G2_reach_kinds_mean'] = round(sum(kindsIn) / max(1, len(kindsIn)), 2)
# G4 rhythm of open and closed ground along trips on the trail
def openness(c):
    blocked = sum(1 for nn in nb8(c) if not walk[nn] or level[nn] != level[c])
    if land[c] == WOOD or blocked >= 4: return 'closed'
    if blocked == 0 and land[c] != WOOD: return 'open'
    return 'mid'
adj = defaultdict(list)
for lst in d['roads']['lists']:
    for a, b in zip(lst, lst[1:]):
        if b not in adj[a]: adj[a].append(b)
        if a not in adj[b]: adj[b].append(a)
nodes = [c for c in adj]
def bfs_path(a, b):
    prev = {a: None}; q = deque([a])
    while q:
        u = q.popleft()
        if u == b: break
        for v in adj[u]:
            if v not in prev: prev[v] = u; q.append(v)
    if b not in prev: return None
    p = [];
    while b is not None: p.append(b); b = prev[b]
    return p[::-1]
runsMax, switches, lens, crumbGapF, crumbGapA = [], [], [], [], []
trips = 0
while trips < 150:
    a, b = rnd.choice(nodes), rnd.choice(nodes)
    if cheb(a, b) < 15: continue
    p = bfs_path(a, b)
    if not p: continue
    trips += 1
    cls = [openness(c) for c in p]
    best = cur = 1; sw = 0
    for i in range(1, len(cls)):
        if cls[i] == cls[i - 1]: cur += 1
        else: cur = 1; sw += 1
        best = max(best, cur)
    runsMax.append(best); switches.append(10 * sw / len(p)); lens.append(len(p))
    g = gm = 0; bg = bgm = 0
    for c in p:
        if dF[c] <= 1: g = 0
        else: g += 1
        if dA[c] <= 1: gm = 0
        else: gm += 1
        bg = max(bg, g); bgm = max(bgm, gm)
    crumbGapF.append(bg); crumbGapA.append(bgm)
runsMax.sort(); crumbGapF.sort(); crumbGapA.sort()
out['G4_trip_len_mean'] = round(sum(lens) / len(lens), 1)
out['G4_same_ground_run_median'] = runsMax[len(runsMax) // 2]
out['G4_same_ground_run_p90'] = runsMax[int(len(runsMax) * 0.9)]
out['G4_switches_per10_mean'] = round(sum(switches) / len(switches), 2)
out['G4_share_closed_open_mid'] = dict(Counter(openness(c) for c in tc))
out['G8_gap_no_feature_dest_median'] = crumbGapF[len(crumbGapF) // 2]
out['G8_gap_no_feature_dest_p90'] = crumbGapF[int(len(crumbGapF) * 0.9)]
out['G8_gap_no_any_dest_p90'] = crumbGapA[int(len(crumbGapA) * 0.9)]
# G5 districts: neighbouring regions with the same biome
bi = d['biome']; same = pairs = 0
for ay in range(5):
    for ax in range(5):
        for bx, by in ((ax + 1, ay), (ax, ay + 1)):
            if bx < 5 and by < 5:
                pairs += 1; same += bi[ay * 5 + ax] == bi[by * 5 + bx]
out['G5_same_biome_neighbours_pct'] = round(100 * same / pairs, 1)
out['G5_biomes'] = len(set(bi))
# G7 secrets: feature destinations off the trail
fd = [x for x in d['destinations'] if x['kind'] != 'reach']
out['G7_feature_dest_on_trail_pct'] = round(100 * sum(1 for x in fd if dTrail[x['c']] == 0) / max(1, len(fd)), 1)
out['G7_feature_dest_2plus_off_pct'] = round(100 * sum(1 for x in fd if dTrail[x['c']] >= 2) / max(1, len(fd)), 1)
out['G7_landmarks_on_trail_pct'] = round(100 * sum(1 for c in lmc if dTrail[c] <= 1) / max(1, len(lmc)), 1)
out['G7_landmarks_n'] = len(lmc)
out['G7_landmark_kinds'] = dict(Counter(p['kind'] for p in d['landmarks']))
out['loops'] = d['roads']['loops']
json.dump(out, open(sys.argv[2], 'w'))
print(json.dumps({k: v for k, v in out.items() if not (isinstance(v, list) and len(v) > 6)})[:5000])

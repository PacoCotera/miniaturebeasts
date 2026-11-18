"""The realm sheet's checks for the trail and the cliff foot (map-making-research-1 rules R1, R2, W4), one seed per call.
   python3 check.py <realm-<seed>.json> <out.json>
Reads the dump.mjs output. Cells are realm cells (one cell = one place).
  R1  random trips of about 100 places along the trail graph (300 a seed): the longest stretch with no destination within 1 place of the path
      (any destination, and feature destinations only: a filler spot is kind 'reach')
  W4  escarpments of 8+ faces: how many have no water within 2 of their foot; the share of faces with water within 2 (measure.py M12, same water set)
  R2  trail places whose reach (5 x 5, 7 x 7, 11 x 11 places) holds no feature destination
  land  a hash of the land's own arrays (land, level, ford, height, flow, water kinds, coast, the feature list): equal before and after means the land did not move"""
import json, sys, random, hashlib
from collections import deque, defaultdict

d = json.load(open(sys.argv[1]))
RW, RH = d['RW'], d['RH']; NR = RW * RH
WATER = 4
land, level, ford, coast, down, acc = d['land'], d['level'], d['ford'], d['coast'], d['down'], d['acc']
X = lambda c: c % RW; Y = lambda c: c // RW
inR = lambda x, y: 0 <= x < RW and 0 <= y < RH
def nb8(c):
    x, y = X(c), Y(c)
    return [(y + dy) * RW + x + dx for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dx or dy) and inR(x + dx, y + dy)]
cheb = lambda a, b: max(abs(X(a) - X(b)), abs(Y(a) - Y(b)))
F = d['features']; byKind = defaultdict(list)
for f in F: byKind[f['kind']].append(f)
out = {'seed': d['seed']}

def ringdist(src):
    dist = [10 ** 6] * NR; q = deque()
    for c in src:
        if dist[c]: dist[c] = 0; q.append(c)
    while q:
        u = q.popleft()
        for n in nb8(u):
            if dist[n] > dist[u] + 1: dist[n] = dist[u] + 1; q.append(n)
    return dist

dests = d['destinations']
allDest = [x['c'] for x in dests]
featDest = [x['c'] for x in dests if x['kind'] != 'reach']
dA, dF = ringdist(allDest), ringdist(featDest)
trailCells = [c for c in range(NR) if d['roads']['on'][c]]

# ---- the land hash ----
h = hashlib.sha256()
for k in ('land', 'level', 'ford', 'E', 'acc', 'down', 'wkind', 'coast', 'worn', 'M', 'T'):
    h.update(json.dumps(d[k]).encode())
h.update(json.dumps(d['features']).encode())
out['land_hash'] = h.hexdigest()[:16]
out['dest_kinds'] = {}
for x in dests: out['dest_kinds'][x['kind']] = out['dest_kinds'].get(x['kind'], 0) + 1
out['springs'] = out['dest_kinds'].get('spring', 0)
out['reach_spots'] = out['dest_kinds'].get('reach', 0)
spots = {}
for x in dests:
    if x['kind'] == 'reach': spots[x.get('spot', '?')] = spots.get(x.get('spot', '?'), 0) + 1
out['reach_spot_kinds'] = spots

# ---- R1: trips along the trail ----
adj = defaultdict(list)
for lst in d['roads']['lists']:
    for a, b in zip(lst, lst[1:]):
        if a == b: continue
        if b not in adj[a]: adj[a].append(b)
        if a not in adj[b]: adj[b].append(a)
nodes = sorted(adj)
def bfs_path(a, b):
    prev = {a: None}; q = deque([a])
    while q:
        u = q.popleft()
        if u == b: break
        for v in adj[u]:
            if v not in prev: prev[v] = u; q.append(v)
    if b not in prev: return None
    p = []
    while b is not None: p.append(b); b = prev[b]
    return p[::-1]
rnd = random.Random(1000 + d['seed'])
gapsAny, gapsFeat, lens = [], [], []
trips = 0
while trips < 300:
    a, b = rnd.choice(nodes), rnd.choice(nodes)
    if cheb(a, b) < 15: continue
    p = bfs_path(a, b)
    if not p: continue
    trips += 1
    g = gm = bg = bgm = 0
    for c in p:
        if dF[c] <= 1: g = 0
        else: g += 1
        if dA[c] <= 1: gm = 0
        else: gm += 1
        bg = max(bg, g); bgm = max(bgm, gm)
    gapsFeat.append(bg); gapsAny.append(bgm); lens.append(len(p))
out['R1_trips'] = trips
out['R1_gaps_any'] = gapsAny
out['R1_gaps_feature'] = gapsFeat
out['R1_trip_len_mean'] = round(sum(lens) / len(lens), 1)
out['R1_trips_under8_any_pct'] = round(100 * sum(1 for g in gapsAny if g < 8) / trips, 1)
out['R1_trips_under8_feature_pct'] = round(100 * sum(1 for g in gapsFeat if g < 8) / trips, 1)
sa = sorted(gapsAny); sf = sorted(gapsFeat)
out['R1_gap_any_p90'] = sa[int(len(sa) * 0.9)]; out['R1_gap_any_median'] = sa[len(sa) // 2]
out['R1_gap_feature_p90'] = sf[int(len(sf) * 0.9)]; out['R1_gap_feature_median'] = sf[len(sf) // 2]
out['R1_trail_beside_any_dest_pct'] = round(100 * sum(1 for c in trailCells if dA[c] <= 1) / max(1, len(trailCells)), 1)
out['R1_trail_beside_feature_dest_pct'] = round(100 * sum(1 for c in trailCells if dF[c] <= 1) / max(1, len(trailCells)), 1)

# ---- W4: water at the cliff foot ----
emerge = set()
for f in byKind['falls']: emerge.add(f['links']['foot'])
for f in byKind['stream']:
    s = f['links'].get('seen', 0)
    if s is not None and 0 < s < len(f['cells']): emerge.add(f['cells'][s])
for x in dests:
    if x['kind'] in ('spring', 'ravine head'): emerge.add(x['c'])
emD = ringdist(list(emerge)) if emerge else [10 ** 6] * NR
esc = byKind['escarpment']
faces = [c for f in esc for c in f['cells']]
out['W4_escarpments'] = len(esc)
out['W4_faces'] = len(faces)
out['W4_faces_with_water_2_pct'] = round(100 * sum(1 for c in faces if c + RW < NR and emD[c + RW] <= 2) / max(1, len(faces)), 1)
big = [f for f in esc if len(f['cells']) >= 8]
dry = [f for f in big if not any(c + RW < NR and emD[c + RW] <= 2 for c in f['cells'])]
out['W4_escarpments_8plus'] = len(big)
out['W4_escarpments_8plus_dry'] = len(dry)
out['W4_dry_foot_cells'] = [min(c + RW for c in f['cells']) for f in dry]
out['W4_springs_at_foot'] = sum(1 for x in dests if x['kind'] == 'spring' and any(x['c'] == c + RW for f in esc for c in f['cells']))

# ---- R2: a feature destination in the reach of a trail place ----
fs = set(featDest)
for r, name in ((2, '5x5'), (3, '7x7'), (5, '11x11')):
    n = 0
    for c in trailCells:
        x, y = X(c), Y(c)
        if not any(((y + dy) * RW + x + dx) in fs for dy in range(-r, r + 1) for dx in range(-r, r + 1) if inR(x + dx, y + dy)): n += 1
    out['R2_no_feature_dest_%s_pct' % name] = round(100 * n / max(1, len(trailCells)), 1)
out['R2_trail_places'] = len(trailCells)
json.dump(out, open(sys.argv[2], 'w'))
print(json.dumps({k: v for k, v in out.items() if not (isinstance(v, list) and len(v) > 6)})[:3000])

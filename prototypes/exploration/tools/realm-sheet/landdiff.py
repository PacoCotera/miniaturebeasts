"""Did the land move? Compares two realm dumps of one seed (before and after a change to destinations or trails).
   python3 landdiff.py <before realm-<seed>.json> <after realm-<seed>.json>
The realm's land is region-final arrays, and the trail pass clears a lane through a thicket, so a new trail cell can turn a wood cell to meadow. What must not move: levels, fords, heights, flow, water,
the coast, the features. Prints one line: the seed, the arrays that differ, and for the land array the cells that differ and how many of them lie on the after-trail."""
import json, sys
a = json.load(open(sys.argv[1])); b = json.load(open(sys.argv[2]))
bad = [k for k in ('level', 'ford', 'E', 'acc', 'down', 'wkind', 'coast', 'worn', 'M', 'T', 'features', 'biome', 'island', 'comp') if a[k] != b[k]]
diff = [c for c, (x, y) in enumerate(zip(a['land'], b['land'])) if x != y]
RW, NR = b['RW'], b['RW'] * b['RH']
def near(c):   # on the trail, or within one cell of it, before or after
    x, y = c % RW, c // RW
    return any(0 <= x + dx < RW and 0 <= y + dy < b['RH'] and (a['roads']['on'][(y + dy) * RW + x + dx] or b['roads']['on'][(y + dy) * RW + x + dx]) for dx in (-1, 0, 1) for dy in (-1, 0, 1))
onT = [c for c in diff if near(c)]
print('seed %d: arrays moved: %s; land cells changed: %d, within one cell of a trail: %d' % (b['seed'], ','.join(bad) or 'none', len(diff), len(onT)))

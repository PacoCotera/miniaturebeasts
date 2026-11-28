"""Are the Hollow Tree landmarks the same in two sheet runs?   python3 -I hollow-same.py <before dir> <after dir> [seed ...]
Reads realm-<seed>.json of each; prints one line a seed and a last line 'HOLLOW EQUAL' or 'HOLLOW DIFFERENT'."""
import json, sys
b, a = sys.argv[1], sys.argv[2]
seeds = [int(s) for s in sys.argv[3:]] or list(range(1, 16))
same = True
for s in seeds:
    hb = sorted(p['c'] for p in json.load(open('%s/realm-%d.json' % (b, s)))['landmarks'] if p['kind'] == 'hollow-tree')
    ha = sorted(p['c'] for p in json.load(open('%s/realm-%d.json' % (a, s)))['landmarks'] if p['kind'] == 'hollow-tree')
    print('seed %d: before %d, after %d, %s' % (s, len(hb), len(ha), 'equal' if hb == ha else 'DIFFERENT'))
    same = same and hb == ha
print('HOLLOW EQUAL' if same else 'HOLLOW DIFFERENT')

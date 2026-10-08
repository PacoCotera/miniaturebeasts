"""Writes source/*.txt (the explicit pixel data build.py reads): a traced mask from trace.py, then the hand edits listed in EDITS
(set = pixels added, clear = pixels removed), then the lit edge placed on the top and the left of every stroke, with the hand overrides in LIT.
The txt files are the sources of truth; this script only records how they were first written."""
import sys; sys.path.insert(0, '.')
import trace as t
EDITS = {}      # name -> {"set": [(x, y)], "clear": [(x, y)]}
LIT = {}        # name -> {(x, y): '+' or '#'}
exec(open('edits.py').read()) if __import__('os').path.exists('edits.py') else None
for k, g in t.D.items():
    m = [row[:] for row in g]
    e = EDITS.get(k, {})
    for x, y in e.get('clear', []): m[y][x] = 0
    for x, y in e.get('set', []): m[y][x] = 1
    ov = LIT.get(k, {}); rows = []
    for y in range(24):
        r = ''
        for x in range(24):
            if not m[y][x]: r += '.'
            elif (x, y) in ov: r += ov[(x, y)]
            else: r += '+' if (x == 0 or not m[y][x - 1] or y == 0 or not m[y - 1][x]) else '#'
        rows.append(r)
    open(f'source/{k}.txt', 'w').write(f'; {k}: 24x24, one emblem. # base colour, + lit edge (top and left, one palette step lighter), . empty. Traced, then edited by hand (source_gen.py records how).\n' + '\n'.join(rows) + '\n')

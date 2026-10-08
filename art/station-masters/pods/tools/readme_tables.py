"""Regenerate the Slices section of README.md from slices/manifest.json. python3 -I tools/readme_tables.py"""
import json
r = open("README.md").read(); m = json.load(open("slices/manifest.json"))
def grp(n):
    for p, g in (("room-", "Bench scene, dish, shelf"), ("ring-column", "List column plate (signed)"), ("ring-", "Wells and hatch"), ("rail-tab", "Chapter rail tabs (hanging, slant baked)"), ("page-pane", "Page pane (signed)"), ("trait-picture-frame", "Picture frames (overlay, transparent inside)"), ("plate-", "Name, origin and message plates"), ("stamp-", "Stamp label (signed)"), ("frame-", "Top bar and bottom line (signed)"), ("pod-", "Pods: one systematic pod in layers")):
        if n.startswith(p): return g
G = {}
for n, v in sorted(m.items()): G.setdefault(grp(n), []).append((n, v))
rect = lambda v: "" if not v["rect"] else "(%s)" % ", ".join("·" if x is None else str(x) for x in v["rect"])
out = ["## Slices\n\nEach slice is named by the register id it replaces (`room`, `ring`, `page`, `trait-picture`, `stamp`, `pod`); where the register has none, the id is **proposed** (`rail-tab-*`, `plate-*`, `frame-*`, `room-shelf`). Rectangles follow the layout spec of branch `design-pods-relayout` (637fb1e): the pod's box is bottom-centred on (712, 392), the dish is (600, 328, 224, 96), the page (176, 112, 408, 440) with the portrait frame (264, 160, 232, 312), the stamp label (888, 248). A tab hangs from the top bar's rule at y 40: a full tab (slice 152×40) at x0 + 136 i, a compact tab (slice 72×40) at its place in the run. The name plate is a 9-slice delivered at every 16 px from 80 to 224 wide, 24 tall. Hashes and sources: [`slices/manifest.json`](slices/manifest.json)."]
for g, items in G.items():
    out.append(f"\n### {g}\n\n| Slice id | Size | Rect on the screen | Made by |\n| --- | --- | --- | --- |")
    for n, v in items: out.append(f"| `{n}` | {v['size'][0]}×{v['size'][1]} | {rect(v)} | {v['made']} |")
a = r.index("## Slices"); b = r.index("<!-- end of the generated Slices section -->")
open("README.md", "w").write(r[:a] + "\n".join(out) + "\n\n" + r[b:])

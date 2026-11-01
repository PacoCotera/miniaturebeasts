"""Render the rest cage at the master's 3/4 camera and lay it beside the master at 304, 96 and 48. Run under the bpy venv: python compare.py OUTDIR [tag]"""
import sys, os, math
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build, views, sheetlib as SL
MASTER = "/home/mb/mb/mp/art/station-masters/pods/adult/mibi-adult-S01-%s.png"

def render_pair(b, OUT, tag="cmp", az=57.5, el=14.0, centre=(-0.45, 0, 1.15)):
    views.render_views(b, OUT, views=[(tag, az, el)], width=304, height=312, centre=centre, samples=48, wire=False)

if __name__ == "__main__":
    OUT = os.path.abspath(sys.argv[1]); os.makedirs(OUT, exist_ok=True)
    b = build.make_body(upto="base")
    render_pair(b, OUT)
    print("ok")

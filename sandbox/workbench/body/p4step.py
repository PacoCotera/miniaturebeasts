"""Pass 4 step pictures: individual 1 (or any) in the plush coat and in clay from the angles a step names, into PASS4/<step>/<tag>/; a before/after page built from two tags. Under the bpy venv:
python p4step.py render TAG [STEP] [IND] [AZS], python p4step.py page STEP TITLE TEXT [AZS]."""
import os, sys, time, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import s20indiv as IN, s20p3 as P3, s20p2 as P2, s20pipe as PP, s20tex as TX, s20render as RN, sheetlib as SL

PASS4 = "/home/mb/mb/iwq/results/T-20261101-mesh/newspecies/build/pass4"
W, H, PPH, CEN = 330, 400, 128.0, (-0.28, 0.0, 1.1)


def render(tag, step, ind=1, azs=(0, 32, 90, 180), coat=True, clay=True, samples=48, el=6.0):
    sub = os.path.join(PASS4, step, tag)
    os.makedirs(sub, exist_ok=True)
    c, b, R = IN.make(ind)
    if coat:
        tex = PP.make_tex(b, c["coat"], frames=("open",))
        paths = P2.write_tex(tex, os.path.join(sub, "tex"))
        M = P2.posed(TX.render_mesh(b), b, R, R.stand_pose())
    for az in azs:
        if coat:
            p = os.path.join(sub, f"coat-{az}.png")
            a, cam = RN.render_tex(M, paths, c["coat"], p, W, H, PPH, az=float(az), el=el, centre=CEN, samples=samples)
            RN.to_png(a, p)
        if clay:
            P3.clay_side(b, R, os.path.join(sub, f"clay-{az}.png"), az=float(az), el=el, centre=CEN, w=W, h=H, pph=PPH, spine=False, samples=24)
    shutil.rmtree(os.path.join(sub, "tex"), ignore_errors=True)
    return b, c, R


def page(step, title, text, azs=(0, 32, 90, 180), tags=("before", "after"), kinds=("coat", "clay"), extra_html="", name=None):
    body = f"<h1>{title}</h1>" + text
    for kind in kinds:
        body += f"<h2>{kind.capitalize()}</h2>"
        for tg in tags:
            body += f"<div class='grid' style='grid-template-columns:repeat({len(azs)},{W}px)'>" + "".join(f"<div class='cell'><img src='{step}/{tg}/{kind}-{a}.png' width='{W}'><div class='cap'>{tg}, az {a}</div></div>" for a in azs) + "</div><div style='height:6px'></div>"
    body += extra_html
    nm = name or step
    open(os.path.join(PASS4, nm + ".html"), "w").write(SL.page(nm, body))
    SL.shoot(os.path.join(PASS4, nm + ".html"), os.path.join(PASS4, nm + ".png"), len(azs) * (W + 10) + 40)


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "render":
        t = time.time()
        render(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "scratch", int(sys.argv[4]) if len(sys.argv) > 4 else 1)
        print("rendered", round(time.time() - t))

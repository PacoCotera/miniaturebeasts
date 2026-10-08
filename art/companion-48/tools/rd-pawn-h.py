"""The pawn from study H (the owner's pick) through Retro Diffusion: img2img from H's own frames, one seed (48), one prompt with only the facing words and the
pose words changing. H's down frame (the passing pose) and right frame (the contact pose) are the originals; every other frame is a call: for the down and right
facings from H's frame, for the up facing from its own first frame (a call from H's down frame with 'seen from behind'). The left facing is the right mirrored.
usage: python3 -I rd-pawn-h.py OUT_DIR phase1|phase2|only TAG... [--strength S] [--run]
  phase1: the up facing's passing frame; phase2: every other frame."""
import os, subprocess, sys
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); out = sys.argv[1]; mode = sys.argv[2]; run = "--run" in sys.argv
strength = float(sys.argv[sys.argv.index("--strength") + 1]) if "--strength" in sys.argv else 0.45
BASE = ("a small explorer in an orange hooded parka, a backpack, dark trousers, brown boots, pixel art sprite on a plain white background, "
        "the face in shadow inside the hood showing only two eyes and a nose, no goggles, a thin fur collar at the neck, not too much face")
FACING = {"down": "seen from the front", "right": "seen from the right side in profile, the face inside the hood", "up": "seen from behind, facing away, the back of the hood and the backpack"}
POSE = {"walk1": "mid-stride, the left foot forward", "walk2": "standing, the feet together", "walk3": "mid-stride, the right foot forward",
        "creep1": "crouching low, creeping forward, the left foot forward", "creep2": "crouching low, the knees bent", "creep3": "crouching low, creeping forward, the right foot forward",
        "react": "startled, both arms raised, a small jump"}
def inp(facing, state):
    if facing == "up": return os.path.join(out, "inputs", "up-walk2-in.png") if state != "walk2" else os.path.join(out, "inputs", "H-down-in.png")
    return os.path.join(out, "inputs", f"H-{facing}-in.png")
calls = []
if mode == "phase1": calls = [("up", "walk2")]
elif mode == "phase2":
    calls = [("down", s) for s in POSE if s != "walk2"] + [("right", s) for s in POSE if s != "walk1"] + [("up", s) for s in POSE if s != "walk2"]
else: calls = [tuple(t.split("-")) for t in sys.argv[3:] if "-" in t and not t.startswith("--")]
for facing, state in calls:
    if facing == "up" and state != "walk2":
        src = os.path.join(out, "C48-W-r9-up-walk2-rd.png"); p = os.path.join(out, "inputs", "up-walk2-in.png")
        im = Image.open(src).convert("RGBA"); bg = Image.new("RGBA", im.size, (255, 255, 255, 255)); bg.alpha_composite(im); bg.convert("RGB").resize((192, 192), Image.NEAREST).save(p)
    st = strength + (0.15 if (facing == "up" and state == "walk2") else 0.0)
    prompt = f"{BASE}, {FACING[facing]}, {POSE[state]}"
    cmd = [sys.executable, "-I", os.path.join(HERE, "rd-gen.py"), f"C48-W-r9-{facing}-{state}", out, "48", "48", prompt, "--input", inp(facing, state), "--strength", str(st), "--remove-bg", "--seed", "48"] + (["--run"] if run else [])
    r = subprocess.run(cmd, capture_output=True, text=True); print(facing, state, (r.stdout.strip().splitlines() or [r.stderr[-200:]])[-1][:100], flush=True)

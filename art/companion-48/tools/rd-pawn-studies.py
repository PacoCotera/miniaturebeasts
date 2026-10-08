"""Pawn studies G and H through Retro Diffusion: the round 6 down walk and right walk frames (on white, 4x) as img2img at 48 px with the owner's words in
the prompt. G: a small face deep in the hood, goggles on the brow on a thin strap. H: the face in shadow with only eyes and nose lit, no goggles, a collar.
usage: python3 -I rd-pawn-studies.py OUT_DIR [--run]"""
import os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); out = sys.argv[1]; run = "--run" in sys.argv
COMMON = "a small explorer in an orange hooded parka, a backpack, dark trousers, brown boots, pixel art sprite on a plain white background"
P = {"G": ("with a small face deep inside the hood, a thin ring of fur, goggles resting on the brow on a thin strap, not too much face", 0.5),
     "H": ("the face in shadow inside the hood showing only two eyes and a nose, no goggles, a thin fur collar at the neck, not too much face", 0.55)}
for k, (words, strength) in P.items():
    for view in ("down", "side"):
        pr = f"{COMMON}, {words}, " + ("seen from the front" if view == "down" else "seen from the right side in profile, the face inside the hood")
        cmd = [sys.executable, "-I", os.path.join(HERE, "rd-gen.py"), f"C48-W-r7-{k}-{view}", out, "48", "48", pr, "--input", os.path.join(out, "inputs", f"pawn-{view}-r6-in.png"), "--strength", str(strength), "--remove-bg"] + (["--run"] if run else [])
        r = subprocess.run(cmd, capture_output=True, text=True); print(k, view, (r.stdout.strip().splitlines() or [r.stderr[-200:]])[-1][:100])

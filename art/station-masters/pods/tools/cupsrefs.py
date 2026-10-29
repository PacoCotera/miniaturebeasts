"""The reference pictures for the remaining Pods screen paintings (the lantern and fern overlays, the put-away jar, the bred-true seal;
ad-signoff.md sections 2.8, 1.5 and 3.2), project-owned crops of the signed pass 142 masters, so the new pieces share their brass, wood and light.
usage: python3 -I tools/cupsrefs.py   (writes source/work/masters-pods-cups/ref-*.jpg)"""
import os
from PIL import Image
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); W = f"{R}/source/work/masters-pods-cups"; os.makedirs(W, exist_ok=True)
os.makedirs(f"{R}/source/raw/masters-pods-cups", exist_ok=True)
k = 5243 / 1024
bench = Image.open(f"{R}/shelf/reading-bench-5243x3072.png").convert("RGB")
bench.crop((round(20 * k), 0, round(300 * k), round(300 * k))).resize((1120, 1200), Image.LANCZOS).save(f"{W}/ref-brass-lamp.jpg", quality=92)   # the signed bench's brass lamp
strip = Image.open(f"{R}/shelf/cabinet-strip-4704x1596.png").convert("RGB")
cab = Image.new("RGB", (strip.width, strip.height * 2)); cab.paste(strip, (0, 0)); cab.paste(strip, (0, strip.height))
cab.crop((0, 0, 2400, 3192)).resize((1200, 1596), Image.LANCZOS).save(f"{W}/ref-cabinet.jpg", quality=92)       # two periods of the signed cabinet, the warm left
pod = Image.open(f"{R}/shelf/pods/pod-shelf-sealed-1328x1577.png").convert("RGBA")                                         # the seal's pressed mark: our pod's silhouette
bg = Image.new("RGBA", pod.size, (150, 150, 150, 255)); bg.alpha_composite(pod); bg.convert("RGB").resize((664, 788)).save(f"{W}/ref-pod-sealed.jpg", quality=92)
print("refs written")

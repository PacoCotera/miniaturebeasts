"""Proofs at 1x of the Bay's signed pieces on the landing (ux-bay.md section 3 rects; the art director's sign-off ad-bay-closeup.md section 1), with code
stand-ins for what the build draws (the ledger and label paper, their 1 px umber edge and 4 px soft shadow, the contact shadows, the slate plates, the
focus ring), typed in Inter. Proofs, not deliverables. usage: python3 -I tools/bayproof.py   Writes bay/proof-*.png."""
import os, json
from PIL import Image, ImageDraw, ImageFilter, ImageFont
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); B = f"{R}/bay"
cuts = json.load(open(f"{B}/bay-cuts.json"))
P = lambda n: Image.open(f"{B}/{n}.png").convert("RGBA")
FONT = "/usr/share/fonts/opentype/inter/Inter-%s.otf"
def font(w, s): return ImageFont.truetype(FONT % w, s)
UMBER, CREAM, SLATE, BONE, FOG, RING = (74, 52, 38), (236, 226, 204), (44, 56, 66), (232, 226, 212), (150, 156, 160), (240, 228, 196)

def shadow(c, box, blur=4, off=(2, 3), a=90):
    m = Image.new("L", c.size, 0); ImageDraw.Draw(m).rectangle([box[0] + off[0], box[1] + off[1], box[2] + off[0], box[3] + off[1]], fill=a)
    m = m.filter(ImageFilter.GaussianBlur(blur)); d = Image.new("RGBA", c.size, (30, 20, 14, 255)); d.putalpha(m); c.alpha_composite(d)
def contact(c, x, y, w, h=8, a=110):
    m = Image.new("L", c.size, 0); ImageDraw.Draw(m).ellipse([x, y, x + w, y + h], fill=a); m = m.filter(ImageFilter.GaussianBlur(3))
    d = Image.new("RGBA", c.size, (30, 20, 14, 255)); d.putalpha(m); c.alpha_composite(d)
def paper(c, box, sh=True):
    if sh: shadow(c, box)
    ImageDraw.Draw(c).rectangle(box, fill=CREAM, outline=UMBER)
def text(c, xy, s, size, w="Regular", fill=UMBER):
    ImageDraw.Draw(c).text(xy, s, font=font(w, size), fill=fill)

def screen(slots, ledger, ribbon=None, cradle=True, ring=0, name="proof"):
    c = Image.new("RGBA", (1024, 600), (29, 35, 43, 255)); c.alpha_composite(P("bay-landing-1024x522"), (0, 40))
    d = ImageDraw.Draw(c); text(c, (16, 10), "Bay", 18, "Medium", BONE); text(c, (16, 572), "✓ Open this crate", 15, "Medium", (240, 150, 70)); text(c, (920, 572), "← Home", 15, "Medium", FOG)
    if cradle: c.alpha_composite(P("bay-cradle-96x72"), (479, 150))
    for k, s in enumerate(slots):
        ox = 24 + 168 * k
        if s is None: continue
        kind, walk, state, tag = s
        if kind in ("shut", "open"):
            contact(c, ox + 8, 396, 136)
            if kind == "shut":
                c.alpha_composite(P("bay-crate-shut-144x112"), (ox + 4, 288))
                c.alpha_composite(P(f"bay-tag-{tag}-28x40"), (ox + 91, 327))
            else:
                c.alpha_composite(P("bay-crate-open-156x128"), (ox + 4, 272))
                for i, kd in enumerate(("identified", "sealed")):
                    c.alpha_composite(P(f"straw/pod-straw-{kd}-40x48"), (ox + 24 + 44 * i, 272))                    # the straw rect [+20, +32, 112, 48]: feet at +80, sunk in the straw (surface +68)
                paper(c, [ox + 112, 296, ox + 140, 316], sh=False); text(c, (ox + 116, 298), "+2", 15, "Medium")
                c.alpha_composite(P(f"bay-tag-{tag}-28x40"), (ox + 91, 327))
        elif kind == "parcel":
            contact(c, ox + 16, 396, 120); c.alpha_composite(P("bay-parcel-128x104"), (ox + 12, 296))
        elif kind == "frame":
            contact(c, ox + 16, 396, 120)
            por = Image.new("RGBA", (128, 104), (0, 0, 0, 0))                                          # a stand-in portrait, clipped by the opening mask
            fill = Image.new("RGBA", (128, 104), (120, 150, 110, 255)); ImageDraw.Draw(fill).ellipse([44, 40, 84, 80], fill=(196, 160, 110, 255))
            m = P("bay-frame-opening-128x104").split()[3]; por.paste(fill, (0, 0), m); c.alpha_composite(por, (ox + 12, 296)); c.alpha_composite(P("bay-frame-128x104"), (ox + 12, 296))
        if k < 5:
            paper(c, [ox, 412, ox + 151, 455]); text(c, (ox + 8, 415), walk, 16, "Medium"); text(c, (ox + 8, 435), state, 15)
        if k == ring: ImageDraw.Draw(c).rounded_rectangle([ox - 4, 284, ox + 155, 459], 6, outline=RING, width=2)
    if ribbon: paper(c, [216, 64, 615, 103]); text(c, (232, 74), ribbon, 16, "Medium")
    paper(c, [720, 56, 1007, 545])
    y = 68
    for size, w, s in ledger:
        if s == "BUTTONS":
            for i, b in enumerate(("Open this crate", "Open all · 3", "See the new pods · 2")):
                bx = [736, 420 + 44 * i, 991, 455 + 44 * i]; d.rounded_rectangle(bx, 4, fill=SLATE, outline=(90, 104, 116)); text(c, (bx[0] + 12, bx[1] + 8), b, 16, "Medium", BONE)
            continue
        text(c, (736, y), s, size, w, UMBER if w != "fog" else (120, 110, 100)); y += size + 14
    c.convert("RGB").save(f"{B}/{name}.png"); return c

T = [("shut", "Pond walk", "sealed · turn 18", "slate-blue"), ("open", "Meadow walk", "opened · 2 pods", "reed"), ("shut", "Rock walk", "sealed · turn 19", "charcoal"),
     ("parcel", "Fig's portrait", "turn 22", None), ("shut", "Wood walk", "sealed", "moss")]
screen(T, [(20, "Medium", "4 crates · 1 portrait"), (18, "Medium", "Meadow walk"), (16, "Regular", "A meadow walked to its far hedge"), (15, "Regular", "explored 5 of 20 · home turn 18"),
           (16, "Regular", "Energy +3"), (16, "Regular", "Data +3"), (16, "Regular", "Essence +4"), (16, "Regular", "2 pods · Untuva new"), (0, "", "BUTTONS")], ring=1, name="proof-bay-many-1x")
screen([("shut", "Cave walk", "sealed · turn 20", "rust-brown"), ("frame", "Fig's portrait", "turn 22", None), None, None, None],
       [(20, "Medium", "1 crate · 1 portrait"), (18, "Medium", "Fig's portrait"), (16, "Regular", "Unwrapped · see it whole")], ribbon="The Companion is home", ring=1, name="proof-bay-portrait-1x")
screen([None] * 5, [(20, "Medium", "No crates"), (16, "Regular", "The next walk brings some")], cradle=False, ring=-1, name="proof-bay-empty-away-1x")
# a 3x detail of the crates and tags as reduced (for the edges), and the sheet of pieces on cream paper and on slate
sheet = Image.new("RGBA", (1024, 360), CREAM + (255,)); ImageDraw.Draw(sheet).rectangle([0, 180, 1023, 359], fill=SLATE + (255,))
x = 12
for n in ("bay-crate-shut-144x112", "bay-crate-shut-lid-144x112", "bay-crate-shut-body-144x112", "bay-crate-open-156x128", "bay-parcel-128x104", "bay-frame-128x104", "bay-cradle-96x72"):
    im = P(n); sheet.alpha_composite(im, (x, 170 - im.height)); sheet.alpha_composite(im, (x, 350 - im.height)); x += im.width + 8
sheet.convert("RGB").save(f"{B}/proof-bay-pieces-1x.png")
st = Image.new("RGBA", (420, 140), CREAM + (255,)); ImageDraw.Draw(st).rectangle([0, 70, 419, 139], fill=SLATE + (255,))
for i, t in enumerate(("moss", "reed", "slate-blue", "rust-brown", "charcoal")):
    st.alpha_composite(P(f"bay-tag-{t}-28x40"), (16 + 40 * i, 16)); st.alpha_composite(P(f"bay-tag-{t}-28x40"), (16 + 40 * i, 86))
st.alpha_composite(P("bay-home-tile-96x72"), (232, 0))
ks = sorted(n for n in os.listdir(f"{B}/straw") if n.endswith("-40x48.png"))
pods = Image.new("RGBA", (16 + 44 * len(ks), 64), (210, 180, 120, 255))
for i, n in enumerate(ks): pods.alpha_composite(Image.open(f"{B}/straw/{n}").convert("RGBA"), (8 + 44 * i, 8))
st.convert("RGB").save(f"{B}/proof-bay-tags-tile-1x.png"); pods.convert("RGB").save(f"{B}/proof-bay-straw-pods-1x.png")
print("proofs written")

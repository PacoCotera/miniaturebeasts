#!/usr/bin/env python3
"""The prompt lab (the owner's direction of 2026-10-08): iterate the prompt on one reference individual per
species, one change at a time, and only run the full set once a variant looks right. The reference
individual is the species' type specimen under the cute envelope; every variant runs the two-step
recipe (step 1 the HiBit drawing from the crisp key and index passes, step 2 the treatment transfer
with the species reference) against the same controls and reference, two calls, about $0.20 a try.
Both steps always run (the owner judges by eye); the checks are logged beside each, not gated.

  python3 grow/lab.py --species S09                      # every variant (paid)
  python3 grow/lab.py --species S09 --variants v1,v4     # some
  python3 grow/lab.py --species S09 --models pro         # one model only (both by default: Flash and Pro, side by side on the sheet)
  python3 grow/lab.py --sheet                            # the sheets only, from what is on disk

Three fields, worked separately, each variant one change from the baseline (v0 = prompt v4 as run):
  artDirection   the fixed block; v7 is the owner's craft block (limbs never boxes or undeveloped 3D
                 artefacts; the surface named per species; eyes large, wet and lit; posture natural and
                 weight on the feet; light from the top left; the Miniature Lives finish)
  species        the species sheet (grow/species-sheets/<species>.json): material and signature words, the reference
  description    the genome's looks, colours, markings, proportions and posture in plain words (describe.mjs)
Outputs under grow/lab/<species>/<variant>/ (step1.png, step2.png, prompt.json with the fields and the
diff against the baseline); every call in prompts.json with lab: {species, variant}; the sheet
grow/sheets/lab-<species>.png with the variant's changed text beside each.
"""
import json, os, sys, textwrap
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import service as S

LAB = os.path.join(HERE, "lab")
SHEETS = os.path.join(HERE, "species-sheets")
PROMPT_SET = os.path.join(HERE, "prompt-lab")
MODELS = {"flash": "gemini-3.1-flash-image", "pro": "gemini-3-pro-image"}  # every variant runs on both (the owner: if Flash is not up to it, go Pro; the cute-pet bar comes before cost)  # the art prompter's prompt set, when it lands on main (see README: "The prompt lab")

CRAFT = ("Craft rules. Limbs, feet and joints are developed, rounded, finished forms: never boxes, never bare cylinders, never undeveloped 3D artefacts, never facets or flat planes. "
         "Put special care in the surface and make it read as its named material. The eyes are large, wet and lit: a dark iris with a bright catch light top left, the ring clean. "
         "The posture is natural, the weight on the feet, the body settled, the creature alive and looking at the viewer. One light from the top left. The Miniature Lives finish: sculpted, rounded, tactile, soft materials, saturated playful colour, three or four value masses, restrained highlights.")
ANTI = "Every limb, foot, joint and crest is a developed, rounded, finished form: no boxes, no bare cylinders, no facets, no flat planes, no undeveloped 3D artefacts anywhere on the creature."
POSTURE = "The posture is natural: the weight rests on the feet, the legs bear the body, the body settles between them, nothing floats or stiffens; the creature is alive and looking at the viewer."
EYES = "The eyes are large, wet and lit: a dark iris, a bright catch light top left, a second small glint, a clean pale ring; the eyes read first."
NEGATIVE = "Not: text, labels, extra limbs or eyes, facets, blocky joints, bare cylinders, glass wings, dull brown or grey, a floating or stiff pose, a scene, a ground plane, a border."

VARIANTS = [
    {"id": "v0", "name": "baseline (prompt v4 as run)", "change": ""},
    {"id": "v1", "name": "surface words from the species sheet", "change": "species"},
    {"id": "v2", "name": "anti-artefact words", "change": "anti"},
    {"id": "v3", "name": "posture words", "change": "posture"},
    {"id": "v4", "name": "eye words", "change": "eyes"},
    {"id": "v5", "name": "a negative list", "change": "negative"},
    {"id": "v6", "name": "field order: description first, controls, then the direction", "change": "order"},
    {"id": "v7", "name": "the owner's craft block as the art direction, with the species surface named", "change": "craft"},
]


def species_sheet(sp):
    return json.load(open(os.path.join(SHEETS, f"{sp}.json")))


def prompt_set():
    """The art prompter's prompt set under grow/prompt-lab/, or None: variants.json (a list of
    {id, name, change, step1?, step2?}: a variant's step1/step2 texts, with {controls}, {description},
    {species}, {artDirection1}, {artDirection2}, {generate}, {transfer} as placeholders, are used as
    written; without them the lab assembles the steps from the set's blocks), art-direction-step1.txt
    and art-direction-step2.txt (the v5 blocks), species/<species>.txt (the material words),
    description-template.txt (with {description} for the genome's words). Any file missing falls back
    to the lab's own."""
    if not os.path.exists(os.path.join(PROMPT_SET, "variants.json")): return None
    read = lambda *p: open(os.path.join(PROMPT_SET, *p)).read().strip() if os.path.exists(os.path.join(PROMPT_SET, *p)) else None
    return {"variants": json.load(open(os.path.join(PROMPT_SET, "variants.json"))), "art1": read("art-direction-step1.txt"), "art2": read("art-direction-step2.txt"), "template": read("description-template.txt"), "species": lambda sp: read("species", f"{sp}.txt")}


def build_from_set(sp, legend, sheet, variant, pset):
    """A variant of the art prompter's set, its texts used as written."""
    controls = S.controls_text_two_step(legend, "portrait")
    description = (pset["template"] or "The creature: {description}").replace("{description}", legend["description"]["text"])
    species_words = pset["species"](sp) or f"The species: {sheet['signature']}. {sheet['surfaceWords']}"
    fields = {"controls": controls, "description": description, "species": species_words, "artDirection1": pset["art1"] or "", "artDirection2": pset["art2"] or S.ART_DIRECTION, "generate": S.STEP1_WORDS, "transfer": S.STEP2_WORDS}
    fill = lambda t: t.format(**fields) if t else None
    step1 = fill(variant.get("step1")) or "\n\n".join(x for x in [fields["artDirection1"], controls, description, species_words, fields["generate"]] if x)
    step2 = fill(variant.get("step2")) or "\n\n".join(x for x in [fields["artDirection2"], species_words, fields["transfer"]] if x)
    changed = variant.get("change") or variant.get("name", "")
    return {"step1": step1, "step2": step2, "fields": {**fields, "variant": {k: v for k, v in variant.items() if k not in ("step1", "step2")}}, "changed": changed}


def reference_for(sp, sheet):
    path = os.path.join(S.REPO, sheet["reference"]) if not sheet["reference"].startswith("grow/") else os.path.join(S.REPO, "prototypes/workbench", sheet["reference"])
    return {"what": sheet["referenceWhat"], "name": os.path.basename(path), "png": S.png_bytes(S.flat_rgb(path) if path.endswith("300x310.png") else Image.open(path).convert("RGB")), "ownKind": sp == "S01" or sheet["reference"].startswith("grow/species")}


def build_prompts(sp, legend, sheet, variant):
    """The step 1 and step 2 texts for a variant, and the fields that produced them."""
    ch = variant["change"]
    controls = S.controls_text_two_step(legend, "portrait")
    description = legend["description"]["text"]
    species_words = f"The species: {sheet['signature']}. {sheet['surfaceWords']}" if ch in ("species", "craft") else ""
    art = CRAFT + (" " + sheet["surfaceWords"] if ch == "craft" else "") if ch == "craft" else S.ART_DIRECTION
    extra1 = {"anti": ANTI, "posture": POSTURE, "eyes": EYES, "negative": NEGATIVE}.get(ch, "")
    step1_parts = {"controls": controls, "description": "The creature: " + description, "species": species_words, "extra": extra1, "generate": S.STEP1_WORDS}
    order1 = ["description", "controls", "species", "extra", "generate"] if ch == "order" else ["controls", "description", "species", "extra", "generate"]
    step1 = "\n\n".join(step1_parts[k] for k in order1 if step1_parts[k])
    step2_parts = {"artDirection": art, "species": species_words, "extra": extra1, "transfer": S.STEP2_WORDS}
    order2 = ["transfer", "species", "extra", "artDirection"] if ch == "order" else ["artDirection", "species", "extra", "transfer"]
    step2 = "\n\n".join(step2_parts[k] for k in order2 if step2_parts[k])
    changed = {"species": species_words, "anti": ANTI, "posture": POSTURE, "eyes": EYES, "negative": NEGATIVE, "order": "step 1: " + " > ".join(order1) + "; step 2: " + " > ".join(order2), "craft": art}.get(ch, "(none: the baseline)")
    return {"step1": step1, "step2": step2, "fields": {"artDirection": art, "species": species_words, "description": description, "extra": extra1, "order1": order1, "order2": order2}, "changed": changed}


def run(sp, variant_ids, opt_models=None):
    idx = json.load(open(os.path.join(S.REF, sp, "index.json")))
    d0 = S.prepare(sp, os.path.join(S.REF, sp, idx["members"][0]["dir"], "genome.json"))["dir"]
    legend = json.load(open(os.path.join(d0, "controls", "legend.json")))
    sheet = species_sheet(sp); reference = reference_for(sp, sheet)
    ctrl = {p: os.path.join(d0, "controls", f"{p}.portrait.large.png") for p in ("silhouette", "index", "slots")}
    c = os.path.join(d0, "controls")
    pset = prompt_set()
    variants = pset["variants"] if pset else VARIANTS
    if pset: print("the art prompter's prompt set:", len(variants), "variants")
    only_models = [m for m in MODELS if m in (opt_models or MODELS)]
    for v in variants:
      if variant_ids and v["id"] not in variant_ids: continue
      pr = build_from_set(sp, legend, sheet, v, pset) if pset else build_prompts(sp, legend, sheet, v)
      for mkey in only_models:
        model = MODELS[mkey]
        out = os.path.join(LAB, sp, v["id"], mkey); os.makedirs(out, exist_ok=True)
        if os.path.exists(os.path.join(out, "prompt.json")) and "--force" not in sys.argv: print(sp, v["id"], mkey, "done already"); continue
        common = {"lab": {"species": sp, "variant": v["id"], "name": v["name"], "model": mkey}, "controlVariant": "twostep", "species": sp, "genomeDigest": legend["genomeDigest"], "genomeSha256": legend["genomeSha256"]}
        key_png = S.png_bytes(S.pad_square(Image.open(os.path.join(c, "key.portrait.large.png")).convert("RGB"))); index_png = S.png_bytes(S.pad_square(Image.open(os.path.join(c, "index.portrait.large.png")).convert("RGB")))
        # the images of step 1: the key then the part map (the lab's own text names them so), or the part map
        # first and the key second when the variant says images: "index-key" (the lead's suggestion, so the
        # painter sees the belly field as the only pale area last)
        imgs = ([("index.portrait.large.png", index_png), ("key.portrait.large.png", key_png)] if v.get("images") == "index-key" else [("key.portrait.large.png", key_png), ("index.portrait.large.png", index_png)]) + [("board:02-miniature-lives.png", S.png_bytes(Image.open(S.BOARD).convert("RGB")))]
        rec1, im1 = S.call_logged(pr["step1"], imgs, {**common, "purpose": "lab-step1", "step": 1, "attempt": 1, "fields": pr["fields"]}, os.path.join(out, "raw"), "step1.png", model)
        result = {"species": sp, "variant": v, "model": model, "fields": pr["fields"], "changed": pr["changed"], "step1": {"callId": rec1["id"], "status": rec1["status"], "costUSD": rec1.get("costUSD"), "seconds": rec1.get("seconds")}}
        if im1 is not None:
            rec1["checks"] = {**S.check(im1, ctrl, legend, S.DRAWING_TOL), "gated": False}; result["step1"]["checks"] = rec1["checks"]
            im1.save(os.path.join(out, "step1.png")); S.fit_to_control(im1, os.path.join(d0, "controls", "silhouette.portrait.station.png"), (300, 310)).save(os.path.join(out, "step1-300x310.png"))
        S.log_call(rec1)
        print(sp, v["id"], mkey, "step 1", rec1["status"], f"${rec1.get('costUSD', 0) or 0:.3f}", flush=True)
        if im1 is not None:
            imgs2 = [("step1.png", S.png_bytes(S.pad_square(im1))), (f"reference:{reference['name']}", reference["png"])]
            rec2, im2 = S.call_logged(pr["step2"], imgs2, {**common, "purpose": "lab-step2", "step": 2, "attempt": 1, "fields": pr["fields"], "referenceImage": {"what": reference["what"], "name": reference["name"], "sha256": S.sha_bytes(reference["png"])}}, os.path.join(out, "raw"), "step2.png", model)
            result["step2"] = {"callId": rec2["id"], "status": rec2["status"], "costUSD": rec2.get("costUSD"), "seconds": rec2.get("seconds")}
            if im2 is not None:
                rec2["checks"] = {**S.check(im2, ctrl, legend), "gated": False}; result["step2"]["checks"] = rec2["checks"]
                im2.save(os.path.join(out, "step2.png")); S.fit_to_control(im2, os.path.join(d0, "controls", "silhouette.portrait.station.png"), (300, 310)).save(os.path.join(out, "step2-300x310.png"))
            S.log_call(rec2)
            print(sp, v["id"], mkey, "step 2", rec2["status"], f"${rec2.get('costUSD', 0) or 0:.3f}", flush=True)
        result["costUSD"] = round((result["step1"].get("costUSD") or 0) + (result.get("step2", {}).get("costUSD") or 0), 4)
        json.dump(result, open(os.path.join(out, "prompt.json"), "w"), indent=1)
    sheet_for(sp, d0)


def sheet_for(sp, d0=None):
    pset = prompt_set(); rows = []
    for v in (pset["variants"] if pset else VARIANTS):
        per = {}
        for mkey in MODELS:
            p = os.path.join(LAB, sp, v["id"], mkey, "prompt.json")
            if os.path.exists(p): per[mkey] = (json.load(open(p)), os.path.join(LAB, sp, v["id"], mkey))
        if per: rows.append((v, per))
    if not rows: return
    if d0 is None:
        idx = json.load(open(os.path.join(S.REF, sp, "index.json"))); d0 = S.prepare(sp, os.path.join(S.REF, sp, idx["members"][0]["dir"], "genome.json"))["dir"]
    gap = 12; rowh = 310 + 16; ink = (40, 40, 50); textw = 560
    cols = ["control: shaded pass (crisp key and index sent)", "Flash: step 1 drawing", "Flash: step 2 painting", "Pro: step 1 drawing", "Pro: step 2 painting"]
    W = gap + len(cols) * (300 + gap) + textw + gap; H = 60 + len(rows) * rowh
    sheet = Image.new("RGB", (W, H), (255, 255, 255)); d = ImageDraw.Draw(sheet)
    name = species_sheet(sp)["name"]
    total = {mkey: sum(per[mkey][0]["costUSD"] for _, per in rows if mkey in per) for mkey in MODELS}
    d.text((gap, 8), f"{sp} {name}: the prompt lab on the type specimen under the cute envelope. One change per variant against the same controls and reference; two calls each (step 1 the HiBit drawing, step 2 the treatment) on {MODELS['flash']} and {MODELS['pro']}; {len(rows)} variants; Flash ${total['flash']:.2f}, Pro ${total['pro']:.2f}. Checks logged, not gated.", fill=ink)
    for i, t in enumerate(cols + ["the variant and the text it changes; cost per try"]): d.text((gap + i * 312, 28), t, fill=ink)
    for r, (v, per) in enumerate(rows):
        y = 44 + r * rowh; x = gap
        ctl = os.path.join(d0, "controls", "shaded.portrait.station.png")
        if os.path.exists(ctl): sheet.paste(Image.open(ctl).convert("RGB"), (x, y))
        x += 300 + gap
        for mkey in MODELS:
            for f in ("step1-300x310.png", "step2-300x310.png"):
                if mkey in per:
                    p = os.path.join(per[mkey][1], f)
                    if os.path.exists(p): sheet.paste(Image.open(p).convert("RGB"), (x, y))
                else: d.text((x + 100, y + 150), "not run", fill=(150, 150, 160))
                x += 300 + gap
        any_res = next(iter(per.values()))[0]
        d.text((x, y), f"{v['id']}  {v['name']}", fill=ink)
        for j, mkey in enumerate(MODELS):
            if mkey not in per: continue
            res = per[mkey][0]; c1 = res["step1"].get("checks") or {}; c2 = res.get("step2", {}).get("checks") or {}
            d.text((x, y + 14 + 13 * j), f"{mkey}: ${res['costUSD']:.3f} a try | step 1 outside {c1.get('outside', '-')}, parts min {min(p['span'] for p in c1['parts'].values()) if c1.get('parts') else '-'}, slots {c1.get('slotAgreement', '-')} ({'would pass' if c1.get('passed') else 'would fail'}); step 2 slots {c2.get('slotAgreement', '-')} ({'would pass' if c2.get('passed') else 'would fail'})", fill=(90, 90, 100))
        lines = textwrap.wrap(any_res["changed"], 95)[:19]
        for j, line in enumerate(lines): d.text((x, y + 44 + 13 * j), line, fill=ink)
    os.makedirs(os.path.join(HERE, "sheets"), exist_ok=True)
    sheet.save(os.path.join(HERE, "sheets", f"lab-{sp}.png")); print("sheet", f"lab-{sp}.png", sheet.size)


if __name__ == "__main__":
    args = sys.argv[1:]
    opt = lambda k, d=None: args[args.index(k) + 1] if k in args and args.index(k) + 1 < len(args) else d
    sp = opt("--species")
    if "--sheet" in args:
        for s in ([sp] if sp else ["S01", "S09", "S12"]): sheet_for(s)
    else:
        if not sp: print(__doc__); sys.exit(2)
        run(sp, opt("--variants", "").split(",") if opt("--variants") else None, opt("--models", "").split(",") if opt("--models") else None)

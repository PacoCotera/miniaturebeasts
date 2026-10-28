"""Held habit keys for the species that have habits but no layered stand (S02 sniff, puff; S03 dig, glow), juvenile and adult (ad-curl, 2026-10-28).
The curl sheet's method (curljobs.py compose: the signed master in cell 1, cell 2 empty), with the habit in place of the curl; cut by curlcut.py POSE AREA 1.0
into habits/keys/mibi-<stage>-<sp>-<habit>-304x312.png. sleep-curled is the curl key (curl/keys). usage: python3 -I habitjobs.py OUT.json SUFFIX SXX-stage-habit ..."""
import sys, json, os
sys.path.append(os.path.dirname(os.path.abspath(__file__))); from curljobs import compose, REL, ROOT
suffix = sys.argv[2] if len(sys.argv) > 2 else "a"
HOW = {
 ("S02", "sniff"): "it leans forward with its face low and its nose almost touching the ground, sniffing, its cap tipped forward, its tail puff up behind; eyes open and curious",
 ("S02", "puff"): "it puffs out its soft fuzz so its round body swells rounder and fluffier, standing tall and proud, its cap lifted, eyes half closed with pleasure",
 ("S03", "dig"): "it digs: its front claws scraping at the ground, its head low and its haunches up; no earth, no clods, no dust are shown" if suffix != "a" else "it digs: its front claws scraping at the ground, its head low and its haunches up, a few small clods of earth flying back from its front paws",
 ("S03", "glow"): "it stands calm with its tail lifted and the small round bulb at the tail's tip lit from inside, glowing warm golden yellow like a firefly; only the bulb itself is bright: no halo disc, no ring, no rays, nothing pink or red" if suffix != "a" else "it stands calm with its tail lifted and the round bulb at the tail's tip glowing a warm soft gold light, a gentle halo of light around the bulb only",
}
def prompt(sp, stage, habit):
    return ("The image is a sheet of two cells on a flat #FF00FF magenta ground. Cell 1 (the left half) shows a creature, a finished painting. Keep cell 1 exactly as it is. "
            f"In cell 2 (the right half, now empty) paint the SAME creature doing this: {HOW[(sp, habit)]}. "
            "Exactly the same creature as cell 1: the same colours, the same markings, the same proportions, the same painting style, finish and light from the upper left, the same size, "
            "standing on the same ground line as cell 1's feet and facing the same way. No shadow, no ground, no props, no text, no outline: the creature alone on the flat #FF00FF magenta, "
            "with clear magenta all round it and nothing crossing the middle line between the cells.")
if __name__ == "__main__":
    out, suffix, keys = sys.argv[1], sys.argv[2], sys.argv[3:]; jobs = []
    for k in keys:
        sp, stage, habit = k.split("-", 2); path, r = compose(sp, stage)
        jobs.append({"name": f"habit-{sp}-{stage}-{habit}-{suffix}", "model": "gemini-3-pro-image", "aspect": "3:2", "size": "1K", "tries": 1,
                     "refs": [[path.replace(ROOT, REL), "Image 1: the sheet. Cell 1 holds the signed creature; cell 2 is empty."]], "prompt": prompt(sp, stage, habit)})
    json.dump(jobs, open(out, "w"), indent=1); print(len(jobs), "jobs")

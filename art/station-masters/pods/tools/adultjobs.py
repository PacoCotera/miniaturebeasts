"""Adult stand-ins, round 3 (ad-curl, 2026-10-28; the owner's "work as much as possible in completing the species art"): the S02/S03/S09/S13/S16 recipe
(rig + signed silhouette, the bare base described, matte children's-book finish on #FF00FF, one request at 1K 1:1) plus the signed juvenile as the third
reference for colours, face and finish, so the adult reads as the same species grown. Cut by adult/cut-adults.py (height = juvenile / 0.67, feet 305).
usage: python3 -I adultjobs.py OUT.json SUFFIX SXX ..."""
import sys, json
REL = "art/station-masters/pods"
D = {
 "S04": ("a slender grown cat-like animal with a long thin tail, a round head with two upright pointed ears, long legs", "a soft warm fawn-brown coat with a cream muzzle, chest and paws, large round dark glossy eyes with a pale highlight, a small pink nose"),
 "S05": ("a lean grown fox-like animal with big upright pointed ears, a narrow snout, long slim legs and a long bushy tail held out behind", "a bright orange-red coat with a cream-white chest, muzzle and tail tip, dark lower legs, large round dark glossy eyes with a pale highlight"),
 "S06": ("a stocky grown bear-like animal with a heavy body, a round head with small round ears, a short muzzle, thick legs and a short tail", "a dark slate grey-green coat with a slightly lighter muzzle, large round dark glossy eyes with a pale highlight, a dark nose"),
 "S07": ("a big grown bear with a broad heavy body, a round head with round ears, a short muzzle and thick pillar legs", "a warm mid-brown coat with a cream-beige muzzle and paws, round dark glossy eyes with a pale highlight, a dark nose"),
 "S08": ("a graceful grown deer with long slim legs, a slender neck, large ears and two tall straight pale antlers", "a warm tan-brown coat with a few soft cream spots on the back, a cream belly and throat, large round dark glossy eyes with a pale highlight"),
 "S10": ("a grown long-bodied pig-like animal with a long thin tail, short legs, a rounded snout and small upright ears", "a warm brown bristly coat with pink legs, a pink snout and pink ears, round dark glossy eyes with a pale highlight"),
 "S11": ("a grown tortoise with a large high domed shell, four thick legs, a short tail and a round head on a short neck", "a pale cream-beige shell with soft swirled plate patterns, green skin on the head and legs, cream underside, round dark glossy eyes with a pale highlight"),
 "S12": ("a grown ant-like insect with a three-part body, six slim jointed legs, two long antennae with round tips and two small clear wings folded flat along its back", "a bright orange body with cream-white bands and legs, large round dark glossy eyes with a pale highlight"),
 "S13": None,
 "S14": ("a grown long soft slug-like creature with a segmented ringed body lying low along the ground and two long thin antennae with round tips", "a soft lavender-lilac body with paler rings, large round dark glossy eyes with a pale highlight, a small calm mouth"),
 "S15": ("a grown round plant-like creature: a tall egg-shaped body on two thin legs, two leaf ears, a few short spikes on top and a round leafy tail puff", "a soft leaf green body with darker green speckles, large round dark glossy eyes with a pale highlight, a small calm mouth"),
}
def job(sp, suffix):
    plan, look = D[sp]
    return {"name": f"mibi-adult-{sp}-{suffix}", "model": "gemini-3-pro-image", "aspect": "1:1", "size": "1K", "tries": 1,
            "refs": [[f"{REL}/juvenile/guides/adult-rig-{sp}-304x312.png", f"Image 1: the adult of this species (project-owned rig render): its body plan and proportions only, a crude 3D blockout to be painted over: {plan}. Its blockout colours and geometry are not the creature's."],
                     [f"{REL}/slices/mibi-halo-{sp}-128x160-clear.png", "Image 2: the species' signed silhouette (project-owned): the adult's outline."],
                     [f"{REL}/juvenile/mibi-juvenile-{sp}-304x312.png", "Image 3: the species' signed earlier stage (project-owned painting): its colours, its face and the painting finish to match."]],
            "prompt": (f"Paint the ADULT of the creature in the references: {plan}. Its colours and face are Image 3's: {look}. "
                       "Keep Image 1's body plan and proportions, but NOT the blockout's geometry: soft, rounded, living forms. It is fully grown: longer legs, a smaller head for its body, a calmer face than Image 3, "
                       "and clearly the same species. This is the species' BARE BASE picture: no extra markings beyond those named. "
                       "Matte painterly rendering like a children's book, the same finish as Image 3, smooth painted forms, gentle shading, light from the top left, a soft flat contact shadow beneath it. "
                       "Three-quarter view facing right like Image 3, calm, standing at rest, all its feet on the ground. One creature, centred, large, on a plain flat solid magenta (#FF00FF) background with nothing else. "
                       "No outline glow, no text, no ground, no props, no people.")}
if __name__ == "__main__":
    out, suffix, sps = sys.argv[1], sys.argv[2], sys.argv[3:]
    json.dump([job(s, suffix) for s in sps], open(out, "w"), indent=1); print(len(sps), "jobs")

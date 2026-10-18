# The Incubator as one object: the art director's gate

## Round 1 (masters-pods 9beb2415, `concepts/incubator-object/`), from the first intent

The studio painted the first intent (brooder, bell jar, appliance); the revised one crossed in transit.

| | Verdict | Why |
| --- | --- | --- |
| **B, the bell jar** | **keep, with two fixes** | The best of the three. The pod is large and centred on a moss nest, under a clear bell on a soft bone base with legs, and closed and open match exactly. It reads as a precious object. Fixes: (1) remove the floor lamp at the right, a second light that competes with the pod; (2) the pod reads blue-grey (nearly ash), and must be the reference's charcoal |
| **A, the brooder** | **reserve** | The teal cushion base and the warm pool on fleece are appealing, and the camera is shared well. But the lamp hood is copper, which reads as brass. The pod is small, about a quarter of the object, and the open dome is a loose sphere rather than a hinge. The nest is fleece, where the owner's later references favour moss |
| **C, the appliance** | **drop** | A round body with a porthole door and a hose reads as a washing machine. A room lamp outshines the pod |

**For every result:** the pod's cap comes out copper-brown rather than russet, and should be russet (#ae674d) as in the reference.

## Round 2 (the revised intent, 429f6eb8): what is asked

- **The capsule:** closed and open, as in `studio-prompts.md` (the owner's ref-7 is closest to our palette).
- **The egg:** closed and open, as in `studio-prompts.md`.
- **The bell jar, fixed:** an edit of B's two outputs. The floor lamp is removed, the pod is made the reference's charcoal with a russet cap, and nothing else changes.
- **Not the porthole:** a round body with a round door drifts to the washing machine that C became.

## Round 2 (masters-pods aa017583, `concepts/incubator-object-r2/`): the shortlist

**Ranked; each pair is closed and open:**

1. **The capsule** (`capsule-closed`, plus `capsule-open-mint-1024x600.png` here).
   - **Why first:** it is premium and minimal, and nearly our palette: matte dark slate, one warm arch of light behind the pod on a moss-and-soil plug, and a single mint signal in the base. It belongs to the Station without bending the house style, and it is the closest to the owner's latest references. The pod reads charcoal and russet, and the open glass door is a believable hinge.
   - **Its one fault, fixed here without a paid call:** the open painting's base bar came out warm white. `fix-capsule-bar.py` recolours the bar and its glow to the closed painting's mint, keeping each pixel's lightness. Nothing else in the picture is touched.
2. **The egg** (`egg-closed`, `egg-open`).
   - **Why second:** the most domestic and lovable. Cream over sage, a big window onto a lush moss-and-fern world, and an open state that lifts like a lid.
   - **Faults:** the pod's cap is peach rather than russet, and side daylight is the main light, so the pod's own glow is weak. Both are for the master if it is chosen.
3. **The bell jar, fixed** (`bell-jar-closed-fixed`, `bell-jar-open-fixed`).
   - **Why third:** the floor lamp is gone and it stays a charming, precious object. But it is a flatter, more illustrated hand than the other two, and the pod is still a lighter, bluer slate than the reference. It is the least premium of the three.

**Out:**
- **The brooder:** its hood reads as brass, and it sits below the capsule on finish.
- **The appliance:** it reads as a washing machine.

**No pod retries ordered.** The capsule needed only the bar, and the faults in the egg and the bell jar don't change the choice. Whichever direction the owner picks gets one clean master pass.

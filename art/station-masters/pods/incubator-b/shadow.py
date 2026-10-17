"""T-20261016-99: the founder's shadow through the shell, the AD's look for the build's `shadow` derive (specs/face-arc-and-shadow.md §2
leaves the look to the AD). The owner: "sharpen the founder shape". It is a shadow seen through a shell lit from below, never an embryo,
and it shows only what is known (ruling §4).
Input: the founder's alpha in the 160 x 192 box, fitted to FIT_W wide (not the box's full 160, so the whole outline, the head and crown
too, lies in the shell's translucent body between the straps and under the cap), centred, its feet LIFT px above the box's foot: the body, plus the layers of the looks whose chapter is known. An
unread look adds nothing, so its part keeps the species' plain body (the bare head until Face clears). q = known chapters / chapters.
The treatment, per pixel (all parameters are the build's, in PARAMS):
1. the mask m: the alpha through a smoothstep from MASK_LO to MASK_HI, so a painting's own soft ground shadow (alpha ~0.43) drops out
   and only the body casts;
2. the penumbra: m blurred by sigma = SIG0 - SIG_Q * q (the more is known, the crisper), times READY_K at ready. The light is below, so
   the shadow's far (top) edge is softer than its near (lower) edge: the blur at the top row is sigma x TOP_K, at the bottom row
   sigma x BOT_K, mixed by row;
3. the core: a = min(1, blurred x CORE), so the body reads solid and only its edge is soft;
4. the colour: SHADOW_RGB (the warm dark the light through the shell leaves); alpha a' = floor((a x 255 x P + 50) / 100) with the ruling's
   P (cool 25, warm 45, glowing 65, ready 80).
"""
import numpy as np
from scipy import ndimage as nd
PARAMS = {"FIT_W": 124, "LIFT": 10, "MASK_LO": 0.47, "MASK_HI": 0.62, "SIG0": 4.6, "SIG_Q": 4.0, "READY_K": 1.0, "TOP_K": 1.45, "BOT_K": 0.7, "CORE": 1.3, "SHADOW_RGB": (36, 22, 14)}
P_STEP = {"cool": 25, "warm": 45, "glowing": 65, "ready": 80}
def derive(alpha, q, step, p=PARAMS):
    """alpha: 192 x 160 float 0..1 (the fitted founder's alpha); q: known fraction 0..1; step: cool|warm|glowing|ready.
    Returns 192 x 160 x 4 uint8, straight alpha."""
    t0 = np.clip((alpha - p["MASK_LO"]) / (p["MASK_HI"] - p["MASK_LO"]), 0, 1); alpha = t0 * t0 * (3 - 2 * t0)
    sig = (p["SIG0"] - p["SIG_Q"] * q) * (p["READY_K"] if step == "ready" else 1.0)
    top = nd.gaussian_filter(alpha, sig * p["TOP_K"]); bot = nd.gaussian_filter(alpha, sig * p["BOT_K"])
    t = np.linspace(0, 1, alpha.shape[0])[:, None]
    a = np.minimum(1.0, (top * (1 - t) + bot * t) * p["CORE"])
    a8 = np.floor((np.rint(a * 255) * P_STEP[step] + 50) / 100)
    out = np.zeros(alpha.shape + (4,), np.uint8); out[..., :3] = p["SHADOW_RGB"]; out[..., 3] = a8.astype(np.uint8)
    return out

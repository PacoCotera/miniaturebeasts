"""S20 shape genes applied to the raw species dict before forward kinematics (chunk 3 uses them for the ear and tail strips; chunk 7 adds the gene table and the individuals).
Conventions follow the design's concept.mjs: a factor of 1 and an offset of 0 are the type specimen exactly. The tail's added curl is clipped by the room rule (tube.clip_curl logic on the added curl only): the curl is shrunk, never the radius, and the clip is logged in parts.tail.clip."""
import copy
import numpy as np
import paths as PA

DEFAULT = dict(torsoGirth=1.0, headSize=1.0, legLen=1.0, legGirth=1.0, ear="prick", earLen=1.0, earGirth=1.0, splay=0.0, droop=0.0,
               tailLen=1.0, tailGirth=1.0, curl=0.0, lift=0.0, tip="lantern", tipSize=1.0)


def _tail_ok(joints, fillet):
    P = PA.fk(joints[0]["at"], joints)
    _, rep = PA.fillet_path(P, [j["r"] for j in joints], fillet)
    return all(r["ok"] for r in rep)


def apply_shape(raw, g=None):
    g = {**DEFAULT, **(g or {})}
    r = copy.deepcopy(raw)
    t = r["parts"]["torso"]
    t["section"]["stations"] = [[z, [v * (g["headSize"] if z > t["regions"]["body"][1] else g["torsoGirth"]) if v > 0.05 else v for v in ax]] for z, ax in t["section"]["stations"]]
    for m in t["masses"]:
        m["rho"] *= g["headSize"] if m["z"] > t["regions"]["body"][1] else g["torsoGirth"]
    ear = r["parts"]["ear.L"]
    ear["default"] = g["ear"]
    fam = ear["families"][g["ear"]]
    if not fam.get("sit"):
        fam["plane"]["yaw"] += g["splay"]
        for k, j in enumerate(fam["joints"]):
            if k > 0:
                j["len"] *= g["earLen"]
                j["pitch"] -= g["droop"]
            j["r"] = [v * g["earGirth"] for v in j["r"]]
    else:
        for tb in fam["tubes"]:
            tb["len"] = min(0.35, tb["len"] * g["earLen"]); tb["yaw"] += g["splay"]
    tail = r["parts"]["tail"]
    js = tail["joints"]
    base = [j.get("pitch", 0.0) for j in js]
    for k, j in enumerate(js):
        j["r"] = [v * g["tailGirth"] for v in j["r"]]
        if k > 0:
            j["len"] *= g["tailLen"]
    f = 1.0
    for _ in range(300):
        for k, j in enumerate(js):
            if k > 0:
                j["pitch"] = base[k] - g["lift"] - f * g["curl"] * 360.0 * (k - 1) / 5
        if g["curl"] <= 0 or _tail_ok(js, tail["fillet"]):
            break
        f *= 0.985
    tail["clip"] = dict(requested=g["curl"], applied=g["curl"] * f, factor=f)
    leg = r["parts"]["leg.L"]
    for j in leg["joints"][1:]:
        j["len"] *= g["legLen"]
        j["r"] = [v * g["legGirth"] for v in j["r"]]
    r["_genes"] = g
    return r

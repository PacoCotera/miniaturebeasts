"""The species file (body-spec s1.2): load, validate, resolve `house:<name>` references through housefield.House, and the forward kinematics of every limb.
`load(path)` returns the species dict with every house: reference replaced by a number and each limb's joints expanded to centres (`P`) with the sole-on-floor solve logged."""
import json, os, sys, copy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(os.path.dirname(HERE), "mesh"))
import paths as PA

SPECIES = os.path.join(HERE, "species", "S01.json")
KINDS = {"loft", "limb", "socket-only", "tube", "spine-range"}
PART_KEYS = {"loft": ["ring", "path", "section"], "limb": ["ring", "joints", "fillet", "socket"], "socket-only": ["socket"], "tube": ["ring", "socket", "mirror"], "spine-range": ["joints"]}


class SchemaError(ValueError):
    pass


def house_names(H):
    """The `house:` vocabulary this spec uses, in the house frame (head-local numbers lifted by K)."""
    kc = H.kc
    names = {
        "K": [float(kc[0]), float(kc[2])],
        "K.xyz": kc.tolist(),
        "crest.root": [float(kc[0] + H.rig["crest"]["root"][0]), float(kc[2] + H.rig["crest"]["root"][2])],
        "form.carriage": float(H.fp["carriage"]),
        "M.c": (kc + H.M["c"]).tolist(),
        "J": (kc + H.J["c"]).tolist(),
        "nose": (kc + H.nose["c"]).tolist(),
    }
    return names


def resolve(obj, names):
    if isinstance(obj, str) and obj.startswith("house:"):
        k = obj[6:]
        if k not in names:
            raise SchemaError(f"unknown house reference {obj}")
        return copy.deepcopy(names[k])
    if isinstance(obj, dict):
        return {k: resolve(v, names) for k, v in obj.items()}
    if isinstance(obj, list):
        return [resolve(v, names) for v in obj]
    return obj


def validate(spec):
    """Rejects a missing joint, an unknown kind, a parent that does not exist, a limb without a root joint or without lengths, a missing key."""
    for need in ("schema", "species", "frame", "unit", "parts"):
        if need not in spec:
            raise SchemaError(f"missing {need}")
    if spec["frame"] != "house" or spec["unit"] != "H":
        raise SchemaError("frame must be house, unit H")
    parts = spec["parts"]
    for name, p in parts.items():
        if p.get("kind") not in KINDS:
            raise SchemaError(f"{name}: unknown kind {p.get('kind')}")
        for k in PART_KEYS[p["kind"]]:
            if k not in p:
                raise SchemaError(f"{name}: missing {k}")
        par = p.get("parent")
        if par is not None and par not in parts:
            raise SchemaError(f"{name}: parent {par} is not a part")
        if p["kind"] == "limb":
            js = p["joints"]
            if len(js) < 3 or "at" not in js[0]:
                raise SchemaError(f"{name}: a limb needs a root joint with `at` and at least 2 more")
            for j in js[1:]:
                for k in ("name", "len", "pitch", "r"):
                    if k not in j:
                        raise SchemaError(f"{name}.{j.get('name', '?')}: joint missing {k}")
        if p["kind"] == "loft":
            for j in p["path"]["joints"]:
                if "name" not in j or "at" not in j:
                    raise SchemaError(f"{name}: path joint missing name or at")
            if p["path"].get("key", "x") not in ("x", "z"):
                raise SchemaError(f"{name}: path.key must be x or z")
            if p["path"].get("key") == "z" and p["path"].get("N") != "back":
                raise SchemaError(f"{name}: a z-keyed loft needs N: back")
        if p["kind"] == "tube":
            if p["mirror"] not in ("lateral", "centre"):
                raise SchemaError(f"{name}: tube mirror must be lateral or centre")
            sets = list(p["families"].values()) if "families" in p else [p]
            if not sets:
                raise SchemaError(f"{name}: a tube needs joints or families")
            for fam in sets:
                if fam.get("sit"):
                    for t in fam["tubes"]:
                        for k in ("yaw", "pitch", "len", "r"):
                            if k not in t:
                                raise SchemaError(f"{name}: sitting tube missing {k}")
                    continue
                js = fam.get("joints")
                if not js or len(js) < 3 or "at" not in js[0]:
                    raise SchemaError(f"{name}: a tube needs a root joint with `at` and at least 2 more")
                for j in js[1:]:
                    for k in ("name", "len", "pitch", "r"):
                        if k not in j:
                            raise SchemaError(f"{name}.{j.get('name', '?')}: joint missing {k}")
    return True


def load(path=SPECIES, house=None, solve_sole=True, raw=None):
    if raw is not None:
        spec = copy.deepcopy(raw)
    else:
        with open(path) as fh:
            spec = json.load(fh)
    validate(spec)
    if spec.get("house", {}).get("specimen", "x") is None:
        H, names = None, {}          # a species with no house specimen (S20): housefield.House asserts plan A, so it is never called
    else:
        from housefield import House
        H = house or House(spec["species"])
        names = house_names(H)
    spec = resolve(spec, names)
    spec["_names"] = names
    for name, p in spec["parts"].items():
        if p["kind"] == "spine-range":
            js = p["joints"]
            if len(js) < 3 or "at" not in js[0]:
                raise SchemaError(f"{name}: a spine range needs a root joint with `at` and at least 2 more")
        if p["kind"] == "spine-range":
            p["P"] = PA.fk(np.array(p["joints"][0]["at"], float), p["joints"]).tolist()
            p["R"] = [j["r"] for j in p["joints"]]
            continue
        if p["kind"] == "tube":
            sets = p["families"] if "families" in p else {"": p}
            for fam in sets.values():
                if fam.get("sit"):
                    continue
                js = fam["joints"]
                fam["P"] = PA.fk(np.array(js[0]["at"], float), js, plane_yaw=float(fam.get("plane", {}).get("yaw", 0.0))).tolist()
                fam["R"] = [j["r"] for j in js]
            continue
        if p["kind"] != "limb":
            continue
        js = p["joints"]
        root = np.array(js[0]["at"], float)
        jj = [dict(j) for j in js]
        if solve_sole:
            jj2, root2, log = PA.sole_on_floor(root, jj)
        else:
            jj2, root2, log = jj, root, {}
        p["solve"] = log
        p["P"] = PA.fk(root2, jj2, plane_yaw=float(p.get("plane", {}).get("yaw", 0.0))).tolist()
        p["pitch_solved"] = [j.get("pitch") for j in jj2]
        p["R"] = [j["r"] for j in js]
    return spec, H

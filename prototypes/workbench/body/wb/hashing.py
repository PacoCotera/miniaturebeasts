"""Canonical hashing for the workbench: one JSON form for any species file, genome or argument set, so the same content always gives the same key.
Rules: keys sorted, no whitespace, a float that is a whole number is written as an int, other floats are rounded to 12 significant digits, tuples are lists, numpy scalars and arrays are plain numbers and lists."""
import hashlib
import json
import os

import numpy as np

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _norm(o):
    if isinstance(o, dict):
        return {str(k): _norm(o[k]) for k in sorted(o, key=str)}
    if isinstance(o, (list, tuple)):
        return [_norm(v) for v in o]
    if isinstance(o, np.ndarray):
        return _norm(o.tolist())
    if isinstance(o, np.generic):
        return _norm(o.item())
    if isinstance(o, bool) or o is None or isinstance(o, (int, str)):
        return o
    if isinstance(o, float):
        if o != o or o in (float("inf"), float("-inf")):
            raise ValueError("a non-finite number cannot be hashed")
        if o == int(o) and abs(o) < 1e15:
            return int(o)
        return float("%.12g" % o)
    raise TypeError(f"cannot hash a {type(o).__name__}")


def canonical(o):
    return json.dumps(_norm(o), sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def hash_of(*parts):
    """sha256 hex of the canonical form of the parts, in order (each part is length-framed by being a list element)."""
    return hashlib.sha256(canonical(list(parts)).encode()).hexdigest()


_FW = {}


def framework_id():
    """A hash of the framework's own source (every body/*.py, not wb/ and not tests/): the 'framework commit' of the cache keys. It changes when the code that builds a cage changes, and not when only the workbench or a comment-free file elsewhere does.
    (A git commit id would change on every commit, and a dirty tree has none; a content hash is the same on every machine.)"""
    names = sorted(n for n in os.listdir(BODY) if n.endswith(".py"))
    sig = tuple((n, os.stat(os.path.join(BODY, n)).st_mtime_ns) for n in names)
    if _FW.get("sig") != sig:
        h = hashlib.sha256()
        for n in names:
            h.update(n.encode() + b"\0")
            with open(os.path.join(BODY, n), "rb") as fh:
                h.update(fh.read())
        _FW["sig"], _FW["id"] = sig, h.hexdigest()[:12]
    return _FW["id"]


def cage_hash(body):
    """The hash of a built cage: the full (mirrored) vertices to 1e-6, the faces, and the part of each face. Stable across processes."""
    V, F, attr, fp, cr, mir = body.full()
    h = hashlib.sha256()
    h.update((np.round(np.asarray(V, float), 6) + 0.0).astype(np.float64).tobytes())      # + 0.0 turns -0.0 into 0.0
    h.update(np.asarray(F, np.int64).tobytes())
    h.update(np.asarray(fp, np.int64).tobytes())
    return h.hexdigest()

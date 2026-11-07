"""The studio GLB: what the browser draws a mesh kind from (`wb mesh import` writes it, `wb mesh studio` writes it again for a sculpt that is already imported).
A sculpt's studio GLB is the sculpt's surface with the skin the server's rig uses (meshrig.MeshRig.fix_weights: a leg's vertices follow their own leg, a sole follows its paw alone; top four bones per vertex, normalised,
every vertex weighted) and one morph target per scripted shape key (meshrig.KEYS, named `key.form.torso-girth` like the species file's `keys[].id`; the target is the key's offset at amount 1, so the page sets the file's amount as the weight).
A part's studio GLB is its surface. Both are meshopt-compressed (EXT_meshopt_compression, KHR_mesh_quantization), no material, no colour; the zone map image rides along on a sculpt. The file sits beside the source as NAME.studio.glb and its sha256, bytes and
morph targets are pinned in the sidecar's `studio` block; the source GLB (the signed sculpt) is never rewritten.
Numpy only; the packing is wb/glbpack/pack.mjs (node, `npm ci` in wb/glbpack)."""
import json
import os
import subprocess
import sys
import tempfile

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)
import meshsource as MS

SCHEMA = "mb-studio-glb/1"
MAX_BYTES = 300 * 1024
PACK = os.path.join(HERE, "wb", "glbpack", "pack.mjs")


def studio_name(glb_file):
    return glb_file[:-4] + ".studio.glb"


def to_file_axes(P):
    """The studio's z-up axes back to the file's y-up (the inverse of meshsource.zup)."""
    P = np.asarray(P, float)
    return np.stack([P[..., 0], P[..., 2], -P[..., 1]], -1)


def fill_empty(W, V, inv):
    """Weights per source vertex from the rig's (per welded vertex): a vertex nothing weights takes the weights of the nearest vertex that has some."""
    S = W[inv]
    empty = S.sum(1) < 1e-6
    if empty.any():
        ok = np.where(~empty)[0]
        for i in np.where(empty)[0]:
            S[i] = S[ok[np.argmin(((V[ok] - V[i]) ** 2).sum(1))]]
    return S, int(empty.sum())


def top4_u8(S):
    """(joints (n,4) uint8, weights (n,4) uint8): the four strongest bones of each vertex, normalised, in 8 bits that add up to exactly 255."""
    order = np.argsort(-S, axis=1, kind="stable")[:, :4]
    w = np.take_along_axis(S, order, 1)
    w = w / np.maximum(w.sum(1, keepdims=True), 1e-12)
    q = np.floor(w * 255.0).astype(int)
    rest = 255 - q.sum(1)
    frac = w * 255.0 - q
    for k in range(4):
        pick = np.argsort(-frac, axis=1, kind="stable")[:, k]
        give = rest > k
        q[np.where(give)[0], pick[give]] += 1
    return order.astype(np.uint8), q.astype(np.uint8)


class Plain:
    """A GLB under construction: the arrays, their accessors and views, written as an uncompressed GLB for the packer."""
    def __init__(self):
        self.js = dict(asset=dict(version="2.0", generator="wb studio_glb"), accessors=[], bufferViews=[])
        self.bin = bytearray()

    def view(self, data, target=None):
        while len(self.bin) % 4:
            self.bin.append(0)
        bv = dict(buffer=0, byteOffset=len(self.bin), byteLength=len(data))
        if target:
            bv["target"] = target
        self.bin += data
        self.js["bufferViews"].append(bv)
        return len(self.js["bufferViews"]) - 1

    def accessor(self, arr, typ, comp, normalized=False, target=34962, minmax=False):
        a = dict(bufferView=self.view(np.ascontiguousarray(arr).tobytes(), target), componentType=comp, count=int(len(arr)), type=typ)
        if normalized:
            a["normalized"] = True
        if minmax:
            a["min"] = [float(x) for x in arr.min(0)]
            a["max"] = [float(x) for x in arr.max(0)]
        self.js["accessors"].append(a)
        return len(self.js["accessors"]) - 1

    def save(self, path):
        self.js["buffers"] = [dict(byteLength=len(self.bin))]
        MS.write_glb(path, self.js, bytes(self.bin))


def pack(plain_path, out_path):
    r = subprocess.run(["node", PACK, "pack", plain_path, out_path], capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(f"pack.mjs failed: {r.stderr.strip() or r.stdout.strip()} (is `npm ci` done in {os.path.dirname(PACK)}?)")


def check_packed(path):
    """What the packer reads back from a packed GLB (decoded, every stream): one dict."""
    r = subprocess.run(["node", PACK, "check", path], capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(f"pack.mjs check failed: {r.stderr.strip()}")
    return json.loads(r.stdout)


def available():
    return os.path.isdir(os.path.join(os.path.dirname(PACK), "node_modules", "meshoptimizer"))


def _stamp(sc, glb_path, extra):
    sc["studio"] = dict(schema=SCHEMA, file=os.path.basename(glb_path), sha256=MS.sha256_file(glb_path), bytes=os.path.getsize(glb_path), source_sha256=sc["glb"]["sha256"], **extra)


def build_body(sidecar_path, log=print):
    """The studio GLB of the sculpt whose sidecar is `sidecar_path`; the sidecar gets its `studio` block. Returns the block."""
    import meshrig as MR
    m = MS.Mesh(sidecar_path)
    g = m.glb
    rig = MR.MeshRig(m)
    p = g.primitives()[0]
    at = p["attributes"]
    Pf = g.accessor(at["POSITION"]).astype(np.float32)
    Nf = g.accessor(at["NORMAL"]).astype(np.float32)
    UV = g.accessor(at["TEXCOORD_0"]).astype(float)
    F = g.accessor(p["indices"]).astype(np.uint32)
    V = MS.zup(Pf.astype(float))
    key = np.round(V / 1e-6).astype(np.int64)
    _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    inv = inv.reshape(-1)
    if len(first) != len(rig.V) or float(np.abs(rig.V[inv] - V).max()) > 1e-5:
        raise ValueError("the rig's welded surface is not the file's: cannot map the skin")
    S, empty = fill_empty(rig.W, V, inv)
    J, W = top4_u8(S)
    names = [k for k in MR.KEYS]
    deltas = []
    for k in names:
        d = np.zeros_like(rig.V)
        d += rig.key_offset({"key." + k: 1.0})
        deltas.append(to_file_axes(d[inv]).astype(np.float32))
    pl = Plain()
    pos = pl.accessor(Pf, "VEC3", 5126, minmax=True)
    nor = pl.accessor(Nf, "VEC3", 5126)
    uv = pl.accessor(np.clip(np.round(UV * 65535.0), 0, 65535).astype(np.uint16), "VEC2", 5123, normalized=True)
    jo = pl.accessor(J, "VEC4", 5121)
    we = pl.accessor(W, "VEC4", 5121, normalized=True)
    tg = [dict(POSITION=pl.accessor(d, "VEC3", 5126, minmax=True)) for d in deltas]
    ix = pl.accessor(F, "SCALAR", 5125, target=34963) if len(Pf) > 65535 else pl.accessor(F.astype(np.uint16), "SCALAR", 5123, target=34963)
    ibm = pl.accessor(g.accessor(g.json["skins"][0]["inverseBindMatrices"]).astype(np.float32).reshape(-1, 16), "MAT4", 5126, target=None)
    sj = g.json
    prim = dict(attributes=dict(POSITION=pos, NORMAL=nor, TEXCOORD_0=uv, JOINTS_0=jo, WEIGHTS_0=we), indices=ix)
    mesh = dict(name=sj["meshes"][0].get("name", "body"), primitives=[prim])
    if tg:
        prim["targets"] = tg
        mesh["weights"] = [0.0] * len(tg)
        mesh["extras"] = dict(targetNames=["key." + k for k in names])
    pl.js.update(scene=sj["scene"], scenes=sj["scenes"], nodes=sj["nodes"], meshes=[mesh], skins=[dict(sj["skins"][0], inverseBindMatrices=ibm)])
    z = g.zone_map()
    extras = dict(schema=SCHEMA, source=m.sc["glb"]["sha256"], keys=["key." + k for k in names])
    if z:
        png, meta = z
        bv = pl.view(png)
        pl.js["images"] = [dict(mimeType="image/png", bufferView=bv, name="zonemap")]
        extras["zonemap"] = dict(meta, image=0)
    pl.js["asset"]["extras"] = extras
    out = os.path.join(m.dir, studio_name(m.sc["glb"]["file"]))
    tmp = tempfile.mkdtemp()
    try:
        plain = os.path.join(tmp, "plain.glb")
        pl.save(plain)
        pack(plain, out)
    finally:
        for f in os.listdir(tmp):
            os.remove(os.path.join(tmp, f))
        os.rmdir(tmp)
    if os.path.getsize(out) > MAX_BYTES:
        raise ValueError(f"{os.path.basename(out)} is {os.path.getsize(out)} bytes, over the {MAX_BYTES} cap")
    _stamp(m.sc, out, dict(bones=list(rig.names), morph_targets=["key." + k for k in names], weights_empty=empty, vertices=int(len(Pf)), triangles=int(len(F) // 3)))
    MS.write_json(m.path, m.sc)
    log(f"{m.sc['id']}: studio GLB {os.path.getsize(out)} bytes, {len(Pf)} vertices, targets {m.sc['studio']['morph_targets']}, {empty} vertices had no weights")
    return m.sc["studio"]


def build_part(sidecar_path, log=print):
    """The studio GLB of a library part; its sidecar gets a `studio` block."""
    path = MS.abspath(sidecar_path)
    sc = MS.load_json(path)
    g = MS.Glb(os.path.join(os.path.dirname(path), sc["glb"]["file"]))
    p = g.primitives()[0]
    at = p["attributes"]
    Pf = g.accessor(at["POSITION"]).astype(np.float32)
    Nf = g.accessor(at["NORMAL"]).astype(np.float32)
    UV = g.accessor(at["TEXCOORD_0"]).astype(float)
    F = g.accessor(p["indices"]).astype(np.uint32)
    if UV.min() < 0 or UV.max() > 1:
        raise ValueError(f"{sc['id']}: texture coordinates outside 0..1")
    pl = Plain()
    pos = pl.accessor(Pf, "VEC3", 5126, minmax=True)
    nor = pl.accessor(Nf, "VEC3", 5126)
    uv = pl.accessor(np.clip(np.round(UV * 65535.0), 0, 65535).astype(np.uint16), "VEC2", 5123, normalized=True)
    ix = pl.accessor(F.astype(np.uint16), "SCALAR", 5123, target=34963)
    pl.js.update(scene=0, scenes=[dict(nodes=[0])], nodes=[dict(mesh=0, name=g.json["meshes"][0].get("name", "part"))], meshes=[dict(name=g.json["meshes"][0].get("name", "part"), primitives=[dict(attributes=dict(POSITION=pos, NORMAL=nor, TEXCOORD_0=uv), indices=ix)])])
    pl.js["asset"]["extras"] = dict(schema=SCHEMA, source=sc["glb"]["sha256"])
    out = os.path.join(os.path.dirname(path), studio_name(sc["glb"]["file"]))
    tmp = tempfile.mkdtemp()
    try:
        plain = os.path.join(tmp, "plain.glb")
        pl.save(plain)
        pack(plain, out)
    finally:
        for f in os.listdir(tmp):
            os.remove(os.path.join(tmp, f))
        os.rmdir(tmp)
    if os.path.getsize(out) > MAX_BYTES:
        raise ValueError(f"{os.path.basename(out)} is {os.path.getsize(out)} bytes, over the {MAX_BYTES} cap")
    _stamp(sc, out, dict(vertices=int(len(Pf)), triangles=int(len(F) // 3)))
    MS.write_json(path, sc)
    log(f"{sc['id']}: studio GLB {os.path.getsize(out)} bytes")
    return sc["studio"]


def main(argv=None):
    import argparse
    ap = argparse.ArgumentParser(prog="wb mesh studio")
    ap.add_argument("sidecar", nargs="+", help="sculpt or part sidecars (relative to species_v1, or a path)")
    a = ap.parse_args(argv)
    for s in a.sidecar:
        sc = MS.load_json(s)
        (build_part if sc.get("schema") == MS.SCHEMA_PART else build_body)(s)
    return 0


if __name__ == "__main__":
    sys.exit(main())

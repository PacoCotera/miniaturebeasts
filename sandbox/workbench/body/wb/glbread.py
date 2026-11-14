"""Reads an exported glb back, with numpy only: the mesh, the skin and a clip's pose, so the file can be checked against the pictures it was made from. It does what any glTF viewer does: the joint matrices of a
clip's first sample, linear blend skinning of the bind mesh, and the normals taken again on the posed surface (the vertices of a UV seam are welded by position, so the normal is continuous across it).
    read(path) -> Glb;  Glb.posed(clip, sample=0) -> dict(V, N, F (quads), UV (None without a coat), part);  Glb.write_textures(dir) -> {col, emit, rough} PNG paths"""
import json
import os
import struct
import sys

import numpy as np

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BODY not in sys.path:
    sys.path.insert(0, BODY)

COMP = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NCOMP = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


class Glb:
    def __init__(self, path):
        with open(path, "rb") as fh:
            b = fh.read()
        if b[:4] != b"glTF":
            raise ValueError(f"{path}: not a glb")
        n = struct.unpack("<I", b[12:16])[0]
        self.json = json.loads(b[20:20 + n])
        m = struct.unpack("<I", b[20 + n:24 + n])[0]
        self.bin = b[28 + n:28 + n + m]

    def accessor(self, i):
        a = self.json["accessors"][i]
        bv = self.json["bufferViews"][a["bufferView"]]
        dt, k = COMP[a["componentType"]], NCOMP[a["type"]]
        off = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
        arr = np.frombuffer(self.bin, dt, a["count"] * k, off).reshape(a["count"], k)
        return arr[:, 0] if k == 1 else arr

    def image(self, i):
        bv = self.json["bufferViews"][self.json["images"][i]["bufferView"]]
        off = bv.get("byteOffset", 0)
        return self.bin[off:off + bv["byteLength"]]

    @property
    def extras(self):
        return self.json["asset"]["extras"]

    # ---- the skeleton
    def local_matrices(self, clip, at=0):
        nodes = self.json["nodes"]
        T = [np.array(n.get("translation", [0, 0, 0]), float) for n in nodes]
        R = [np.array(n.get("rotation", [0, 0, 0, 1]), float) for n in nodes]
        S = [np.array(n.get("scale", [1, 1, 1]), float) for n in nodes]
        if clip is not None:
            an = next(a for a in self.json["animations"] if a["name"] == clip)
            for ch in an["channels"]:
                out = self.accessor(an["samplers"][ch["sampler"]]["output"])[at].astype(float)         # the first sample, or sample `at`
                {"translation": T, "rotation": R, "scale": S}[ch["target"]["path"]][ch["target"]["node"]] = out
        mats = []
        for t, q, s in zip(T, R, S):
            x, y, z, w = q / np.linalg.norm(q)
            r = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                          [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                          [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
            m = np.eye(4)
            m[:3, :3] = r * s
            m[:3, 3] = t
            mats.append(m)
        return mats

    def joint_matrices(self, clip, at=0):
        nodes = self.json["nodes"]
        loc = self.local_matrices(clip, at)
        parent = {}
        for i, n in enumerate(nodes):
            for c in n.get("children", []):
                parent[c] = i
        world = {}

        def w(i):
            if i not in world:
                world[i] = loc[i] if i not in parent else w(parent[i]) @ loc[i]
            return world[i]
        skin = self.json["skins"][0]
        ibm = self.accessor(skin["inverseBindMatrices"]).astype(float).reshape(-1, 4, 4).transpose(0, 2, 1)       # stored column-major
        return np.array([w(j) @ ibm[k] for k, j in enumerate(skin["joints"])])

    # ---- the mesh
    def posed(self, clip="stand", sample=0):
        p = self.json["meshes"][0]["primitives"][0]
        at = p["attributes"]
        V = self.accessor(at["POSITION"]).astype(float)
        J, W = self.accessor(at["JOINTS_0"]).astype(int), self.accessor(at["WEIGHTS_0"]).astype(float)
        tri = self.accessor(p["indices"]).reshape(-1, 3).astype(int)
        n = len(tri) // 2
        quads = np.concatenate([tri[:n], tri[n:, 2:3]], 1)                       # the writer lays a quad (a, b, c, d) down as (a, b, c) then (a, c, d)
        JM = self.joint_matrices(clip, sample)
        Vh = np.concatenate([V, np.ones((len(V), 1))], 1)
        Vp = np.zeros_like(V)
        for k in range(4):
            Vp += W[:, k:k + 1] * np.einsum("nij,nj->ni", JM[J[:, k]], Vh)[:, :3]
        _, first, inv = np.unique(np.round(V, 7), axis=0, return_index=True, return_inverse=True)         # the welded surface: one vertex per bind position
        inv = inv.reshape(-1)
        import gltf_out
        Nw = gltf_out.vertex_normals(Vp[first], inv[quads])
        return dict(V=Vp, N=Nw[inv], F=quads, UV=self.accessor(at["TEXCOORD_0"]).astype(float) if "TEXCOORD_0" in at else None, part=np.rint(self.accessor(at["_PART"])).astype(int) if "_PART" in at else None)

    # ---- the coat
    def write_textures(self, d):
        """The glb's three images as the files the plush material reads: baseColor and emissive as they are, the roughness (the G channel of the third) as grey."""
        import s20tex as TX
        from wb import pngio
        os.makedirs(d, exist_ok=True)
        imgs = [self.image(i) for i in range(3)]
        paths = {}
        for k, raw in zip(("col", "emit", "rough"), imgs):
            p = os.path.abspath(os.path.join(d, k + ".png"))
            if k != "rough":
                with open(p, "wb") as fh:
                    fh.write(raw)
            else:
                tmp = os.path.join(d, "rough-src.png")
                with open(tmp, "wb") as fh:
                    fh.write(raw)
                TX.write_png(p, pngio.read(tmp)[..., 1])
                os.remove(tmp)
            paths[k] = p
        return paths


def read(path):
    return Glb(path)

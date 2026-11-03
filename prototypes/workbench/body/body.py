"""One continuous cage: a Cage (mesh/cage.py) plus the per-vertex (part, s, around) attributes and each vertex's design target (the point on the part's own analytic surface that the limit-fix lands on).
Half model (y >= 0); vertices with y == 0 exactly are on the mirror plane (Cage.full() mirrors them)."""
import os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(os.path.dirname(HERE), "mesh"))
from cage import Cage


class Body:
    def __init__(self, name="loika"):
        self.cage = Cage(name, mirrored=True)
        self.part, self.s, self.around, self.target = [], [], [], []
        self.parts = {}              # part name -> id
        self.dead = set()            # deleted face indices
        self.face_part = []
        self.hold = set()
        self.caps = []
        self.tag = {}         # vertex id (after finish) -> zone tag (1 = toe bead)
        self.subdiv_offset = {}  # part name -> -1 for a closed shell shown one level less (the species file's appendage `subdiv_offset`)
        self.hooks = []       # callables(body): re-place detail vertices from the current cage, run each limit-fix step

    def pid(self, name):
        return self.parts.setdefault(name, len(self.parts))

    def add(self, p, part, s=0.0, a=0.0, target=None, centre=False):
        p = np.array(p, float)
        if centre:
            p[1] = 0.0
        i = self.cage.add(p)
        self.part.append(self.pid(part)); self.s.append(float(s)); self.around.append(float(a))
        self.target.append(None if target is None else np.array(target, float))
        return i

    def face(self, a, b, c, d, part):
        f = self.cage.face(a, b, c, d)
        self.face_part.append(self.pid(part))
        return f

    def sync(self, part, face_part=None):
        """After direct Cage.add/face calls (cage.coons_cap): pad the attribute arrays; a new vertex's target is where it was put."""
        c = self.cage
        for i in range(len(self.part), len(c.V)):
            self.part.append(self.pid(part)); self.s.append(0.0); self.around.append(0.0); self.target.append(np.array(c.V[i], float))
        for i in range(len(self.face_part), len(c.F)):
            self.face_part.append(self.pid(face_part or part))

    def full(self):
        """The mirrored mesh: V, F, per-vertex attribute array (part, s, around), per-face part id, creases (full indices), the half-to-full vertex map for the mirror copies."""
        c = self.cage
        V, F, mirror = c.full()
        n = len(c.V)
        extra = np.where(mirror[:n] != np.arange(n))[0]
        tg = np.zeros(len(self.part))
        for k, v in self.tag.items():
            tg[k] = v
        attr = np.array([self.part, self.s, self.around, tg], float).T
        attr_full = np.vstack([attr, attr[extra]])
        fp = np.array(self.face_part + self.face_part, int)
        cr = {}
        for (a, b), sh in c.crease.items():
            cr[(min(a, b), max(a, b))] = sh
            ma, mb_ = int(mirror[a]), int(mirror[b])
            if (ma, mb_) != (a, b):
                cr[(min(ma, mb_), max(ma, mb_))] = sh
        return V, F, attr_full, fp, cr, mirror

    def kill(self, fidx):
        self.dead.add(fidx)

    def finish(self):
        """Drop the deleted faces and unused vertices; fix the winding; returns the vertex remap."""
        c = self.cage
        keep = [i for i in range(len(c.F)) if i not in self.dead]
        c.F = [c.F[i] for i in keep]
        self.face_part = [self.face_part[i] for i in keep]
        self.dead = set()
        m = c.compact()
        n = len(c.V)
        inv = np.full(n, -1)
        for o, nn in m.items():
            inv[nn] = o
        for nm in ("part", "s", "around", "target"):
            old = getattr(self, nm)
            setattr(self, nm, [old[inv[i]] for i in range(n)])
        self.hold = {m[i] for i in self.hold if i in m}
        for cp in self.caps:
            cp.ring = [m[i] for i in cp.ring]
            cp.ids = [m[i] for i in cp.ids]
            cp.G = {k: m[v] for k, v in cp.G.items()}
        vol = c.fix_winding()
        return m, vol

    # ---- topology helpers
    def valence(self):
        V, F, _ = self.cage.full()
        v = np.zeros(len(V), int)
        for f in F:
            for i in f:
                v[i] += 1
        return v[: len(self.cage.V)]

    def full_edges(self):
        V, F, mir = self.cage.full()
        E = {}
        for fi, f in enumerate(F):
            for k in range(4):
                a, b = f[k], f[(k + 1) % 4]
                E.setdefault((min(a, b), max(a, b)), []).append(fi)
        return V, F, E

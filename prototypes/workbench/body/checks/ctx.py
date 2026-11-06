"""What a check reads: the species file as the cage builder reads it, and for the cage stage the built body, its level-1 proxy mesh and the build summary."""


class Ctx:
    def __init__(self, spec, body=None, summ=None, mesh=None, doc=None, ends=None, stations=None):
        self.spec, self.body, self.summ, self.mesh = spec, body, summ, mesh
        self.stations = stations                                   # the face decal's stations when a sheet hands them in (checks/face.py); else worked out from the file
        self.ends = ends                                           # the extremes stage: one entry per build (checks/extremes.py)
        self.doc = doc if doc is not None else spec              # the file as written (v1); `spec` is it as the cage builder reads it
        self._lv = {}

    @property
    def G(self):
        return self.body.ctx["T"]

    def level(self, n):
        """(V, F, attr, face part) of the cage subdivided n times, once per Ctx."""
        if n not in self._lv:
            import s20p2 as P2
            self._lv[n] = P2.level_arrays(self.body, n)
        return self._lv[n]

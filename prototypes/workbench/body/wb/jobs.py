"""Jobs and the priority queue. Four priorities (P0 the current proxy, P1 plush and cage work, P2 background checks, P3 sheets and exports).
Superseding: when a species file changes, its queued jobs at P0-P2 that were asked for an older hash are cancelled. A running job is left to finish. P3 jobs are never cancelled: they are pinned to the hash they were asked for."""
import itertools
import threading
import time

PRIORITY = {"render": 0, "build": 1, "check": 2, "sheet": 3, "variety": 3, "golden": 3, "sweep": 3, "plush": 1, "warm": 3, "clayclip": 1}
STATES = ("queued", "running", "done", "failed", "superseded")


class Job:
    def __init__(self, jid, species, kind, args, key, priority, spec, spec_hash, actor):
        self.id, self.species, self.kind, self.args, self.key = jid, species, kind, args, key
        self.priority, self.spec, self.spec_hash, self.actor = priority, spec, spec_hash, actor
        self.state = "queued"
        self.result = None
        self.error = None
        self.field = None
        self.cached = False
        self.t_submit = time.time()
        self.t_start = self.t_end = None
        self.progress = None
        self.event = threading.Event()

    def public(self):
        d = dict(id=self.id, species=self.species, kind=self.kind, args=self.args, key=self.key, priority=self.priority, state=self.state, cached=self.cached,
                 spec_hash=self.spec_hash, actor=(self.actor or {}).get("name"), submitted=self.t_submit)
        if self.progress:
            d["progress"] = self.progress
        if self.state == "done":
            d["result"] = self.result
        if self.state in ("failed", "superseded"):
            d["error"], d["field"] = self.error, self.field
        if self.t_start and self.t_end:
            d["ms"] = round((self.t_end - self.t_start) * 1000, 1)
        return d


class JobQueue:
    def __init__(self):
        self.cv = threading.Condition()
        self.items = []
        self.seq = itertools.count(1)
        self.jobs = {}

    def new_id(self):
        return f"j{next(self.seq)}"

    def find_active(self, species, kind, key):
        with self.cv:
            for j in self.jobs.values():
                if j.species == species and j.kind == kind and j.key == key and j.state in ("queued", "running"):
                    return j
        return None

    def add(self, job):
        with self.cv:
            self.jobs[job.id] = job
            if job.state == "queued":
                self.items.append(job)
                self.cv.notify_all()

    def pop(self, kinds, timeout=1.0):
        """The queued job of the best priority (oldest first) among `kinds`; None after `timeout`."""
        end = time.time() + timeout
        with self.cv:
            while True:
                c = [j for j in self.items if j.kind in kinds]
                if c:
                    j = min(c, key=lambda j: (j.priority, int(j.id[1:])))
                    self.items.remove(j)
                    j.state, j.t_start = "running", time.time()
                    return j
                left = end - time.time()
                if left <= 0:
                    return None
                self.cv.wait(left)

    def supersede(self, species, new_hash):
        """Cancel the species' queued P0-P2 jobs for older hashes. Returns them."""
        out = []
        with self.cv:
            for j in list(self.items):
                if j.species == species and j.priority <= 2 and j.spec_hash != new_hash:
                    self.items.remove(j)
                    j.state, j.error, j.t_end = "superseded", "the file changed before this job ran", time.time()
                    j.event.set()
                    out.append(j)
        return out

    def finish(self, job, state, result=None, error=None, field=None):
        with self.cv:
            job.state, job.result, job.error, job.field, job.t_end = state, result, error, field, time.time()
            job.event.set()

    def counts(self):
        with self.cv:
            return {s: sum(1 for j in self.jobs.values() if j.state == s) for s in STATES}

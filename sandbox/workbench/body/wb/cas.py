"""The content-addressed store: <root>/ab/abcdef....<ext>. Writes are atomic (a file in <root>/.tmp, then a rename). Eviction is oldest-first by last use (a hit refreshes the file's time). Never under /tmp: the root is the server's own folder."""
import itertools
import json
import os
import threading

_n = itertools.count()


class Cas:
    def __init__(self, root):
        self.root = os.path.abspath(root)
        os.makedirs(os.path.join(self.root, ".tmp"), exist_ok=True)
        self._lock = threading.Lock()

    def path(self, key, ext):
        if not key or not all(c in "0123456789abcdef" for c in key):
            raise ValueError(f"bad cache key '{key}'")
        return os.path.join(self.root, key[:2], f"{key}.{ext}")

    def tmp(self, ext):
        return os.path.join(self.root, ".tmp", f"{os.getpid()}-{next(_n)}.{ext}")

    def has(self, key, ext, touch=True):
        p = self.path(key, ext)
        ok = os.path.exists(p)
        if ok and touch:
            try:
                os.utime(p)
            except OSError:
                pass
        return ok

    def adopt(self, tmp_path, key, ext):
        """Move a finished temp file into place; returns its final path."""
        p = self.path(key, ext)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        os.replace(tmp_path, p)
        return p

    def put_bytes(self, key, ext, data):
        t = self.tmp(ext)
        with open(t, "wb") as fh:
            fh.write(data)
        return self.adopt(t, key, ext)

    def put_json(self, key, obj):
        return self.put_bytes(key, "json", json.dumps(obj, sort_keys=True).encode())

    def get_json(self, key):
        if not self.has(key, "json"):
            return None
        with open(self.path(key, "json")) as fh:
            return json.load(fh)

    def size(self):
        tot = 0
        for d, _, fs in os.walk(self.root):
            if os.path.basename(d) == ".tmp":
                continue
            tot += sum(os.path.getsize(os.path.join(d, f)) for f in fs)
        return tot

    def evict(self, limit_bytes):
        """Delete the least recently used files until the store is at or under limit_bytes. Returns the number removed."""
        with self._lock:
            files = []
            for d, _, fs in os.walk(self.root):
                if os.path.basename(d) == ".tmp":
                    continue
                for f in fs:
                    p = os.path.join(d, f)
                    st = os.stat(p)
                    files.append((st.st_mtime, st.st_size, p))
            tot = sum(s for _, s, _ in files)
            n = 0
            for _, s, p in sorted(files):
                if tot <= limit_bytes:
                    break
                os.remove(p)
                tot -= s
                n += 1
            return n

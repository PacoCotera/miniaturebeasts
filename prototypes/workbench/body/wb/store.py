"""Species files on disk, the undo log beside each file, and the tokens.
A species id is the file's stem (S20, S20x). The undo log is <file>.undo.jsonl: one JSON line per changed field with who made it (the token's name and role, whether it is an agent, and how: cli, api or a direct file edit)."""
import copy
import datetime
import json
import os
import threading

from wb import hashing as H


class ApiError(Exception):
    def __init__(self, status, message, field=None):
        super().__init__(message)
        self.status, self.message, self.field = status, message, field


def read_spec(path):
    with open(path) as fh:
        return json.load(fh)


def write_spec(path, spec):
    """Atomic write, in the layout S20.json uses (indent 1)."""
    tmp = path + ".wbtmp"
    with open(tmp, "w") as fh:
        json.dump(spec, fh, indent=1, ensure_ascii=False)          # the layout of S20.json: an edit changes only its own lines
    os.replace(tmp, path)


def diff(a, b, path=""):
    """Changed leaves between two JSON values as [(pointer, old, new)]. Lists of different length are one change at the list."""
    if isinstance(a, dict) and isinstance(b, dict):
        out = []
        for k in sorted(set(a) | set(b)):
            p = f"{path}/{str(k).replace('~', '~0').replace('/', '~1')}"
            if k not in a:
                out.append((p, None, b[k]))
            elif k not in b:
                out.append((p, a[k], None))
            else:
                out += diff(a[k], b[k], p)
        return out
    if isinstance(a, list) and isinstance(b, list) and len(a) == len(b):
        out = []
        for i, (x, y) in enumerate(zip(a, b)):
            out += diff(x, y, f"{path}/{i}")
        return out
    return [] if H.canonical(a) == H.canonical(b) else [(path, a, b)]


def pointer_get(doc, ptr):
    cur = doc
    for tok in _tokens(ptr):
        cur = cur[int(tok)] if isinstance(cur, list) else cur[tok]
    return cur


def _tokens(ptr):
    if ptr == "":
        return []
    if not ptr.startswith("/"):
        raise ApiError(400, f"patch path '{ptr}' must start with /", ptr)
    return [t.replace("~1", "/").replace("~0", "~") for t in ptr[1:].split("/")]


# The loft's section table is worked out from its profile knobs (headshape.stations), never edited: a patch of a knob writes the table in the same save, and a patch of the table itself is refused.
KNOBS = "/spine/loft/head_profile"
TABLE = ("/spine/loft/section/stations", "/spine/loft/section/stations_base")


def derived(path):
    """True for the paths a person never writes: the section table. A save's log names the knob, not the sixty rows it moved."""
    return path.startswith("/spine/loft/section/stations")


def derive(doc):
    """The section table from the base table and the knobs, in place."""
    import headshape as HS
    loft = doc["spine"]["loft"]
    sec = loft["section"]
    if "stations_base" in sec and isinstance(loft.get("head_profile"), dict):
        sec["stations"] = HS.stations(sec["stations_base"], **loft["head_profile"])
    return doc


def apply_patch(doc, ops):
    """RFC 6902 subset: replace, add, remove, test. Returns a new document; raises ApiError(400/409) naming the path.
    The section table is derived: a patch of it is refused (it names the knobs), and a patch of a knob writes the table again."""
    doc = copy.deepcopy(doc)
    knob = False
    for op in ops:
        kind, ptr = op.get("op"), op.get("path", "")
        if kind != "test" and ptr.startswith(TABLE):
            raise ApiError(400, "spine.loft.section.stations is worked out from the profile knobs (spine.loft.head_profile) and is never edited; change a knob", ptr)
        knob = knob or (kind != "test" and ptr.startswith(KNOBS))
        toks = _tokens(ptr)
        if not toks:
            raise ApiError(400, "a patch cannot replace the whole file", ptr)
        try:
            parent = doc
            for t in toks[:-1]:
                parent = parent[int(t)] if isinstance(parent, list) else parent[t]
            last = toks[-1]
            if isinstance(parent, list):
                last = len(parent) if (kind == "add" and last == "-") else int(last)
            if kind == "test":
                cur = parent[last]
                if H.canonical(cur) != H.canonical(op["value"]):
                    raise ApiError(409, f"{ptr} is {json.dumps(cur)}, not {json.dumps(op['value'])}: the file changed under you", ptr)
            elif kind == "replace":
                parent[last]
                parent[last] = op["value"]
            elif kind == "add":
                if isinstance(parent, list):
                    parent.insert(last, op["value"])
                else:
                    parent[last] = op["value"]
            elif kind == "remove":
                del parent[last]
            else:
                raise ApiError(400, f"patch op '{kind}' is not supported (replace, add, remove, test)", ptr)
        except (KeyError, IndexError, ValueError, TypeError) as e:
            raise ApiError(400, f"{ptr}: no such field ({type(e).__name__})", ptr)
    if knob:
        derive(doc)
    return doc


def now():
    return datetime.datetime.now(datetime.timezone.utc).astimezone().isoformat(timespec="milliseconds")


class Species:
    def __init__(self, sid, path):
        self.id, self.path = sid, path
        self.spec = None
        self.hash = None
        self.error = None
        self.mtime = None
        self.lock = threading.RLock()
        self.reload()

    @property
    def undo_path(self):
        return self.path + ".undo.jsonl"

    def reload(self):
        """Read the file. Returns True when its canonical hash changed. A file that does not parse keeps the last good spec and sets .error."""
        with self.lock:
            try:
                st = os.stat(self.path)
                spec = read_spec(self.path)
                self.error = None
            except (OSError, ValueError) as e:
                self.error = f"{type(e).__name__}: {e}"
                return False
            self.mtime = st.st_mtime_ns
            h = H.hash_of(spec)
            changed = h != self.hash
            self.spec, self.hash = spec, h
            return changed

    def log(self, entries):
        with open(self.undo_path, "a") as fh:
            for e in entries:
                fh.write(json.dumps(e, sort_keys=True) + "\n")

    def history(self, n=20):
        if not os.path.exists(self.undo_path):
            return []
        with open(self.undo_path) as fh:
            lines = fh.readlines()[-n:]
        return [json.loads(l) for l in lines]

    def entries(self, changes, actor, h0, h1, via):
        t = now()
        return [dict(t=t, actor=actor["name"] if actor else "file", role=actor["role"] if actor else None, agent=bool(actor and actor.get("agent")), via=via, op="replace", path=p, old=o, new=n, hash_before=h0, hash_after=h1) for p, o, n in changes]

    def groups(self):
        """The undo log as saves: the entries one patch wrote (same time and hash) are one save. Returns (all saves in order, the saves that can be undone, the saves that can be redone).
        An edit (api, cli or a file edit) goes on the undo stack and empties the redo stack; an undo moves the save it undid to the redo stack, and a redo moves it back."""
        if not os.path.exists(self.undo_path):
            return [], [], []
        with open(self.undo_path) as fh:
            ents = [json.loads(l) for l in fh if l.strip()]
        saves = []
        for e in ents:
            if saves and saves[-1][0]["t"] == e["t"] and saves[-1][0]["hash_after"] == e["hash_after"]:
                saves[-1].append(e)
            else:
                saves.append([e])
        undo, redo = [], []
        for g in saves:
            via = g[0].get("via")
            if via == "undo" and undo:
                redo.append(undo.pop())
            elif via == "redo" and redo:
                undo.append(redo.pop())
            else:
                undo.append(g)
                redo = []
        return saves, undo, redo

    def can_undo_redo(self):
        _, u, r = self.groups()
        return dict(undo=bool(u), redo=bool(r))

    def revert(self, kind, actor):
        """Undo the last save that is not undone (kind 'undo'), or redo the last one undone ('redo'): the fields go back to the values that save found (or took), as one new save in the log with the actor who asked.
        Each field is tested first: a hand that changed it since is not overwritten (409, naming the field)."""
        with self.lock:
            _, u, r = self.groups()
            stack = u if kind == "undo" else r
            if not stack:
                raise ApiError(409, "nothing to undo" if kind == "undo" else "nothing to redo", None)
            g = stack[-1]
            ops = []
            for e in reversed(g):
                cur, want = (e["new"], e["old"]) if kind == "undo" else (e["old"], e["new"])
                if cur is not None:
                    ops.append(dict(op="test", path=e["path"], value=cur))
                ops.append(dict(op="remove", path=e["path"]) if want is None else dict(op="add" if cur is None else "replace", path=e["path"], value=want))
            return ops

    def patch(self, ops, actor, via="api"):
        """Apply a JSON patch, write the file, log each changed field with the actor. Returns (changes, hash)."""
        with self.lock:
            new = apply_patch(self.spec, ops)
            changes = diff(self.spec, new)
            if not changes:
                return [], self.hash
            changes = [c for c in changes if not derived(c[0])] or changes
            h0, h1 = self.hash, H.hash_of(new)
            write_spec(self.path, new)
            self.spec, self.hash = new, h1
            self.mtime = os.stat(self.path).st_mtime_ns
            self.log(self.entries(changes, actor, h0, h1, via))
            return changes, h1

    def external_edit(self, old):
        """The file changed on disk under us (an editor, an agent): log the changed fields as a direct file edit."""
        with self.lock:
            changes = diff(old, self.spec) if old is not None else []
            if changes:
                self.log(self.entries(changes, None, H.hash_of(old), self.hash, "file"))
            return changes


class Tokens:
    """tokens.json: {token: {name, role: maker|reviewer|owner, agent: bool}}. A missing file is written with one maker token for local use."""
    def __init__(self, path):
        self.path = path
        if not os.path.exists(path):
            with open(path, "w") as fh:
                json.dump({"wb-local-maker": dict(name="local", role="maker", agent=False), "wb-local-agent": dict(name="agent-1", role="maker", agent=True),
                           "wb-local-reviewer": dict(name="reviewer", role="reviewer", agent=False)}, fh, indent=1)
        with open(path) as fh:
            self.map = json.load(fh)

    def who(self, token):
        return self.map.get(token) if token else None

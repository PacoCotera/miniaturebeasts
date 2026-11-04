"""Chunk 12: goldens. A golden is one picture of a species' render set frozen at the file, the framework and the look-dev it was made from, kept in the species' own folder:
  <folder of the species file>/goldens/<id>/<output>/<variant>.png   (the stand's layers and shadow sit under `stand`)
  <folder of the species file>/goldens/<id>/manifest.json           each file's sha256 and pixel hash, the file hash, the framework, the look-dev, the render key, who and when
  <folder of the species file>/goldens/<id>/source.json             the species file as it was, so a diff can name the field that moved the key
Each PNG carries the same hashes in a text chunk, never on the art.
`make` draws the whole set (wb.renderset in its own process, Blender) or takes a finished set folder, writes all of the above and commits it as one commit "<id> goldens at <file hash>".
`diff` re-draws the set into the server's home and compares each picture with its golden: the share of pixels moved by more than 4/255, a heat map, and the field, framework or look-dev that changed the key.
`state` reads only files: each golden is `same` (the key is the one it was made at, or the last diff found no moved pixel), `changed`, `missing` (the set asks for a picture there is no golden of) or `stale` (the key moved and no diff has run on it yet).
Release goldens are the ones made from a signed hash; `diff --release` fails when one has changed."""
import ast
import datetime
import getpass
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BODY not in sys.path:
    sys.path.insert(0, BODY)

import numpy as np

from wb import hashing as H, pngio, renders as RS, store as S

SCHEMA = "goldens-1"
THRESHOLD = 4                         # a pixel has moved when a channel moved by more than this, of 255
BIG = 1_000_000                       # a strip or turnaround above this many bytes sits in the cache; the manifest keeps its hash
GROUPS = dict(stand="Habitat, Sitting", habitat="Habitat, Sitting", incubator="Incubator", resident="Home, Vivarium", sleeper="Nap, sleep", card="Cards, Library", trait="Cards, Library",
              thumb="Roster, Cross", silhouette="Roster, Cross", turn="Review", walk="Review", model="Review")
STATES = ("same", "changed", "missing", "stale")


class GoldenError(Exception):
    pass


# ---------------------------------------------------------------- what the key is made of
def lookdev():
    """The look-dev version: a short hash of the plush look's own settings (material, light, render, small-size scale in plush.py), read from the source so Blender is not needed. A comment or an unrelated edit does not move it."""
    names = {"PLUSH_MATERIAL", "PLUSH_LIGHT", "GAME_LIGHT", "SOFT_RENDER", "SS"}
    with open(os.path.join(BODY, "plush.py")) as fh:
        tree = ast.parse(fh.read())
    parts = [ast.dump(n.value) for n in tree.body if isinstance(n, ast.Assign) and any(getattr(t, "id", None) in names for t in n.targets)]
    return hashlib.sha256("\n".join(parts).encode()).hexdigest()[:8]


def current(spec):
    """The three things a golden is made from, now, and the render key they make."""
    fh, fw, ld = H.hash_of(spec), H.framework_id(), lookdev()
    return dict(file=fh, framework=fw, lookdev=ld, key=H.hash_of("golden", fh, fw, ld))


def golden_dir(species_path, sid):
    return os.path.join(os.path.dirname(os.path.abspath(species_path)), "goldens", sid)


def read_manifest(species_path, sid):
    try:
        with open(os.path.join(golden_dir(species_path, sid), "manifest.json")) as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return None


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for b in iter(lambda: fh.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def pixel_hash(px):
    return hashlib.sha256(np.ascontiguousarray(px, np.uint8).tobytes()).hexdigest()


# ---------------------------------------------------------------- the set as a list of goldens
def label_of(e, looks):
    o, v = e["output"], e["variant"]
    age = e.get("age") or ""
    w = (e.get("size") or [0])[0]
    look = looks.get(e.get("look") or "", e.get("look") or "")
    if o == "stand":
        if e.get("part") == "shadow":
            return f"Shadow · {age}"
        if e.get("part"):
            return f"Layer · {looks.get(e['part'].replace('-erase', ''), e['part'].replace('-erase', '').replace('-', ' ')).lower()}" + (" off" if e["part"].endswith("-erase") else "")
        return f"Stand · {age}"
    return {"resident": f"Resident {w}", "habitat": "Habitat figure" if age == "adult" else f"Habitat figure · {age}", "incubator": "Incubator figure", "sleeper": f"Sleeper {w}", "card": f"Card {w}",
            "trait": f"Trait · {look.lower()}" if look else "Trait pictures", "thumb": f"Thumb {w}", "silhouette": f"Silhouette {w}",
            "turn": f"Turnaround · {e.get('style')} {e.get('az')}°", "walk": "Walk", "model": "Model"}.get(o, o)


def order_key(e):
    """The navigator's order: the groups in the order the game's places run, the outputs in the set's order, the stand's base before its layers and its shadow, the turnaround by angle then style."""
    groups = list(dict.fromkeys(GROUPS.values()))
    outs = list(RS.GAME_V1)
    part = 0 if e["output"] != "stand" or not e.get("part") else (2 if e["part"] == "shadow" else 1)
    return (groups.index(GROUPS.get(e["output"], e["output"])) if e["output"] in GROUPS else 99, outs.index(e["output"]) if e["output"] in outs else 99, e.get("age") or "", part, e.get("az") or 0, e.get("style") or "", e["id"])


def entries_of(spec, setdir):
    """The goldens of a drawn set folder (its manifest.json): id -> entry, with `src`, the file in that folder. The anchor is the calm stand under another name and is not a second picture."""
    with open(os.path.join(setdir, "manifest.json")) as fh:
        m = json.load(fh)
    looks = {e["id"]: e.get("label", e["id"]) for e in (spec.get("expressions") or [])}
    out = {}
    for r in m["rows"]:
        if r.get("alias"):
            continue
        eid = f"{r['output']}/{r['variant']}"
        out[eid] = dict(id=eid, output=r["output"], variant=r["variant"], style=r["style"], age=r["age"], pose=r["pose"], az=r["az"], size=list(r["size"]) if r["size"] else None, kind=r["kind"], look=r.get("look"), src=r["file"])
    for sid_, ages in (m.get("stand_index") or {}).items():
        for age, ent in ages.items():
            for sz, d in ent["sizes"].items():
                for l in d["layers"]:
                    stem = l["file"][:-4]
                    part = "shadow" if l["op"] == "under" else stem.split(sz + "-", 1)[-1]
                    eid = f"stand/{stem.split(sid_ + '-', 1)[-1]}"
                    out[eid] = dict(id=eid, output="stand", variant=eid[6:], style="plush", age=age, pose=ent.get("pose", "calm"), az=32, size=list(l.get("size") or [int(x) for x in sz.split("x")]), kind="layers", part=part, op=l["op"], src=l["file"])
    for e in out.values():
        e["group"] = GROUPS.get(e["output"], e["output"])
        e["label"] = label_of(e, looks)
        e["file"] = f"{e['output']}/{e['variant']}.png"
    return out, m


def expected_ids(spec):
    """The pictures the set asks for now, from the file alone: the ready, non-anchor rows."""
    return [f"{r['output']}/{r['variant']}" for r in RS.expand(spec) if r["state"] == "ready" and not (r["kind"] == "layers" and r["pose"] == "anchor")]


# ---------------------------------------------------------------- drawing
def render_python():
    return os.environ.get("WB_BPY") or sys.executable


def draw(species_path, outdir, py=None, only=None, log=None):
    """The set of the file at `species_path` drawn into `outdir` by wb.renderset in its own process (it needs Blender: WB_BPY names the Blender python, or the running one is used)."""
    os.makedirs(outdir, exist_ok=True)
    env = dict(os.environ, PYTHONPATH=BODY)
    argv = [py or render_python(), "-m", "wb.renderset", os.path.abspath(species_path), outdir] + (["--only", ",".join(only)] if only else [])
    p = subprocess.run(argv, cwd=BODY, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    if p.returncode != 0 or not os.path.exists(os.path.join(outdir, "manifest.json")):
        raise GoldenError(f"the render set failed ({p.returncode}); set WB_BPY to the Blender python\n" + "\n".join(p.stdout.splitlines()[-8:]))
    if log:
        log("rendered " + outdir)
    return outdir


def who():
    return os.environ.get("WB_ACTOR") or os.environ.get("GIT_AUTHOR_NAME") or getpass.getuser()


# ---------------------------------------------------------------- make
def make(species_path, home, setdir=None, release=False, commit=True, actor=None, py=None, log=print):
    """Make the goldens of one species. Returns the manifest. `setdir` is a set folder already drawn (wb.renderset) of this file; without it the set is drawn now. Release goldens come from the release export (the gate), never from here."""
    if release:
        raise GoldenError("release goldens are made by the release export, from the signed file; draft goldens are made here")
    species_path = os.path.abspath(species_path)
    spec = S.read_spec(species_path)
    sid = spec.get("id") or os.path.basename(species_path)[:-5]
    cur = current(spec)
    tmp = None
    if setdir is None:
        os.makedirs(home, exist_ok=True)
        tmp = tempfile.mkdtemp(prefix=f"gold-{sid}-", dir=home)
        setdir = draw(species_path, tmp, py, log=log)
    try:
        ents, setm = entries_of(spec, setdir)
        gone = [i for i in expected_ids(spec) if i not in ents]
        if gone:
            raise GoldenError(f"the drawn set has no picture for {', '.join(gone[:4])}")
        gd = golden_dir(species_path, sid)
        if os.path.isdir(gd):
            shutil.rmtree(gd)                                          # a remake replaces the set whole: no golden outlives its picture
        os.makedirs(gd)
        made = S.now()
        by = actor or who()
        rows = []
        for eid in sorted(ents):
            e = ents[eid]
            px = pngio.read(os.path.join(setdir, e["src"]))
            dst = os.path.join(gd, e["file"])
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            ph = pixel_hash(px)
            pngio.write(dst, px, {"wb-species": sid, "wb-file": cur["file"], "wb-framework": cur["framework"], "wb-lookdev": cur["lookdev"], "wb-key": cur["key"], "wb-id": eid, "wb-pixels": ph})
            row = {k: v for k, v in e.items() if k != "src"}
            row.update(game_name=e["src"], sha256=sha256(dst), pixels=ph, bytes=os.path.getsize(dst), pixel_size=[px.shape[1], px.shape[0]])
            if row["bytes"] > BIG:
                row["cache"] = True                                   # above 1 MB: the cache holds the picture and the manifest its hash
            rows.append(row)
        manifest = dict(schema=SCHEMA, species=sid, set=setm.get("set", RS.BASE), release=False, file_hash=cur["file"], framework=cur["framework"], lookdev=cur["lookdev"], key=cur["key"], made_by=by, made_at=made,
                        stand_index=setm.get("stand_index"), not_yet=setm.get("not_yet", []), entries=rows)
        with open(os.path.join(gd, "manifest.json"), "w") as fh:
            json.dump(manifest, fh, indent=1)
        with open(os.path.join(gd, "source.json"), "w") as fh:
            json.dump(spec, fh, indent=1, ensure_ascii=False)
    finally:
        if tmp:
            shutil.rmtree(tmp, ignore_errors=True)
    manifest["committed"] = git_commit(gd, f"{sid} goldens at {cur['file'][:8]}") if commit else None
    forget_diff(home, sid)
    log(f"{sid}: {len(rows)} goldens at file {cur['file'][:8]}, framework {cur['framework']}, look-dev {cur['lookdev']}" + (f"; commit {manifest['committed'][:9]}" if manifest["committed"] else ""))
    return manifest


def git_commit(path, message):
    """Commit one folder as one commit. Returns the commit id, or None when git is not there or nothing changed."""
    def git(*a):
        return subprocess.run(["git", "-C", path] + list(a), stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if git("rev-parse", "--is-inside-work-tree").returncode != 0:
        return None
    git("add", "-A", "--", ".")
    if git("diff", "--cached", "--quiet", "--", ".").returncode == 0:
        return None
    p = git("commit", "-q", "-m", message, "--", ".")
    if p.returncode != 0:
        raise GoldenError("git commit failed: " + p.stderr.strip())
    return git("rev-parse", "HEAD").stdout.strip()


# ---------------------------------------------------------------- diff
def heat_map(gold, now):
    """(moved mask, max channel difference, heat picture): the golden dimmed to grey under a heat ramp (amber, then red) on every pixel that moved by more than 4/255."""
    g, n = gold.astype(np.int16), now.astype(np.int16)
    d = np.abs(g - n).max(2)
    d[(gold[..., 3] == 0) & (now[..., 3] == 0)] = 0                   # two clear pixels are the same pixel, whatever their hidden colour
    moved = d > THRESHOLD
    a = gold[..., 3:4].astype(np.float32) / 255
    lum = (gold[..., :3].astype(np.float32) @ np.array([0.3, 0.59, 0.11], np.float32))[..., None]
    base = 244 * (1 - a) + lum * a
    base = 236 - (236 - base) * 0.45                                  # pale grey: the art stays readable, the heat reads over it
    pic = np.repeat(base, 3, axis=2)
    t = np.clip((d - THRESHOLD) / 80.0, 0, 1)[..., None]
    ramp = np.array([255, 196, 64], np.float32) * (1 - t) + np.array([205, 40, 38], np.float32) * t
    pic = np.where(moved[..., None], ramp, pic)
    return moved, d, np.concatenate([np.clip(pic + 0.5, 0, 255).astype(np.uint8), np.full(d.shape + (1,), 255, np.uint8)], 2)


def compare(gold, now):
    """One golden against its picture now: state, share of pixels moved, the largest channel move, and the heat picture (None when the sizes differ)."""
    if gold.shape != now.shape:
        return dict(state="changed", pct=100.0, maxdiff=255, moved=int(gold.shape[0] * gold.shape[1]), same_size=False), None
    moved, d, heat = heat_map(gold, now)
    n = int(moved.sum())
    return dict(state="changed" if n else "same", pct=round(100.0 * n / moved.size, 3), maxdiff=int(d.max()), moved=n, same_size=True, exact=bool((gold == now).all())), heat if n else None


def diffs_path(home):
    return os.path.join(home, "golden-diffs.json")


def read_diffs(home):
    try:
        with open(diffs_path(home)) as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return {}


def write_diffs(home, allr):
    os.makedirs(home, exist_ok=True)
    tmp = diffs_path(home) + f".{os.getpid()}.tmp"
    with open(tmp, "w") as fh:
        json.dump(allr, fh)
    os.replace(tmp, diffs_path(home))


def forget_diff(home, sid):
    allr = read_diffs(home)
    if allr.pop(sid, None) is not None:
        write_diffs(home, allr)


def put_png(cas, path_or_arr):
    """A picture into the cache by its content hash; returns the key."""
    if isinstance(path_or_arr, str):
        with open(path_or_arr, "rb") as fh:
            data = fh.read()
    else:
        t = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        t.close()
        pngio.write(t.name, path_or_arr)
        with open(t.name, "rb") as fh:
            data = fh.read()
        os.remove(t.name)
    key = hashlib.sha256(data).hexdigest()
    if not cas.has(key, "png"):
        cas.put_bytes(key, "png", data)
    return key


def diff(species_path, home, cas, only=None, setdir=None, py=None, log=print):
    """Re-draw the set of the file as it is now and compare every golden with it. The result is kept in the server's home, under the key it was drawn at (a new key forgets the last). Returns the state."""
    species_path = os.path.abspath(species_path)
    spec = S.read_spec(species_path)
    sid = spec.get("id") or os.path.basename(species_path)[:-5]
    man = read_manifest(species_path, sid)
    if man is None:
        raise GoldenError(f"{sid} has no goldens yet: wb golden make {sid}")
    cur = current(spec)
    gd = golden_dir(species_path, sid)
    tmp = None
    if setdir is None:
        os.makedirs(home, exist_ok=True)
        tmp = tempfile.mkdtemp(prefix=f"gnow-{sid}-", dir=home)
        want = sorted({e["output"] for e in man["entries"] if (not only or e["id"] in only or e["output"] in only)}) if only else None
        setdir = draw(species_path, tmp, py, only=want, log=log)
    try:
        ents, _ = entries_of(spec, setdir)
        res = {}
        for e in man["entries"]:
            if only and e["id"] not in only and e["output"] not in only:
                continue
            now = ents.get(e["id"])
            if now is None:
                res[e["id"]] = dict(state="missing")
                continue
            gold = pngio.read(os.path.join(gd, e["file"]))
            px = pngio.read(os.path.join(setdir, now["src"]))
            r, heat = compare(gold, px)
            r["now"] = put_png(cas, px)
            if heat is not None:
                r["heat"] = put_png(cas, heat)
            res[e["id"]] = r
    finally:
        if tmp:
            shutil.rmtree(tmp, ignore_errors=True)
    allr = read_diffs(home)
    prev = allr.get(sid) if (allr.get(sid) or {}).get("key") == cur["key"] else None
    entries = dict((prev or {}).get("entries", {}), **res)
    allr[sid] = dict(key=cur["key"], at=S.now(), by=who(), entries=entries)
    write_diffs(home, allr)
    log(f"{sid}: " + ", ".join(f"{n} {s}" for s in ("same", "changed", "missing") if (n := sum(1 for v in res.values() if v["state"] == s))))
    return state(species_path, home)


# ---------------------------------------------------------------- state (files only)
def dotted(ptr):
    return ".".join(t.replace("~1", "/").replace("~0", "~") for t in ptr.split("/") if t != "")


def causes(spec, man, source, history=()):
    """What moved the key since the golden was made: the file's fields (old and new value, who and when from the undo log), the framework, the look-dev."""
    cur = current(spec)
    out = []
    if cur["file"] != man["file_hash"] and source is not None:
        for ptr, old, new in S.diff(source, spec)[:6]:
            h = next((x for x in reversed(history) if x["path"] == ptr), None)
            out.append(dict(kind="file", field=dotted(ptr), old=old, new=new, by=h["actor"] if h else None, at=h["t"] if h else None))
    elif cur["file"] != man["file_hash"]:
        out.append(dict(kind="file", field=None, old=None, new=None, by=None, at=None))
    if cur["framework"] != man["framework"]:
        out.append(dict(kind="framework", old=man["framework"], new=cur["framework"]))
    if cur["lookdev"] != man["lookdev"]:
        out.append(dict(kind="lookdev", old=man["lookdev"], new=cur["lookdev"]))
    return out


def state(species_path, home, history=()):
    """Every golden with its state, the totals, the stamp and what moved the key. Reads files only: no build, no render."""
    species_path = os.path.abspath(species_path)
    spec = S.read_spec(species_path)
    sid = spec.get("id") or os.path.basename(species_path)[:-5]
    man = read_manifest(species_path, sid)
    cur = current(spec)
    expected = expected_ids(spec)
    base = dict(species=sid, current=cur, release=bool(man and man.get("release")), have=man is not None)
    if man is None:
        rows = [dict(id=i, state="missing") for i in expected]
        return dict(base, entries=rows, totals=totals(rows), stamp=None, causes=[], diffed=None)
    d = read_diffs(home).get(sid)
    d = d if d and d.get("key") == cur["key"] else None
    try:
        with open(os.path.join(golden_dir(species_path, sid), "source.json")) as fh:
            source = json.load(fh)
    except (OSError, ValueError):
        source = None
    rows, have = [], {e["id"] for e in man["entries"]}
    for e in man["entries"]:
        row = {k: e.get(k) for k in ("id", "output", "variant", "style", "age", "pose", "az", "size", "kind", "group", "label", "file", "sha256", "pixels", "part")}
        if cur["key"] == man["key"]:
            row["state"] = "same"
        elif d and e["id"] in d["entries"]:
            r = d["entries"][e["id"]]
            row.update(state=r["state"], **{k: r[k] for k in ("pct", "maxdiff", "now", "heat") if k in r})
        else:
            row["state"] = "stale"
        rows.append(row)
    rows.sort(key=lambda r: order_key(r))
    rows += [dict(id=i, state="missing") for i in expected if i not in have]
    return dict(base, entries=rows, totals=totals(rows), causes=causes(spec, man, source, history) if cur["key"] != man["key"] else [], diffed=d and dict(at=d["at"], by=d.get("by")),
                stamp=dict(file=man["file_hash"], framework=man["framework"], lookdev=man["lookdev"], key=man["key"], made_by=man["made_by"], made_at=man["made_at"], set=man.get("set")))


def totals(rows):
    t = {s: sum(1 for r in rows if r["state"] == s) for s in STATES}
    t["all"] = len(rows)
    return t


def line(t):
    """The totals as one quiet line: 58 same · 1 changed · 2 stale (a state with none is left out)."""
    return " · ".join(f"{t[s]} {s}" for s in STATES if t[s]) or "no goldens"


# ---------------------------------------------------------------- framework commits
def framework_touched(paths):
    """True when any of these repository paths is framework source: a .py file directly in the body folder (the files framework_id hashes), not the workbench's own wb/ or the tests."""
    for p in paths:
        parts = p.replace("\\", "/").split("/")
        if "body" in parts:
            rest = parts[parts.index("body") + 1:]
            if len(rest) == 1 and rest[0].endswith(".py"):
                return True
    return False

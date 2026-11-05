"""The export: one pipe from a species file to what leaves the workbench. It needs the render python (numpy and Blender; WB_BPY names it for the server).
    python -m wb.export SPECIES.json OUTDIR [--release] [--no-stands]
A review export writes, next to each other: `<id>.glb` (skinned mesh, coat textures, every clip; parts, clips, counts, bones and the build stamp in `asset.extras`), `viewer.html` (body/viewer.py: the page that opens the glb),
`creature.json` (the type, every number resolved), `frame/species-<id>.json` (the game frame, a draft), `stands/` (the layered stands the render set names, with their index) and `manifest.json` (every file, its size and sha256, the stamp).
A review export is always allowed: the checks that fail are written into the glb and the viewer's label. A release export is refused with every reason, and writes nothing, until the checks pass or are waived, the frame uses only rules
the game reads, and the gate is signed (the gate arrives in a later chunk, so nothing is signed yet)."""
import argparse
import datetime
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

SCHEMA = "mb-export/1"
FRAME_SPECIES = ("S20",)               # the frame writer's pod colours, summary and glyph are written for these species; another species' frame waits until they come from its file
FRAME_OWED = "the frame writer's pod colours, summary and glyph are written for S20 only"
VERSION = "export-1"                   # part of the job's key: a change of the pipe makes a new export


class ExportRefused(Exception):
    """The export may not be made; `.reasons` lists why, one line each."""
    def __init__(self, reasons):
        super().__init__("; ".join(reasons))
        self.reasons = list(reasons)


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def gate_signed(spec):
    """Whether both signatures are on the file's current round. The gate is a later chunk: nothing can be signed yet."""
    return False


def waived(spec, row):
    return any(w.get("check") == row["id"] for w in (spec.get("waivers") or []))


def failing(spec, rows):
    return [r for r in rows if r["state"] == "fail" and not waived(spec, r)]


def release_blockers(spec, rows):
    """Every reason a release export is refused, one line each (empty when it may go)."""
    from wb import frame_writer as FW
    out = [f"{r['measure']} ({r['value']}, limit {r['limit']})" if r.get("limit") not in (None, "", r.get("value")) else str(r["measure"]) for r in failing(spec, rows)]
    out += FW.uses_new_rules(spec)
    if not gate_signed(spec):
        out.append("gate not signed")
    return out


def stamp_of(file_hash):
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-6)))
    try:
        import zoneinfo
        now = datetime.datetime.now(zoneinfo.ZoneInfo("America/Mexico_City"))
    except Exception:
        pass
    sh = lambda *a: subprocess.run(["git", "-C", BODY] + list(a), capture_output=True, text=True).stdout.strip()
    commit = sh("rev-parse", "--short", "HEAD")
    dirty = sh("status", "--porcelain", "--untracked-files=no") != ""
    return f"built {now.strftime('%a')} {now.day} {now.strftime('%b %H:%M')} Mexico City · {commit}{'+wip' if dirty else ''} · file {file_hash[:8]}"


def write_glb(subject, path, extras):
    """The glb of a subject by its plan. The biped's writer reads the cage body, its rig and the baked coat; a plan without a writer is refused."""
    if getattr(subject, "quad", False):
        raise ExportRefused(["no model export yet"])
    import s20glb
    import s20pipe as PP
    import s20rig
    import s20tex as TX
    b, c = subject.b, subject.c
    level = TX.SHIP_LEVEL
    tex = PP.make_tex(b, c["coat"])
    M = TX.render_mesh(b, level)
    return s20glb.build(b, s20rig.Rig(b.ctx), M, tex, path, extras=dict(extras, level=level))


def make(species_path, outdir, release=False, stands=True, log=print):
    """Write the export of the species file at `species_path` into `outdir`; returns the manifest. Raises ExportRefused (writing nothing) when a release is not allowed."""
    from wb import facade as F, frame_writer as FW, renderset as RSET, renders as RS, store as S, golden as G
    t0 = time.time()
    species_path = os.path.abspath(species_path)
    spec = S.read_spec(species_path)
    sid = spec.get("id") or os.path.basename(species_path)[:-5]
    file_hash = G.current(spec)["file"]
    if F.is_quadruped(spec):
        raise ExportRefused(["no model export yet"])                        # the quadruped has no coat and no glb writer yet
    rows = F.check_rows(spec)
    fails = failing(spec, rows)
    if release:
        why = release_blockers(spec, rows)
        if why:
            raise ExportRefused(why)
    os.makedirs(outdir, exist_ok=True)
    scratch = tempfile.mkdtemp(prefix=f"export-{sid}-")
    files = []
    try:
        subject = RSET.make_subject(spec, "type", scratch)
        if getattr(subject, "quad", False):
            raise ExportRefused(["no model export yet"])
        stamp = stamp_of(file_hash)
        extras = dict(species=dict(id=sid, name=spec.get("name") or sid), build=stamp, review=dict(failing=[r["measure"] for r in fails], waived=[w.get("check") for w in (spec.get("waivers") or [])], checks=len(rows)),
                      digest=hashlib.sha256(json.dumps(subject.c, sort_keys=True, default=str).encode()).hexdigest()[:16])
        glb = os.path.join(outdir, f"{sid}.glb")
        g = write_glb(subject, glb, extras)
        log(f"glb {g['bytes']} bytes, {len(g['clips'])} clips, {len(g['parts'])} parts; {time.time() - t0:.0f} s")
        files.append(glb)
        viewer = os.path.join(outdir, "viewer.html")
        subprocess.run([sys.executable, os.path.join(BODY, "viewer.py"), glb, viewer], check=True, stdout=subprocess.DEVNULL)
        files.append(viewer)
        cj = os.path.join(outdir, "creature.json")
        with open(cj, "w") as fh:
            json.dump(dict(subject.c, species=sid), fh, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
        files.append(cj)
        owed = []
        if sid in FRAME_SPECIES:
            fd = os.path.join(outdir, "frame")
            os.makedirs(fd, exist_ok=True)
            try:
                frame, fpath = FW.write(spec, os.path.join(fd, f"species-{sid}.json"), samples=0, draft=not release)
                files.append(fpath)
                log("game frame written (a draft: its viability block is not run)")
            except FW.Refused as e:
                raise ExportRefused([str(e)])
        else:
            owed.append(dict(file="frame", reason=FRAME_OWED))
            log("game frame owed: " + FRAME_OWED)
        stand_index = None
        if stands:
            sd = os.path.join(outdir, "stands")
            if os.path.isdir(sd):
                shutil.rmtree(sd)
            os.makedirs(sd)
            idx = {sid: {}}
            for r in RS.expand(spec):
                if r["kind"] != "layers" or r["state"] != "ready" or r["pose"] == "anchor" or r["style"] != "plush":
                    continue
                entry, *_ = RSET.stand(spec, subject, sd, scratch, sid, r["age"], r["pose"], log)
                idx[sid].setdefault(r["age"], entry)
            ip = os.path.join(sd, "index.json")
            with open(ip, "w") as fh:
                json.dump(idx, fh, indent=1)
            stand_index = idx
            files += [os.path.join(sd, n) for n in sorted(os.listdir(sd))]
    finally:
        shutil.rmtree(scratch, ignore_errors=True)
    rows_out = [dict(name=os.path.relpath(p, outdir), bytes=os.path.getsize(p), sha256=sha256(p)) for p in files]
    from wb import hashing as H
    man = dict(schema=SCHEMA, species=sid, mode="release" if release else "review", file_hash=file_hash, framework=H.framework_id(), build=stamp, made_at=datetime.datetime.now().isoformat(timespec="seconds"),
               checks=dict(rows=len(rows), failing=[r["measure"] for r in fails]), owed=owed, files=rows_out, stands=stand_index, seconds=round(time.time() - t0, 1))
    with open(os.path.join(outdir, "manifest.json"), "w") as fh:
        json.dump(man, fh, indent=1)
    log(f"{sid}: {len(rows_out)} files in {outdir}; {time.time() - t0:.0f} s")
    return man


def main(argv=None):
    ap = argparse.ArgumentParser(prog="python -m wb.export")
    ap.add_argument("species")
    ap.add_argument("out")
    ap.add_argument("--release", action="store_true")
    ap.add_argument("--no-stands", action="store_true")
    ap.add_argument("--blockers", action="store_true", help="only say whether a release is refused and why; write nothing")
    a = ap.parse_args(argv)
    if a.blockers:
        from wb import facade as F, store as S
        spec = S.read_spec(a.species)
        why = release_blockers(spec, F.check_rows(spec)) if a.release else []
        print(json.dumps(dict(refused=bool(why), reasons=why)))
        return 3 if why else 0
    try:
        m = make(a.species, a.out, release=a.release, stands=not a.no_stands)
    except ExportRefused as e:
        print(json.dumps(dict(refused=True, reasons=e.reasons)))
        return 3
    print(json.dumps(dict(refused=False, manifest=os.path.join(os.path.abspath(a.out), "manifest.json"))))
    return 0


if __name__ == "__main__":
    sys.exit(main())

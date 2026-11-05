"""wb: the command line. A thin client of the job server's HTTP API (standard library only, so it runs under any python3).
Every command takes --json and prints one JSON object. Exit codes: 0 done and passing; 1 a check failed; 2 build or validation error (with the field); 3 still running at the --wait timeout; 4 refused by role (or no token).
Server: WB_URL, else the server.json in WB_HOME (default ~/studio/home). Token: WB_TOKEN."""
import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOME = os.environ.get("WB_HOME") or os.path.join(os.path.expanduser("~"), "studio", "home")          # the studio's persistent home: the content-addressed cache (the warm set lives in it), the tokens and the logs
EXIT = dict(ok=0, check_failed=1, error=2, timeout=3, refused=4)


class Fail(Exception):
    def __init__(self, code, message, field=None, extra=None):
        super().__init__(message)
        self.code, self.message, self.field, self.extra = code, message, field, extra or {}


def server_url():
    if os.environ.get("WB_URL"):
        return os.environ["WB_URL"].rstrip("/")
    try:
        with open(os.path.join(HOME, "server.json")) as fh:
            return json.load(fh)["url"]
    except (OSError, ValueError, KeyError):
        raise Fail(2, f"no server found (start one with `wb serve`, or set WB_URL); looked for {os.path.join(HOME, 'server.json')}")


def call(method, path, body=None, timeout=60):
    req = urllib.request.Request(server_url() + path, method=method, data=None if body is None else json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    if os.environ.get("WB_TOKEN"):
        req.add_header("Authorization", "Bearer " + os.environ["WB_TOKEN"])
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        try:
            d = json.load(e)
        except ValueError:
            d = {}
        msg = d.get("error", f"HTTP {e.code}")
        code = 4 if e.code in (401, 403) else 2
        raise Fail(code, msg, d.get("field"), dict(status=e.code, body=d))
    except urllib.error.URLError as e:
        raise Fail(2, f"cannot reach the server: {e.reason}")


def resolve_path(doc, dotted):
    """'spine.tail.length' -> (JSON pointer, current value). A list element is picked by position, or by its id, name or joint, which may itself hold dots ('parts.leg.L.chain.1.len': the part 'leg.L')."""
    ptr, cur = "", doc
    toks = dotted.split(".")
    i = 0
    while i < len(toks):
        tok = toks[i]
        if isinstance(cur, list):
            if tok.isdigit() and int(tok) < len(cur):
                k, i = int(tok), i + 1
            else:
                k = None
                for n in (3, 2, 1):                                   # the longest dotted name first
                    name = ".".join(toks[i:i + n])
                    hit = [j for j, v in enumerate(cur) if isinstance(v, dict) and name in (v.get("id"), v.get("name"), v.get("joint"), v.get("locus"))]
                    if hit:
                        k, i = hit[0], i + n
                        break
                if k is None:
                    names = [str(v.get("id") or v.get("name") or v.get("joint") or v.get("locus")) for v in cur if isinstance(v, dict)]
                    raise Fail(2, f"{dotted}: no list element '{tok}' (have: {', '.join(names[:8])})", dotted)
            cur, ptr = cur[k], f"{ptr}/{k}"
        elif isinstance(cur, dict):
            if tok not in cur:
                raise Fail(2, f"{dotted}: no field '{tok}' (have: {', '.join(list(cur)[:8])})", dotted)
            cur, ptr = cur[tok], f"{ptr}/{tok.replace('~', '~0').replace('/', '~1')}"
            i += 1
        else:
            raise Fail(2, f"{dotted}: '{tok}' is inside a value that has no fields", dotted)
    return ptr, cur


def wait_job(job, timeout):
    end = time.time() + timeout
    while job["state"] in ("queued", "running"):
        left = end - time.time()
        if left <= 0:
            raise Fail(3, f"job {job['id']} is still {job['state']} after {timeout:.0f} s", extra=dict(job=job))
        job = call("GET", f"/api/jobs/{job['id']}?wait={min(left, 20):.1f}", timeout=left + 30)
    if job["state"] != "done":
        raise Fail(2, job.get("error") or job["state"], job.get("field"), dict(job=job))
    return job


def run_job(a, kind, args, wait=True):
    job = call("POST", f"/api/species/{a.species}/jobs", dict(kind=kind, args=args))
    if wait:
        job = wait_job(job, a.timeout)
    return job


def out(a, obj, text):
    print(json.dumps(obj) if a.json else text)


def view_lines(res):
    lines = []
    for v in res.get("views", []):
        tag = "cache hit" if v["cached"] else f"{v['ms']:.0f} ms"
        lines.append(f"{v['mode']:6} az {v['az']:>3} {v['size']:>3}px  {tag:10} {v['path']}")
    return lines


def cage_line(c):
    return f"cage {c['cage_hash'][:12]}  {c['vertices']} vertices (cage), {c.get('vertices_l1')} level-1  " + ("from the cache" if c["cached"] else f"built in {c['timings_ms']['total'] / 1000:.1f} s")


def cmd_build(a):
    j = run_job(a, "build", dict(genome=a.genome))
    c = j["result"]["cage"]
    out(a, dict(ok=True, species=a.species, cage=c, job=j["id"], cached=j["cached"]), f"{a.species} {cage_line(c)}")
    return 0


def cmd_render(a):
    if a.sheet:
        j = run_job(a, "sheet", dict(genome=a.genome), wait=True)
        r = j["result"]
        lines = view_lines(r) + [f"sheet {r['path']}", cage_line(r["cage"]) + f"  views from cache: {r['cache'].get('views_hit', 0)}/{r['cache'].get('views_total', len(r['views']))}" + ("  (whole sheet from the cache)" if r["cache"].get("job_hit") else "")]
        out(a, dict(ok=True, species=a.species, sheet=r["path"], html=r["html"], cage=r["cage"], views=r["views"], cache=r["cache"], job=j["id"]), "\n".join(lines))
        return 0
    j = run_job(a, "render", dict(genome=a.genome, modes=a.mode.split(",") if a.mode != "all" else "all", az=[int(x) for x in a.az.split(",")], sizes=[int(x) for x in a.size.split(",")]), wait=a.wait)
    if j["state"] in ("queued", "running"):
        out(a, dict(ok=True, species=a.species, job=j["id"], state=j["state"], key=j["key"]), f"queued {j['id']} (key {j['key'][:12]}); wb watch {a.species} to follow it")
        return 0
    r = j["result"]
    out(a, dict(ok=True, species=a.species, cage=r["cage"], views=r["views"], cache=r["cache"], job=j["id"]), "\n".join(view_lines(r) + [cage_line(r["cage"])]))
    return 0


def cmd_set(a):
    sp = call("GET", f"/api/species/{a.species}")
    ptr, cur = resolve_path(sp["file"], a.path)
    try:
        new = json.loads(a.value)
    except ValueError:
        new = a.value
    res = call("PATCH", f"/api/species/{a.species}", [dict(op="test", path=ptr, value=cur), dict(op="replace", path=ptr, value=new)])
    ch = res["changed"]
    text = f"changed {a.path} {json.dumps(cur)} -> {json.dumps(new)}" if ch else f"{a.path} is already {json.dumps(cur)}"
    out(a, dict(ok=True, species=a.species, path=a.path, pointer=ptr, old=cur, new=new, changed=ch, hash=res["hash"], touches=res["touches"]), text)
    return 0


def cmd_convert(a):
    sys.path.insert(0, BODY)
    import species_v1 as V1
    with open(a.src) as fh:
        d = json.load(fh)
    doc = V1.from_internal(d)
    errs = V1.validate(doc)
    if errs:
        raise Fail(2, errs[0][1], errs[0][0])
    dst = a.out or a.src.rsplit(".json", 1)[0] + ".v1.json"
    with open(dst, "w") as fh:
        json.dump(doc, fh, indent=1, ensure_ascii=False)
    out(a, dict(ok=True, src=a.src, out=dst, schema=V1.SCHEMA_ID), f"{a.src} -> {dst} ({V1.SCHEMA_ID})")
    return 0


def validate_file(a):
    """Offline: every problem of a file, one line each, naming the field. Exit 2 when there is one."""
    sys.path.insert(0, BODY)
    import species_v1 as V1
    try:
        with open(a.file) as fh:
            doc = json.load(fh)
    except (OSError, ValueError) as e:
        raise Fail(2, f"{a.file}: {e}")
    errs = V1.validate(doc)
    out(a, dict(ok=not errs, file=a.file, errors=[dict(field=p, message=m) for p, m in errs]), "\n".join(f"FAIL  {m}" for p, m in errs) or f"{a.file}: valid {V1.SCHEMA_ID}")
    return 2 if errs else 0


def cmd_validate(a):
    if a.file:
        return validate_file(a)
    j = run_job(a, "check", dict(stage="file"))
    r = j["result"]
    lines = [f"{'PASS' if x['state'] == 'pass' else 'FAIL'}  {x['id']:12} {x['value']}" + (f"   [{x['field']}]" if x.get("field") else "") for x in r["rows"]]
    out(a, dict(ok=not r["fail"], species=a.species, stage="file", rows=r["rows"], fail=r["fail"], passed=r["passed"]), "\n".join(lines))
    return 1 if r["fail"] else 0


def cmd_new(a):
    """wb new S23 --plan quadruped --from template: a new species file from the plan's template (offline), then the bare base's checks, one line each. Writes ID.json in --out (the current folder)."""
    sys.path.insert(0, BODY)
    import species_v1 as V1
    from wb import store as S
    if a.source != "template":
        raise Fail(2, f"--from {a.source}: only `template` for now. To start from a species or a mibi, use New species in the studio.", "from")
    try:
        doc = V1.new_from_template(a.species, a.plan)
    except ValueError as e:
        raise Fail(2, str(e), "plan" if "plan" in str(e) else "species")
    path = os.path.join(a.out or ".", f"{a.species}.json")
    if os.path.exists(path):
        raise Fail(2, f"{path} is already there. wb new never writes over a file.", "species")
    errs = V1.validate(doc)
    if errs:
        raise Fail(2, errs[0][1], errs[0][0])
    S.write_spec(path, doc)
    try:
        from wb import facade as F
        rows = F.check_rows(doc)
    except ImportError:
        rows = None                                              # the checks need numpy and the framework's modules: `wb check` on a server does them anywhere
    bad = [r for r in (rows or []) if r["state"] != "pass"]
    fix = ", ".join(r["id"] for r in bad)
    last = [] if rows is None else [f"All {len(rows)} checks pass." if not bad else f"{len(bad)} to fix: {fix}. `wb check {a.species}` shows the proofs."]
    lines = [f"{path} \u00b7 new species from the {a.plan} template"] + ([f"{'PASS' if r['state'] == 'pass' else r['state'].upper():5} {r['id']:11} {r['measure']}" for r in rows] + last if rows is not None else [f"Checks not run: numpy is missing here. Run `wb check {a.species}` on a server."])
    out(a, dict(ok=not bad, file=path, plan=a.plan, rows=[dict(id=r["id"], state=r["state"], value=r["value"], limit=r["limit"], measure=r["measure"]) for r in rows or []]), "\n".join(lines))
    return 1 if bad else 0


STAGES = ("file", "cage", "extremes", "rig", "coat", "all")


def unit_text(v, unit):
    return f"{v:g}{unit}" if unit in ("×", "°", "") or not isinstance(v, (int, float)) else f"{v:g} {unit}"


def check_rows(a, job):
    """The rows of a finished check job with the owner's words and the proof pictures' paths (waits for the pictures when --wait). The extremes stage's rows and ends are read back from the species answer, where the pictures' paths are filled in."""
    metas = {m["id"]: m for m in call("GET", "/api/checks")}
    rows = job["result"]["rows"]
    ext = job["result"].get("stage") == "extremes"
    end = time.time() + 90
    while a.wait and any(r.get("proof") and not r["proof"].get("ready") for r in rows + (job["result"].get("ends") or [])) and time.time() < end:
        time.sleep(0.5)
        sp = call("GET", f"/api/species/{a.species}")
        cur = sp.get("extremes") if ext else sp.get("checks")
        if cur and cur.get("fresh"):
            rows = cur["rows"]
            if ext:
                job["result"]["ends"] = cur["ends"]
    out = []
    for r in rows:
        m = metas.get(r["id"], {})
        out.append(dict(id=r["id"], name=m.get("name"), state=r["state"], value=r["value"], limit=r["limit"], measure=r["measure"], words=(m.get("rule") or {}).get("words"), rule_date=(m.get("rule") or {}).get("date"),
                        stage=r["stage"], proof=(r.get("proof") or {}).get("path"), fail_line=(r.get("extra") or {}).get("fail") or m.get("fail")))
    return out


def cmd_check(a):
    args = dict(stage=a.stage, genome=a.genome)
    if getattr(a, "locus", None):
        args["loci"] = a.locus
    j = run_job(a, "check", args, wait=a.wait)
    if j["state"] in ("queued", "running"):
        out(a, dict(ok=True, species=a.species, job=j["id"], state=j["state"], key=j["key"]), f"queued {j['id']} (key {j['key'][:12]}); wb check {a.species} --wait to see the rows")
        return 0
    rows = check_rows(a, j)
    fails = [r for r in rows if r["state"] == "fail"]
    warns = [r for r in rows if r["state"] == "warn"]
    lines = []
    for r in rows:
        tag = {"pass": "PASS", "warn": "WARN", "fail": "FAIL"}[r["state"]]
        head = f"{tag}  {r['id']:12} {str(r['value']):>8} / {str(r['limit']):<8} {r['measure']}"
        lines.append(head)
        if r["state"] != "pass":
            lines.append(f"      {r['fail_line']}  ·  owner, {r['rule_date']}: {r['words']}")
        if r["proof"]:
            lines.append(f"      proof {r['proof']}")
    ends = j["result"].get("ends") or []
    bad_ends = [e for e in ends if e["state"] == "fail"]
    for e in bad_ends:
        f0 = e["fails"][0]
        lines.append(f"      {e['locus'] or e['id']} {e['end']} {unit_text(e['value'], e.get('unit') or '')}: {f0['fail'] or f0['id']} ({f0['measure']})")
        if e.get("fix"):
            lines.append(f"      Set limit to {e['fix']['value']:g}:  wb set {a.species} {e['fix']['path']} {e['fix']['value']:g}")
        if (e.get("proof") or {}).get("path"):
            lines.append(f"      proof {e['proof']['path']}")
    if ends:
        lines.append(f"{len(ends)} ends and corners · {len({e['cage'] for e in ends})} distinct cages · {len(bad_ends)} fail")
    lines.append(f"{len(rows) - len(fails) - len(warns)} pass · {len(warns)} warn · {len(fails)} fail")
    extra = dict(ends=[dict(id=e["id"], locus=e["locus"], end=e["end"], value=e["value"], state=e["state"], fails=e["fails"], fix=e.get("fix"), proof=(e.get("proof") or {}).get("path")) for e in ends]) if ends else {}
    out(a, dict(ok=not fails, species=a.species, stage=a.stage, rows=rows, fail=fails, warn=warns, passed=len(rows) - len(fails) - len(warns), job=j["id"], cached=j["cached"], **extra), "\n".join(lines))
    return 1 if fails else 0


def cmd_freq(a):
    """How often each look shows, wild / this sheet / a cross, by life stage (spec 4.2). --file reads a species file offline; otherwise the server's species."""
    if a.file:
        sys.path.insert(0, BODY)
        import expressions as X
        try:
            with open(a.file) as fh:
                doc = json.load(fh)
            res = X.freq(doc["genome"], doc.get("expressions") or [], a.n, doc_id=doc.get("id"))
        except (OSError, ValueError, KeyError) as e:
            raise Fail(2, f"{a.file}: {e}")
        res["species"] = doc.get("id")
    else:
        res = call("GET", f"/api/species/{a.species}/freq?n={a.n}")
    lines = [f"{res['species']}  wild {res['n']['wild']} · sheet {res['n']['sheet']} · cross {res['n']['cross']}   (percent of mibis)"]
    groups = [g for g in ("wild", "sheet", "cross") if res["n"][g]]
    for i, x in res["expressions"].items():
        lines.append(f"{x['label']}  ({x['locus']} {x['look']}{', from ' + x['age'] if x['age'] else ''}{', needs ' + ' and '.join(n['locus'] + ' ' + str(n.get('is') or '/'.join(n['in'])) for n in x['needs']) if x['needs'] else ''})")
        for g in groups:
            lines.append(f"    {g:6} " + "  ".join(f"{st} {v:g}" for st, v in x[g].items()))
    if a.locus:
        for l in a.locus:
            r = res["loci"].get(l)
            if not r:
                raise Fail(2, f"no pair, switch or named blend locus '{l}' in the file", "locus")
            lines.append(f"{l}  ({r['rule_words']}{', modifier ' + ', '.join(r['modifiers']) if r['modifiers'] else ''})")
            for g in groups:
                lines.append(f"    {g:6} " + "  ".join(f"{k} {v:g}" for k, v in r[g].items()))
    out(a, dict(ok=True, **res), "\n".join(lines))
    return 0


def cmd_renders(a):
    """The render set of the file: every picture the game asks for with its size, style and state (ready, or owed with the reason). --make DIR draws the ready ones with Blender (plush, clay, silhouette, the layered stand, the sprites made from the master)."""
    r = call("GET", f"/api/species/{a.species}/renders")
    lines = [f"{a.species}  {r['base']}  {r['ready']} ready, {r['owed']} owed"]
    for x in r["rows"]:
        sz = "x".join(map(str, x["size"])) if x["size"] else "all clips"
        lines.append(f"  {x['output']:11} {x['variant']:28} {sz:8} {x['style']:10} {x['kind']:7} " + ("ready" if x["state"] == "ready" else f"owed: {x['why']}"))
    for n in r["not_yet"]:
        lines.append(f"  not yet: {n['style']}  ({n['why']})")
    if a.make:
        import subprocess
        py = os.environ.get("WB_BPY") or sys.executable
        rc = subprocess.run([py, "-m", "wb.renderset", r["path"], a.make] + (["--only", a.only] if a.only else []), cwd=BODY).returncode
        lines.append(f"drawn into {a.make}" if rc == 0 else f"the render set failed ({rc}); set WB_BPY to the Blender python")
        out(a, dict(ok=rc == 0, species=a.species, ready=r["ready"], owed=r["owed"], out=a.make), "\n".join(lines))
        return 0 if rc == 0 else 2
    out(a, dict(ok=True, species=a.species, ready=r["ready"], owed=r["owed"], rows=r["rows"], not_yet=r["not_yet"]), "\n".join(lines))
    return 0


def cmd_variety(a):
    """The Variety sheet: N individuals drawn from the file's own rules, how often each look shows (this sheet, wild, a cross), the species rules, and the tiles (clay renders, cached; a second run is cached tile by tile). --no-tiles prints the numbers alone."""
    q = "&".join(f"{k}={v}" for k, v in (("n", a.n), ("seed", a.seed)) if v is not None)
    job = None
    if not a.no_tiles:
        job = run_job(a, "variety", {k: v for k, v in (("n", a.n), ("seed", a.seed)) if v is not None})
    sh = call("GET", f"/api/species/{a.species}/variety" + (f"?{q}" if q else ""))
    lines = [f"{a.species}  seed {sh['seed']} · {sh['n']} individuals" + (f" · tiles: {job['result']['cache'].get('views_hit', 0)} of {job['result']['cache'].get('views_total', len(job['result']['tiles']) * 3)} from the cache" if job and not job["cached"] else (" · tiles: all from the cache" if job else ""))]
    for l in sh["looks"]:
        lines.append(f"  {l['label']:32} {l['count']:>2} of {sh['n']}   wild {l['wild']:g}%   cross {round(l['cross'] * l['cross_of'] / 100)} of {l['cross_of']}" + (f"   (from {l['age']})" if l.get("age") else ""))
    for r in sh["rules"]:
        lines.append(f"rule {r['id']}: " + (f"broken by no. {', no. '.join(map(str, r['broken']))}" if r["broken"] else "holds"))
    for i in sh["individuals"]:
        for f in i["fails"]:
            lines.append(f"No. {i['n']}: {f['words']}")
    if a.sheet:
        import urllib.request
        sys.path.insert(0, BODY)
        from wb import report as R
        os.makedirs(a.sheet, exist_ok=True)
        tiles = {}
        for i in sh["individuals"]:
            k = i["tiles"]["304"]["key"]
            fn = f"tile-{i['n']:02d}.png"
            with urllib.request.urlopen(server_url() + f"/cas/{k}.png") as r, open(os.path.join(a.sheet, fn), "wb") as fh:
                fh.write(r.read())
            tiles[i["n"]] = fn
        h, p = R.variety_sheet(sh, tiles, a.sheet, "variety", title=a.species)
        lines.append(f"sheet {p}")
    out(a, dict(ok=not sh["failing"], species=a.species, **{k: sh[k] for k in ("seed", "n", "looks", "rules", "failing", "individuals", "key")}), "\n".join(lines))
    return 1 if sh["failing"] else 0


def golden_file(a):
    """The species file of `wb golden`: --file, else the framework's own folder, else the server's."""
    if a.file:
        return a.file
    p = os.path.join(BODY, "species_v1", f"{a.species}.json")
    if os.path.exists(p):
        return p
    return call("GET", f"/api/species/{a.species}")["path"]


def golden_files(a):
    if getattr(a, "all", False):
        d = os.path.join(BODY, "species_v1")
        return [os.path.join(d, f) for f in sorted(os.listdir(d)) if re.fullmatch(r"S\d+[a-z]*\.json", f)]
    return [golden_file(a)]


def golden_tools(a):
    sys.path.insert(0, BODY)
    try:
        from wb import golden as G, cas as C
    except ImportError as e:
        raise Fail(2, f"wb golden needs numpy ({e}); run it with the Blender python, for example WB_BPY=... $WB_BPY -m wb golden ...")
    return G, C


def golden_lines(G, st):
    lines = [f"{st['species']}  {G.line(st['totals'])}" + ("  (release)" if st["release"] else "  (draft)")]
    for e in st["entries"]:
        extra = f"  {e['pct']:g}% moved" if e.get("pct") else ""
        lines.append(f"  {G.STATE_WORD.get(e['state'], e['state']):8} {e['id']}{extra}")
    for c in st.get("causes", []):
        lines.append("  because " + (f"{c['field']} {c['old']} -> {c['new']}" if c["kind"] == "file" and c["field"] else f"the {c['kind']} moved: {c.get('old')} -> {c.get('new')}"))
    return lines


def cmd_golden(a):
    """wb golden make|diff|list|precommit (precommit is the framework commit's hook: .git/hooks/pre-commit runs `wb golden precommit`). make draws the whole set (Blender: set WB_BPY) and commits it as one commit; diff re-draws and compares; list reads the files and says same, changed, missing or stale for each golden."""
    G, C = golden_tools(a)
    home = a.home or HOME
    try:
        if a.action == "precommit":
            import subprocess
            # the hook of a framework commit: when the staged files include framework source, every release golden is re-drawn and compared; a changed one stops the commit
            staged = subprocess.run(["git", "diff", "--cached", "--name-only"], capture_output=True, text=True, cwd=BODY).stdout.split()
            if not G.framework_touched(staged):
                out(a, dict(ok=True, checked=False), "no framework source staged: release goldens not checked")
                return 0
            a.release, a.all, a.only, a.set, a.action = True, True, "", "", "diff"
        if a.action == "make":
            if a.missing:
                if a.release:
                    raise G.GoldenError("release goldens are made by the release export, from the signed file; draft goldens are made here")
                m = G.make_missing(golden_file(a), home, setdir=a.set or None, commit=not a.no_commit, log=lambda m: None if a.json else print(m))
                out(a, dict(ok=True, species=m["species"], added=m["added"], commit=m["committed"]), f"{m['species']} goldens added: {len(m['added'])}")
                return 0
            m = G.make(golden_file(a), home, setdir=a.set or None, release=a.release, commit=not a.no_commit, log=lambda m: None if a.json else print(m))
            out(a, dict(ok=True, species=m["species"], goldens=len(m["entries"]), file=m["file_hash"], framework=m["framework"], lookdev=m["lookdev"], commit=m["committed"]), f"{m['species']} goldens made")
            return 0
        if a.action == "list":
            st = G.state(golden_file(a), home)
            out(a, dict(ok=True, **st), "\n".join(golden_lines(G, st)))
            return 0
        bad, sts = 0, []
        for f in golden_files(a):
            sid = os.path.basename(f)[:-5]
            man = G.read_manifest(f, sid)
            if a.release and not (man and man.get("release")):
                continue                                          # the release check looks at release goldens only
            if man is None and a.all:
                if not a.json:
                    print(f"{sid}  no goldens yet")                # a species of the folder that has none (a test species) is left out of the sweep
                continue
            st = G.diff(f, home, C.Cas(os.path.join(home, "cas")), only=set(a.only.split(",")) if a.only else None, setdir=a.set or None, log=lambda m: None if a.json else print(m))
            sts.append(st)
            bad += st["totals"]["changed"] + st["totals"]["missing"]
        for st in sts:
            if not a.json:
                print("\n".join(golden_lines(G, st)))
        out(a, dict(ok=not bad, species=[s["species"] for s in sts], totals=[s["totals"] for s in sts], states=sts), f"{len(sts)} species with " + ("release goldens, " if a.release else "goldens, ") + (f"{bad} changed or new" if bad else "all same"))
        return 1 if bad else 0
    except G.GoldenError as e:
        raise Fail(2, str(e))


def cmd_string(a):
    """The genome string of one mibi: `wb string seed:3`, `wb string type`, `wb string string:G1-S20v1-...` (read back), `wb string code:S20v1-...`. The string alone on one line (so `$(wb string seed:3)` works); --json has more; --code adds the stamp code."""
    sp = a.species
    if not sp:
        m = re.match(r"(?:string|code):[GS](\d+)", a.selector.strip(), re.I) if a.selector.lower().startswith(("string:", "code:")) else None
        names = [s["id"] for s in call("GET", "/api/species")]
        sp = f"S{int(m.group(1)):02d}" if m and f"S{int(m.group(1)):02d}" in names else names[0] if len(names) == 1 else None
        if not sp:
            raise Fail(2, f"which species? (--species {', '.join(names)})", "species")
    r = call("GET", f"/api/species/{sp}/string?genome={urllib.parse.quote(a.selector)}")
    out(a, dict(ok=True, **r), r["string"] + (f"\n{r['code']}" if a.code and r.get("code") else ""))
    return 0


def cmd_explain(a):
    m = next((x for x in call("GET", "/api/checks") if x["id"] == a.check), None)
    if not m:
        raise Fail(2, f"no check '{a.check}' (have: {', '.join(x['id'] for x in call('GET', '/api/checks'))})", "check")
    text = f"{m['id']}  {m['name']}  (stage {m['stage']}, version {m['version']})\nfails as: {m['fail']}\nowner, {m['rule']['date']}: {m['rule']['words']}\nlimit: {m['limit']['text']}\nfields: {', '.join(m['fields']) or '(none)'}" + (f"\nin play: {m['play']}" if m.get("play") else "")
    out(a, dict(ok=True, **m), text)
    return 0


def cmd_watch(a):
    req = urllib.request.Request(server_url() + f"/events?species={a.species}")
    n, end = 0, time.time() + a.timeout if a.timeout else None
    try:
        with urllib.request.urlopen(req, timeout=(a.timeout or 3600)) as r:
            typ = None
            for raw in r:
                line = raw.decode().rstrip("\n")
                if line.startswith("event: "):
                    typ = line[7:]
                elif line.startswith("data: "):
                    ev = json.loads(line[6:])
                    print(line[6:] if a.json else fmt_event(ev), flush=True)
                    n += 1
                    if a.count and n >= a.count:
                        return 0
                if end and time.time() > end:
                    break
    except (TimeoutError, OSError):
        pass
    except KeyboardInterrupt:
        pass
    return 0


def fmt_event(ev):
    t = ev["t"][11:23]
    typ = ev["type"]
    who = ev.get("actor") or ""
    if typ == "edited":
        return f"{t} edited  {ev['species']} by {who} ({ev['via']}) {', '.join(ev.get('changes', [])[:4])}"
    extra = ""
    if typ == "running" and ev.get("progress"):
        extra = f" {ev['progress']['done']}/{ev['progress']['of']}"
    if typ == "done":
        extra = (" cache hit" if ev.get("cached") else f" {ev.get('ms', 0):.0f} ms") + (f" {len(ev['urls'])} files" if ev.get("urls") else "")
    if typ == "failed":
        extra = " " + (ev.get("error") or "") + (f" [{ev['field']}]" if ev.get("field") else "")
    return f"{t} {typ:7} {ev['species']} {ev.get('job', '')} {ev.get('kind', '')}{extra}"


def cmd_serve(a):
    py = os.environ.get("WB_PYTHON", "/home/mb/mb/tools-3d/bpyvenv/bin/python")
    os.makedirs(HOME, exist_ok=True)
    argv = [py, "-m", "wb.server", "--home", HOME, "--host", a.host, "--port", str(a.port)] + (["--trusted-proxy", a.trusted_proxy] if a.trusted_proxy else []) + sum([["--species", d] for d in a.species], []) + (["--static", a.static] if a.static else [])
    os.chdir(BODY)
    os.environ["PYTHONPATH"] = BODY
    os.execv(py, argv)


def toy_lines(t):
    lines = []
    for toy in t["toys"]:
        lines.append(f"{toy['label']}" + ("  (hidden)" if toy["hidden"] else ""))
        for ax in toy["axes"]:
            if ax["kind"] == "range":
                cells = " ".join(("[" if i == ax["home"] else " ") + f"{s['value']:g}" + ("]" if i == ax["home"] else " ") + ("" if s["ok"] else "x") for i, s in enumerate(ax["steps"]))
                lines.append(f"  {ax['id']:7} {len(ax['steps'])} steps  {cells}   (x = trimmed)")
            else:
                cells = " ".join(("[" if o["id"] == ax["home"] else "") + o["id"] + ("]" if o["id"] == ax["home"] else "") + ("" if o["ok"] else " x") for o in ax["options"])
                lines.append(f"  {ax['id']:7} chips  {cells}")
    return lines


def cmd_toys(a):
    """wb toys S20: the toys play shows for this file (each toy's steps, the one the mibi sits on, the steps the sweep trimmed) and, with --slots, every sentence slot."""
    t = call("GET", f"/api/species/{a.species}/toys")
    lines = toy_lines(t)
    sw = t["sweep"]
    lines.append(f"sweep: {sw['state']}" + (f" ({sw['summary']['builds']} cages in {sw['summary']['seconds']} s)" if sw.get("summary") and not sw["summary"].get("unbuilt") else "") + ("" if t["built"] else f"  this plan has no cage builder yet"))
    if a.slots:
        for s in t["slots"]:
            lines.append(f"slot {s['check']:12} {str(s['toy']):8} {s['source']:11} {s['sentence']}")
    out(a, dict(t, ok=True, species=a.species), "\n".join(lines))
    return 0


def cmd_sweep(a):
    """wb sweep S20 [--wait]: the safe-step sweep, a background job that builds the corners of the toys' step box as clay and trims any step that fails a check at a corner."""
    j = run_job(a, "sweep", {}, wait=a.wait)
    if j["state"] in ("queued", "running"):
        out(a, dict(ok=True, species=a.species, job=j["id"], state=j["state"], key=j["key"]), f"queued {j['id']}; wb sweep {a.species} --wait to see it through")
        return 0
    r = j["result"]
    t = call("GET", f"/api/species/{a.species}/toys")
    lines = toy_lines(t)
    if r.get("unbuilt"):
        lines.append(r["note"])
    else:
        n = sum(len(ax.get("trimmed", [])) + len(ax.get("banned", [])) for toy in r["toys"].values() for ax in toy.values())
        lines.append(f"{r['builds']} cages in {r['seconds']} s, {r['corners']} corners in the final box, {r['rounds']} rounds, {n} steps trimmed, {r['still_failing']} corners still failing" + (" (from the cache)" if j["cached"] else ""))
    out(a, dict(ok=not r.get("still_failing"), species=a.species, job=j["id"], cached=j["cached"], sweep=r), "\n".join(lines))
    return 1 if r.get("still_failing") else 0


def cmd_export(a):
    """wb export S20 --review|--release: the export job (glb, viewer, creature.json, the game frame, the layered stands) as paths and hashes. A release is refused with every reason (exit 1) until the checks pass or are waived and the gate is signed."""
    mode = "release" if a.release else "review"
    try:
        j = run_job(a, "export", dict(mode=mode), wait=a.wait)
    except Fail as e:
        body = e.extra.get("body") or {}
        if body.get("reasons"):
            lines = ["Release export is blocked by"] + [f"  \u2022 {r}" for r in body["reasons"]]
            out(a, dict(ok=False, species=a.species, mode=mode, refused=True, reasons=body["reasons"]), "\n".join(lines))
            return 1
        raise
    if j["state"] in ("queued", "running"):
        out(a, dict(ok=True, species=a.species, job=j["id"], state=j["state"], key=j["key"]), f"queued {j['id']}; wb export {a.species} --{mode} --wait to see it through")
        return 0
    r = j["result"]
    lines = [f"{a.species} {mode} export" + (" (from the cache)" if j["cached"] else "") + f"  {r['build']}", f"folder {r['dir']}"]
    lines += [f"{f['sha256'][:12]}  {f['bytes']:>9}  {f['name']}" for f in r["files"]]
    if r["checks"]["failing"]:
        lines.append("checks failing, written into the viewer: " + "; ".join(r["checks"]["failing"]))
    out(a, dict(ok=True, species=a.species, mode=mode, job=j["id"], cached=j["cached"], dir=r["dir"], files=r["files"], build=r["build"], checks=r["checks"]), "\n".join(lines))
    return 0


def cmd_step(a):
    """wb step S20 tail length 5: one play move (a toy's axis to a step number, or a chip's name), saved the way play saves: a check that fails refuses it, nothing is saved, and the mibi's sentence comes back (exit 1)."""
    to = int(a.to) if re.fullmatch(r"\d+", a.to) else a.to
    try:
        res = call("POST", f"/api/species/{a.species}/play", dict(toy=a.toy, axis=a.axis, to=to))
    except Fail as e:
        body = e.extra.get("body") or {}
        if e.extra.get("status") == 409 and body.get("refused"):
            out(a, dict(body, ok=False, species=a.species), f"refused ({body['why']}): \"{body['sentence']}\"  " + ", ".join(c["check"] for c in body["checks"]) + f"  nothing saved; the toy stays at {body['back_to']}")
            return 1
        raise
    out(a, dict(res, species=a.species), f"{a.toy}.{a.axis} -> {a.to}  saved ({res['genome']})")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(prog="wb")
    sub = ap.add_subparsers(dest="cmd", required=True)

    def common(p, genome=True, wait=False):
        p.add_argument("--json", action="store_true")
        p.add_argument("--timeout", type=float, default=300.0)
        if genome:
            p.add_argument("--genome", default="type")
    p = sub.add_parser("new"); p.add_argument("species", help="the new species' id: S and two digits"); p.add_argument("--plan", required=True, choices=("biped", "quadruped")); p.add_argument("--from", dest="source", default="template"); p.add_argument("--out", default=""); p.add_argument("--json", action="store_true"); p.set_defaults(f=cmd_new)
    p = sub.add_parser("build"); p.add_argument("species"); common(p); p.set_defaults(f=cmd_build)
    p = sub.add_parser("render"); p.add_argument("species"); common(p)
    p.add_argument("--mode", default="clay"); p.add_argument("--az", default="0,32,90,180"); p.add_argument("--size", default="304"); p.add_argument("--sheet", action="store_true"); p.add_argument("--wait", action="store_true"); p.set_defaults(f=cmd_render)
    p = sub.add_parser("set"); p.add_argument("species"); p.add_argument("path"); p.add_argument("value"); common(p, genome=False); p.set_defaults(f=cmd_set)
    p = sub.add_parser("validate"); p.add_argument("species", nargs="?", default=""); p.add_argument("--file", default=""); common(p, genome=False); p.set_defaults(f=cmd_validate)
    p = sub.add_parser("convert"); p.add_argument("src"); p.add_argument("--out", default=""); p.add_argument("--json", action="store_true"); p.add_argument("--timeout", type=float, default=60.0); p.set_defaults(f=cmd_convert)
    p = sub.add_parser("check"); p.add_argument("species"); common(p); p.add_argument("--stage", default="all", choices=STAGES); p.add_argument("--locus", action="append", default=[], help="extremes only: build just this locus (repeat for more)"); p.add_argument("--wait", action="store_true"); p.set_defaults(f=cmd_check)
    p = sub.add_parser("freq"); p.add_argument("species", nargs="?", default=""); p.add_argument("--file", default=""); p.add_argument("-n", type=int, default=1000, help="wild draws"); p.add_argument("--locus", action="append", default=[], help="also print this locus's looks"); p.add_argument("--json", action="store_true"); p.add_argument("--timeout", type=float, default=60.0); p.set_defaults(f=cmd_freq)
    p = sub.add_parser("variety"); p.add_argument("species"); p.add_argument("--n", type=int, default=None); p.add_argument("--seed", type=int, default=None); p.add_argument("--no-tiles", action="store_true"); p.add_argument("--sheet", default="", help="write the sheet (HTML and PNG) into this folder"); p.add_argument("--json", action="store_true"); p.add_argument("--timeout", type=float, default=600.0); p.set_defaults(f=cmd_variety)
    p = sub.add_parser("renders"); p.add_argument("species"); p.add_argument("--make", default="", help="draw the ready pictures into this folder (needs WB_BPY, the Blender python)"); p.add_argument("--only", default=""); p.add_argument("--json", action="store_true"); p.add_argument("--timeout", type=float, default=60.0); p.set_defaults(f=cmd_renders)
    p = sub.add_parser("golden"); p.add_argument("action", choices=("make", "diff", "list", "precommit")); p.add_argument("species", nargs="?", default="S20"); p.add_argument("--file", default="", help="the species file (default: the framework's own species_v1 folder)"); p.add_argument("--home", default="", help="the server's home (cache and last diff)")
    p.add_argument("--release", action="store_true", help="make: refused (the release export makes release goldens); diff: only release goldens, exit 1 when one changed"); p.add_argument("--all", action="store_true", help="diff: every species of the framework's folder"); p.add_argument("--only", default="", help="diff: only these outputs or ids")
    p.add_argument("--set", default="", help="use a set folder already drawn by wb.renderset instead of drawing"); p.add_argument("--missing", action="store_true", help="make: add the goldens that are missing and touch none that is there"); p.add_argument("--no-commit", action="store_true"); p.add_argument("--json", action="store_true"); p.add_argument("--timeout", type=float, default=600.0); p.set_defaults(f=cmd_golden)
    p = sub.add_parser("toys"); p.add_argument("species"); p.add_argument("--slots", action="store_true", help="also list every sentence slot"); p.add_argument("--json", action="store_true"); p.add_argument("--timeout", type=float, default=60.0); p.set_defaults(f=cmd_toys)
    p = sub.add_parser("sweep"); p.add_argument("species"); p.add_argument("--wait", action="store_true"); p.add_argument("--json", action="store_true"); p.add_argument("--timeout", type=float, default=900.0); p.set_defaults(f=cmd_sweep)
    p = sub.add_parser("export"); p.add_argument("species"); g = p.add_mutually_exclusive_group(required=True); g.add_argument("--review", action="store_true"); g.add_argument("--release", action="store_true")
    p.add_argument("--no-wait", dest="wait", action="store_false"); p.add_argument("--json", action="store_true"); p.add_argument("--timeout", type=float, default=900.0); p.set_defaults(f=cmd_export)
    p = sub.add_parser("step"); p.add_argument("species"); p.add_argument("toy"); p.add_argument("axis"); p.add_argument("to", help="a step number, or a chip's name"); p.add_argument("--json", action="store_true"); p.add_argument("--timeout", type=float, default=300.0); p.set_defaults(f=cmd_step)
    p = sub.add_parser("string"); p.add_argument("selector", nargs="?", default="type"); p.add_argument("--species", default=""); p.add_argument("--code", action="store_true"); p.add_argument("--json", action="store_true"); p.add_argument("--timeout", type=float, default=60.0); p.set_defaults(f=cmd_string)
    p = sub.add_parser("explain"); p.add_argument("check"); p.add_argument("--json", action="store_true"); p.add_argument("--timeout", type=float, default=60.0); p.set_defaults(f=cmd_explain)
    p = sub.add_parser("watch"); p.add_argument("species"); p.add_argument("--json", action="store_true"); p.add_argument("--count", type=int, default=0); p.add_argument("--timeout", type=float, default=0); p.set_defaults(f=cmd_watch)
    p = sub.add_parser("serve"); p.add_argument("--host", default="127.0.0.1"); p.add_argument("--port", type=int, default=0); p.add_argument("--trusted-proxy", default=""); p.add_argument("--species", action="append", default=[]); p.add_argument("--static", default=""); p.set_defaults(f=cmd_serve)
    a = ap.parse_args(argv)
    try:
        return a.f(a)
    except Fail as e:
        if getattr(a, "json", False):
            print(json.dumps(dict(ok=False, error=e.message, field=e.field, exit=e.code, **e.extra)))
        else:
            print(f"wb: {e.message}" + (f" [{e.field}]" if e.field else ""), file=sys.stderr)
        return e.code


if __name__ == "__main__":
    sys.exit(main())

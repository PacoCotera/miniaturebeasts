"""wb: the command line. A thin client of the job server's HTTP API (standard library only, so it runs under any python3).
Every command takes --json and prints one JSON object. Exit codes: 0 done and passing; 1 a check failed; 2 build or validation error (with the field); 3 still running at the --wait timeout; 4 refused by role (or no token).
Server: WB_URL, else the server.json in WB_HOME (default <body>/scratch/wb-home). Token: WB_TOKEN."""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOME = os.environ.get("WB_HOME") or os.path.join(BODY, "scratch", "wb-home")
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
        raise Fail(code, msg, d.get("field"), dict(status=e.code))
    except urllib.error.URLError as e:
        raise Fail(2, f"cannot reach the server: {e.reason}")


def resolve_path(doc, dotted):
    """'parts.tail.joints.t2.len' -> (JSON pointer, current value). A list element is picked by index or by its `name`."""
    ptr, cur = "", doc
    for tok in dotted.split("."):
        if isinstance(cur, list):
            if tok.isdigit() and int(tok) < len(cur):
                i = int(tok)
            else:
                idx = [k for k, v in enumerate(cur) if isinstance(v, dict) and v.get("name") == tok]
                if not idx:
                    raise Fail(2, f"{dotted}: no list element '{tok}'", dotted)
                i = idx[0]
            cur, ptr = cur[i], f"{ptr}/{i}"
        elif isinstance(cur, dict):
            if tok not in cur:
                raise Fail(2, f"{dotted}: no field '{tok}' (have: {', '.join(list(cur)[:8])})", dotted)
            cur, ptr = cur[tok], f"{ptr}/{tok.replace('~', '~0').replace('/', '~1')}"
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


def cmd_validate(a):
    j = run_job(a, "check", dict(stage="file"))
    r = j["result"]
    lines = [f"{'PASS' if x['state'] == 'pass' else 'FAIL'}  {x['id']:12} {x['value']}" + (f"   [{x['field']}]" if x.get("field") else "") for x in r["rows"]]
    out(a, dict(ok=not r["fail"], species=a.species, stage="file", rows=r["rows"], fail=r["fail"], passed=r["passed"]), "\n".join(lines))
    return 1 if r["fail"] else 0


STAGES = ("file", "cage", "extremes", "rig", "coat", "all")
LATER = dict(extremes="chunk 8", rig="chunk 23", coat="chunk 23")


def check_rows(a, job):
    """The rows of a finished check job with the owner's words and the proof pictures' paths (waits for the pictures when --wait)."""
    metas = {m["id"]: m for m in call("GET", "/api/checks")}
    rows = job["result"]["rows"]
    end = time.time() + 90
    while a.wait and any(r.get("proof") and not r["proof"].get("ready") for r in rows) and time.time() < end:
        time.sleep(0.5)
        cur = call("GET", f"/api/species/{a.species}").get("checks")
        if cur and cur.get("fresh"):
            rows = cur["rows"]
    out = []
    for r in rows:
        m = metas.get(r["id"], {})
        out.append(dict(id=r["id"], name=m.get("name"), state=r["state"], value=r["value"], limit=r["limit"], measure=r["measure"], words=(m.get("rule") or {}).get("words"), rule_date=(m.get("rule") or {}).get("date"),
                        stage=r["stage"], proof=(r.get("proof") or {}).get("path"), fail_line=(r.get("extra") or {}).get("fail") or m.get("fail")))
    return out


def cmd_check(a):
    if a.stage in LATER:
        raise Fail(2, f"check stage '{a.stage}' arrives with {LATER[a.stage]}; the stages that exist are file, cage and all", "stage")
    j = run_job(a, "check", dict(stage=a.stage, genome=a.genome), wait=a.wait)
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
    lines.append(f"{len(rows) - len(fails) - len(warns)} pass · {len(warns)} warn · {len(fails)} fail")
    out(a, dict(ok=not fails, species=a.species, stage=a.stage, rows=rows, fail=fails, warn=warns, passed=len(rows) - len(fails) - len(warns), job=j["id"], cached=j["cached"]), "\n".join(lines))
    return 1 if fails else 0


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
    argv = [py, "-m", "wb.server", "--home", HOME, "--port", str(a.port)] + sum([["--species", d] for d in a.species], []) + (["--static", a.static] if a.static else [])
    os.chdir(BODY)
    os.environ["PYTHONPATH"] = BODY
    os.execv(py, argv)


def main(argv=None):
    ap = argparse.ArgumentParser(prog="wb")
    sub = ap.add_subparsers(dest="cmd", required=True)

    def common(p, genome=True, wait=False):
        p.add_argument("--json", action="store_true")
        p.add_argument("--timeout", type=float, default=300.0)
        if genome:
            p.add_argument("--genome", default="type")
    p = sub.add_parser("build"); p.add_argument("species"); common(p); p.set_defaults(f=cmd_build)
    p = sub.add_parser("render"); p.add_argument("species"); common(p)
    p.add_argument("--mode", default="clay"); p.add_argument("--az", default="0,32,90,180"); p.add_argument("--size", default="304"); p.add_argument("--sheet", action="store_true"); p.add_argument("--wait", action="store_true"); p.set_defaults(f=cmd_render)
    p = sub.add_parser("set"); p.add_argument("species"); p.add_argument("path"); p.add_argument("value"); common(p, genome=False); p.set_defaults(f=cmd_set)
    p = sub.add_parser("validate"); p.add_argument("species"); common(p, genome=False); p.set_defaults(f=cmd_validate)
    p = sub.add_parser("check"); p.add_argument("species"); common(p); p.add_argument("--stage", default="all", choices=STAGES); p.add_argument("--wait", action="store_true"); p.set_defaults(f=cmd_check)
    p = sub.add_parser("explain"); p.add_argument("check"); p.add_argument("--json", action="store_true"); p.add_argument("--timeout", type=float, default=60.0); p.set_defaults(f=cmd_explain)
    p = sub.add_parser("watch"); p.add_argument("species"); p.add_argument("--json", action="store_true"); p.add_argument("--count", type=int, default=0); p.add_argument("--timeout", type=float, default=0); p.set_defaults(f=cmd_watch)
    p = sub.add_parser("serve"); p.add_argument("--port", type=int, default=0); p.add_argument("--species", action="append", default=[]); p.add_argument("--static", default=""); p.set_defaults(f=cmd_serve)
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

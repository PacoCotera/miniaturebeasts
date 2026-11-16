"""The coordination view of the studio team page: how the desks, jobs, watchdog and lead talk, which agreements are checked, which were broken.

Read only. Everything is generated from the internal repo's runtime files (bus stats, the bus log's routing fields, the agreement checks and their
violations log); nothing is kept by hand and no message body is ever read out: only the sender, the addressee, the kind and the time of each post.

MB_INTERNAL overrides the main checkout of the internal repo (default ~/mb/miniaturebeasts-internal); MB_MEMORY_INDEX overrides the lead's memory index.
"""
import datetime as dt
import json
import os
import re
import time

INTERNAL = os.environ.get("MB_INTERNAL") or os.path.expanduser("~/mb/miniaturebeasts-internal")
MEMORY_INDEX = os.environ.get("MB_MEMORY_INDEX") or os.path.expanduser("~/.claude/projects/-home-mb-mb/memory/MEMORY.md")

KINDS = ["done", "branch-ready", "signed", "question", "alarm", "rule", "fyi"]       # the order the colours are given in; every other kind (confirmations, breaches) is "other"
KIND_WORDS = {"done": "Done", "branch-ready": "Ready to merge", "signed": "Signed", "question": "Question", "alarm": "Alarm", "rule": "New rule", "fyi": "For information", "other": "Other (confirmations)"}
NAMES = {"lead": "Lead", "art": "Art director", "design": "Game designer", "ui": "Screens and phone UI", "pixel": "Pixel art", "editorial": "Book editor", "hardware": "Hardware",
         "mobile": "Phone app", "watchdog": "Watchdog", "owner": "You", "all": "Everyone", "jobs": "Jobs", "job": "Jobs"}
DEST_WORDS = {"lead": "Lead, at once", "lead-held": "Lead, in a batch", "lead-hourly": "Lead, hourly check", "_filed": "Filed, nobody woken"}
DESK_KEYS = ["lead", "art", "design", "ui", "pixel", "editorial", "hardware", "mobile"]
WINDOW_DAYS = 7
TARGET = 15
MAX_LOG_BYTES = 5 * 1024 * 1024

_CACHE = dict(at=0.0, data=None)


def _boards():
    return os.path.join(INTERNAL, "boards")


def _json(path, default):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return default


def _age(iso):
    """Seconds since an ISO time, or None."""
    try:
        t = dt.datetime.fromisoformat(iso)
    except (TypeError, ValueError):
        return None
    if t.tzinfo is None:
        t = t.replace(tzinfo=dt.timezone.utc)
    return max(0, int(time.time() - t.timestamp()))


def _name(key):
    return NAMES.get(key) or key


def _kind(k):
    return k if k in KINDS else "other"


# ---- rules.md: number, one-line title, the check that holds it
RULE_LINE = re.compile(r"^(\d+[a-z]?)\. (.*?)(?: \[checked by: (.*)\])?$")


def read_rules():
    out = {}
    try:
        with open(os.path.join(_boards(), "rules.md"), encoding="utf-8") as fh:
            lines = fh.read().splitlines()
    except OSError:
        return out
    for ln in lines:
        m = RULE_LINE.match(ln)
        if not m:
            continue
        n, text, by = m.group(1), m.group(2), m.group(3) or ""
        title = re.split(r"(?<=[.;:?!])\s", text, maxsplit=1)[0]
        title = re.sub(r"\s*\(\d\d-\d\d.*$", "", title).rstrip(".;:")
        if len(title) > 110:
            title = title[:107].rstrip() + "..."
        out[n] = dict(n=n, title=title, text=text, by=by)
    return out


def _rule_sort(n):
    m = re.match(r"(\d+)([a-z]?)", n)
    return (int(m.group(1)), m.group(2)) if m else (9999, n)


# ---- bus: counts by day, source, addressee and kind (from the routing fields only)
def read_bus(days):
    """Per UTC day: posts by (from, kind) and by (to, kind), and the pair counts. Only the fields that route; never the text."""
    path = os.path.join(_boards(), "bus", "bus.jsonl")
    src, dst, pairs = {}, {}, {}
    try:
        size = os.path.getsize(path)
        with open(path, "rb") as fh:
            if size > MAX_LOG_BYTES:
                fh.seek(size - MAX_LOG_BYTES)
                fh.readline()
            raw = fh.read().decode("utf-8", "replace")
    except OSError:
        return src, dst, pairs
    keep = set(days)
    for ln in raw.splitlines():
        try:
            p = json.loads(ln)
        except ValueError:
            continue
        day = str(p.get("time", ""))[:10]
        if day not in keep:
            continue
        k = _kind(p.get("kind"))
        f, t = str(p.get("from") or "?"), str(p.get("to") or "?")
        src.setdefault(f, {}).setdefault(k, 0)
        src[f][k] += 1
        dst.setdefault(t, {}).setdefault(k, 0)
        dst[t][k] += 1
        pairs[(f, t)] = pairs.get((f, t), 0) + 1
    return src, dst, pairs


# ---- time series at four zooms (owner 11-16: "multiple levels of aggregation pls. full days is too big")
ZOOMS = [("15m", 15 * 60, 24), ("hour", 3600, 24), ("day", 86400, 14), ("week", 7 * 86400, 8)]   # (key, bucket seconds, bars)


def _router():
    """The bus's own Router (tools/bus/buslib.py), so the lead-line count here is the router's rule, never a copy. None if it can't load."""
    import sys
    p = os.path.join(INTERNAL, "tools", "bus")
    if p not in sys.path:
        sys.path.insert(0, p)
    try:
        import buslib
        return buslib
    except Exception:                                   # noqa: BLE001 - a broken import must not blank the tab
        return None


def _posts():
    path = os.path.join(_boards(), "bus", "bus.jsonl")
    try:
        size = os.path.getsize(path)
        with open(path, "rb") as fh:
            if size > MAX_LOG_BYTES:
                fh.seek(size - MAX_LOG_BYTES)
                fh.readline()
            raw = fh.read().decode("utf-8", "replace")
    except OSError:
        return []
    out = []
    for ln in raw.splitlines():
        try:
            p = json.loads(ln)
            t = dt.datetime.fromisoformat(p["time"])
        except (ValueError, KeyError, TypeError):
            continue
        if t.tzinfo is None:
            t = t.replace(tzinfo=dt.timezone.utc)
        out.append((t.timestamp(), p))
    out.sort(key=lambda x: x[0])
    return out


def _lead_times(posts):
    """Times of every line that woke the lead: the at-once lines and the batch lines, replayed through the router. None if the router can't load."""
    bl = _router()
    if bl is None:
        return None
    r = bl.Router({}, bl.desk_keys())
    out = []
    for ts, p in posts:
        t = dt.datetime.fromtimestamp(ts, dt.timezone.utc)
        b = r.tick(t)
        if b:
            out.append(ts)
        try:
            feed, line = r.handle(p)
        except Exception:                               # noqa: BLE001 - a malformed post is skipped, as the router does
            continue
        if feed == "lead" and line is not None:
            out.append(ts)
    now = dt.datetime.now(dt.timezone.utc)
    if r.tick(now):
        out.append(now.timestamp())
    return out


def _bucket_start(ts, key, size):
    if key == "week":                                   # weeks start Monday 00:00 UTC
        d = dt.datetime.fromtimestamp(ts, dt.timezone.utc).date()
        d -= dt.timedelta(days=d.weekday())
        return dt.datetime(d.year, d.month, d.day, tzinfo=dt.timezone.utc).timestamp()
    return ts - ts % size


def read_series():
    posts = _posts()
    leads = _lead_times(posts)
    now = time.time()
    out = {}
    for key, size, bars in ZOOMS:
        last = _bucket_start(now, key, size)
        starts = [last - i * size for i in range(bars - 1, -1, -1)]
        idx = {s: i for i, s in enumerate(starts)}
        rows = [dict(start=s, posts=0, kinds={k: 0 for k in KINDS + ["other"]}, lead_lines=0 if leads is not None else None) for s in starts]
        for ts, p in posts:
            i = idx.get(_bucket_start(ts, key, size))
            if i is None:
                continue
            if p.get("from") != "router":
                rows[i]["posts"] += 1
            rows[i]["kinds"][_kind(p.get("kind"))] += 1
        for ts in leads or []:
            i = idx.get(_bucket_start(ts, key, size))
            if i is not None:
                rows[i]["lead_lines"] += 1
        target = TARGET if key == "day" else TARGET * 7 if key == "week" else None
        out[key] = dict(size=size, target=target, rows=rows)
    return out


def read_days():
    d = os.path.join(_boards(), "bus", "stats")
    try:
        files = sorted(f for f in os.listdir(d) if re.fullmatch(r"\d{4}-\d\d-\d\d\.json", f))[-WINDOW_DAYS:]
    except OSError:
        return []
    out = []
    for f in files:
        s = _json(os.path.join(d, f), {})
        k = {x: 0 for x in KINDS + ["other"]}
        for name, n in (s.get("kinds") or {}).items():
            k[_kind(name)] += n
        out.append(dict(day=s.get("day") or f[:10], posts=s.get("posts", 0), kinds=k, lead_lines=s.get("lead_lines", 0), lead_urgent=s.get("lead_urgent", 0),
                        lead_held=s.get("lead_held", 0), breaches=s.get("breaches", 0), target=s.get("lead_lines_target") or TARGET,
                        over=bool(s.get("over_target")), destinations=s.get("destinations") or {}))
    return out


def _stack(table, order=None):
    rows = []
    for key, kinds in table.items():
        rows.append(dict(key=key, name=_name(key), total=sum(kinds.values()), kinds={k: kinds.get(k, 0) for k in KINDS + ["other"]}))
    rows.sort(key=lambda r: (-r["total"], r["name"]))
    return rows


# ---- checks and violations
def read_checks(rules):
    st = _json(os.path.join(_boards(), "watchdog", "agreements", "status.json"), [])
    machine, guards, review = [], [], []
    for r in st if isinstance(st, list) else []:
        n = str(r.get("rule"))
        row = dict(rule=n, title=(rules.get(n) or {}).get("title", ""), check=r.get("check"), kind=r.get("kind"), pass_=r.get("pass"), ago=_age(r.get("last_run")),
                   detail=str(r.get("detail") or "")[:160], count=r.get("count") or 0)
        if r.get("kind") == "review":
            review.append(row)
        elif r.get("pass") is None:
            guards.append(row)
        else:
            machine.append(row)
    machine.sort(key=lambda r: (r["pass_"], _rule_sort(r["rule"])))      # failing first
    guards.sort(key=lambda r: _rule_sort(r["rule"]))
    review.sort(key=lambda r: _rule_sort(r["rule"]))
    # rules the contract lists but no status row mentions (a rule with several checks has several rows)
    return machine, guards, review


def read_violations(rules):
    path = os.path.join(_boards(), "watchdog", "agreements", "violations.jsonl")
    state = {}
    try:
        with open(path, encoding="utf-8") as fh:
            for ln in fh:
                try:
                    e = json.loads(ln)
                except ValueError:
                    continue
                i = e.get("id")
                if not i:
                    continue
                if e.get("event") == "open":
                    state[i] = dict(id=i, who=str(e.get("who") or "?"), rule=str(e.get("rule")), check=e.get("check"), when=e.get("when"), detail=str(e.get("detail") or "")[:160], fixed=False, fixed_at=None)
                elif e.get("event") == "fixed" and i in state:
                    state[i]["fixed"] = True
                    state[i]["fixed_at"] = e.get("when")
    except OSError:
        pass
    items = sorted(state.values(), key=lambda v: str(v["when"]), reverse=True)
    for v in items:
        v["ago"] = _age(v["when"])
        v["fixed_ago"] = _age(v["fixed_at"]) if v["fixed"] else None
        v["title"] = (rules.get(v["rule"]) or {}).get("title", "")
        v.pop("when"), v.pop("fixed_at")
    return dict(open=sum(1 for v in items if not v["fixed"]), fixed=sum(1 for v in items if v["fixed"]), items=items[:40])


def read_bus_rules():
    rs = _json(os.path.join(_boards(), "bus", "rules.json"), {})
    out = []
    for ref, r in rs.items() if isinstance(rs, dict) else []:
        acks = sorted(r.get("acks") or {})
        live = sorted(r.get("seen_live") or {})
        out.append(dict(ref=ref, n=ref.split(":")[-1], acked=len(acks), of=len(live), waiting=[_name(d) for d in live if d not in acks], ago=_age(r.get("at"))))
    out.sort(key=lambda r: _rule_sort(r["n"]))
    return out


def collect():
    rules = read_rules()
    days = read_days()
    keep = [d["day"] for d in days]
    src, dst, pairs = read_bus(keep)
    machine, guards, review = read_checks(rules)
    alive = _age(None)
    try:
        alive = max(0, int(time.time() - os.path.getmtime(os.path.join(_boards(), "bus", "router.alive"))))
    except OSError:
        pass
    routed = {}
    for d in days:
        for k, n in d["destinations"].items():
            routed[k] = routed.get(k, 0) + n
    for d in days:
        d.pop("destinations")
    cards = [dict(key=k, name=_name(k)) for k in DESK_KEYS if os.path.isfile(os.path.join(_boards(), "desk-cards", k + ".md"))]
    top = sorted(pairs.items(), key=lambda kv: -kv[1])[:14]
    return dict(
        kinds=[dict(key=k, name=KIND_WORDS[k]) for k in KINDS + ["other"]],
        days=days, target=TARGET, series=read_series(),
        router_quiet_s=alive,
        sources=_stack(src), addressed=_stack(dst),
        routed=[dict(key=k, name=DEST_WORDS.get(k) or _name(k), n=n) for k, n in sorted(routed.items(), key=lambda kv: -kv[1])],
        pairs=[dict(src=f, src_name=_name(f), dst=t, dst_name=_name(t), n=n) for (f, t), n in top],
        checks=machine, guards=guards, review=review,
        violations=read_violations(rules),
        bus_rules=read_bus_rules(),
        cards=cards, rule_count=len(rules),
    )


def state():
    """Cached 10 s like the rest of the page. A failure is an answer the page can show."""
    if _CACHE["data"] is not None and time.time() - _CACHE["at"] < 10:
        return _CACHE["data"]
    if not os.path.isdir(_boards()):
        return dict(error="the internal boards are not on this machine")
    try:
        data = collect()
    except Exception as e:                              # a half-written runtime file must not blank the page
        return dict(error="the coordination data could not be read: " + type(e).__name__)
    data["served_at"] = time.time()
    _CACHE.update(at=time.time(), data=data)
    return data


# ---- plain-text documents the page links to: the rules page, one rule with the owner's words, a desk card, the lead's memory index
def _stamps(text):
    """(month, day, hour|None, tens|None, unit|None) for each dated mention in a rule line: '11-09 10:58, 13:55', '12:4x', '11-14'."""
    out, last = [], None
    for m in re.finditer(r"(?<![\d:])(?:(\d\d)-(\d\d))?(?: ?(\d\d):(\d)([\dx]))?(?![\d])", text):
        mo, d, h, a, b = m.groups()
        if not (mo or h):
            continue
        if mo:
            last = (mo, d)
        if last is None:
            continue
        if not mo and not h:
            continue
        out.append(last + (h, a, b))
    seen, res = set(), []
    for s in out:
        if s not in seen:
            seen.add(s)
            res.append(s)
    return res


def _decision_lines(stamp):
    mo, d, h, a, b = stamp
    day = "2026-%s-%s" % (mo, d)
    found = []
    for path in (os.path.join(INTERNAL, "decisions.md"), os.path.join(_boards(), "decisions.md")):
        try:
            with open(path, encoding="utf-8") as fh:
                for ln in fh:
                    m = re.match(r"^(?:- |## )%s (\d\d):(\d\d)" % re.escape(day), ln)
                    if not m:
                        if h is None and ln.startswith("- " + day) and "OWNER" in ln:
                            found.append(ln.strip())
                        continue
                    if h is None:
                        if "OWNER" in ln:
                            found.append(ln.strip())
                    elif m.group(1) == h:
                        minute = int(m.group(2))
                        if (b == "x" and str(minute // 10) == a) or (b != "x" and abs(minute - int(a + b)) <= 5):
                            found.append(ln.strip()[:320])
        except OSError:
            continue
    return found[:4]


def document(kind, ident=""):
    """(status, text) for a link of the page. Only these four things can be read; the name is checked, never joined into a path unchecked."""
    if kind == "rules":
        path = os.path.join(_boards(), "rules.md")
    elif kind == "memory":
        path = MEMORY_INDEX
    elif kind == "card" and re.fullmatch(r"[a-z]{2,12}", ident or ""):
        path = os.path.join(_boards(), "desk-cards", ident + ".md")
    elif kind == "rule" and re.fullmatch(r"\d{1,3}[a-z]?", ident or ""):
        r = read_rules().get(ident)
        if not r:
            return 404, "No such rule.\n"
        lines = ["Rule %s" % ident, "", r["text"], "", "Checked by: %s" % (r["by"] or "nothing yet"), "", "The owner's words, from decisions.md:"]
        got = []
        for s in _stamps(r["text"]):
            got += [x for x in _decision_lines(s) if x not in got]
        lines += ["- " + x.lstrip("- #") for x in got[:10]] or ["(No line is dated this closely; the rule line above carries the owner's words and date.)"]
        return 200, "\n".join(lines) + "\n"
    else:
        return 404, "Not found.\n"
    try:
        with open(path, encoding="utf-8") as fh:
            return 200, fh.read()
    except OSError:
        return 404, "That file is not on this machine.\n"

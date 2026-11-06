"""The gate: a species file is taken through rounds. A round is asked for by a maker at one file hash, each of its six sheets gets a tick from a reviewer, then the reviewer signs and then the owner signs.
The record is a sidecar next to the species file, `gate/<id>.json` (the file itself is hashed whole, so a signature written into it would change the hash it signs). The workbench writes it and nothing else does.
  rounds[]: {round, file_hash, asked_by, asked_at, rows: {sheet: {tick, by, at}}, note, reviewer: {name, at, hash} | null, owner: {...} | null, verdict: null | "back" | "superseded", voided: null | {at, by, hash}}
A signature counts only while the file's hash is the one it signed: any change to the species after signing voids both (`valid` is worked out from the hash now, and the edit that did it is stamped on the round).
Who may do what is decided here and in the server's routes, never in the page: a maker (and any agent token, whatever its role) asks for a round and cannot tick, send back or sign; the reviewer signs first, the owner last; the person who asked for the round never signs it."""
import copy
import json
import os
import threading

from wb import hashing as H, store as S

SCHEMA = "gate-1"
SHEETS = [("turnaround", "Turnaround"), ("before-after", "Before and after"), ("joins", "Joins"), ("twelve", "The twelve"), ("motion", "Motion"), ("close-up", "Close-up")]
SHEET_IDS = [i for i, _ in SHEETS]
# A language file (mb-species/2, not a fixture) also has the language sheet and the eight judgement rows of the language: each is a tick only the reviewer gives, like every judgement row. Selecting one shows the language sheet.
# OWED to the copywriter: the wording is the language's own (the design's list of rows); the row names on screen are hers to settle.
LANGUAGE = ("language", "Language")
JUDGEMENTS = [("odd-with-a-thought", "Odd, with a thought behind the eyes"), ("nothing-acted", "Nothing acted"), ("no-real-animal", "Never a real animal you can name"), ("clean-silhouette", "Clean silhouette"),
              ("own-species-face", "Faces read as their own species"), ("anatomy-makes-sense", "Anatomy makes sense"), ("nothing-sad", "Nothing sad, sick or scary"), ("no-seams", "No seams")]
LABELS = dict(SHEETS + [LANGUAGE] + JUDGEMENTS)
JUDGEMENT_IDS = [i for i, _ in JUDGEMENTS]
LOCK = threading.RLock()


def gate_dir(species_path):
    return os.path.join(os.path.dirname(os.path.abspath(species_path)), "gate")


def record_path(species_path, sid):
    return os.path.join(gate_dir(species_path), f"{sid}.json")


def sid_of(species_path):
    return os.path.basename(species_path)[:-5]


def read(species_path):
    p = record_path(species_path, sid_of(species_path))
    if not os.path.exists(p):
        return dict(schema=SCHEMA, species=sid_of(species_path), rounds=[])
    with open(p) as fh:
        return json.load(fh)


def write(species_path, rec):
    os.makedirs(gate_dir(species_path), exist_ok=True)
    p = record_path(species_path, sid_of(species_path))
    tmp = p + ".wbtmp"
    with open(tmp, "w") as fh:
        json.dump(rec, fh, indent=1)
    os.replace(tmp, p)


def snapshot_path(species_path, n):
    return os.path.join(gate_dir(species_path), sid_of(species_path), f"round-{n}.json")


def read_snapshot(species_path, n):
    p = snapshot_path(species_path, n)
    if not os.path.exists(p):
        return None
    with open(p) as fh:
        return json.load(fh)


def file_hash(spec):
    return H.hash_of(spec)


def refuse(status, msg, field="gate", **extra):
    raise S.ApiError(status, msg, field, **extra)


def can_judge(actor):
    """Ticks, sending back and signatures: reviewer and owner tokens that are not agents."""
    return bool(actor) and actor.get("role") in ("reviewer", "owner") and not actor.get("agent")


def need_judge(actor):
    if not actor or actor.get("role") == "maker" or actor.get("agent"):
        who = "an agent token" if actor and actor.get("agent") else "a maker token"
        refuse(403, f"refused: {who} cannot tick, send back or sign; the reviewer signs first and the owner last", "role")
    if actor.get("role") not in ("reviewer", "owner"):
        refuse(403, "refused: only a reviewer or the owner can tick, send back or sign", "role")


def is_language(spec):
    """A file the language checks apply to: schema mb-species/2, and not a fixture of the registry."""
    return isinstance(spec, dict) and spec.get("schema") == "mb-species/2" and not is_fixture(spec.get("id"))


def is_fixture(species_id):
    import species_v1 as V1
    return V1.is_fixture(species_id)


def row_ids(spec):
    return SHEET_IDS + [LANGUAGE[0]] + JUDGEMENT_IDS if is_language(spec) else list(SHEET_IDS)


def ticked(r):
    return sum(1 for i in r["rows"] if r["rows"][i].get("tick"))


def judged(r, spec_hash):
    """A round's state words, from the hash now."""
    live = r["file_hash"] == spec_hash
    rev = r.get("reviewer")
    own = r.get("owner")
    out = dict(live=live, reviewer_valid=bool(rev) and rev["hash"] == spec_hash, owner_valid=bool(own) and own["hash"] == spec_hash)
    out["signed"] = out["reviewer_valid"] and out["owner_valid"]
    out["voided"] = bool(rev or own) and not live
    out["ticked"] = ticked(r)
    return out


def public(rec, spec_hash):
    rounds = []
    for r in rec["rounds"]:
        rr = copy.deepcopy(r)
        rr["state"] = judged(r, spec_hash)
        rr["sheets"] = [dict(id=i, label=LABELS.get(i, i), **({"on": LANGUAGE[0]} if i in JUDGEMENT_IDS else {}), **(r["rows"].get(i) or dict(tick=False))) for i in r["rows"]]
        rounds.append(rr)
    cur = rounds[-1] if rounds else None
    return dict(schema=SCHEMA, species=rec["species"], hash=spec_hash, rounds=rounds, current=cur["round"] if cur else None,
                signed=bool(cur and cur["state"]["signed"]), sheets=[dict(id=i, label=LABELS.get(i, i)) for i in (cur["rows"] if cur else SHEET_IDS)])


def current_round(rec):
    return rec["rounds"][-1] if rec["rounds"] else None


def request(species_path, spec, actor):
    """A maker asks for a round at the file's hash: the open round at this hash is returned again; otherwise a new round starts and the one before is closed as superseded."""
    with LOCK:
        rec = read(species_path)
        h = file_hash(spec)
        cur = current_round(rec)
        if cur and cur["file_hash"] == h and not cur.get("verdict"):
            return cur, False
        if cur and not cur.get("verdict"):
            cur["verdict"] = "superseded"
        n = (cur["round"] if cur else 0) + 1
        r = dict(round=n, file_hash=h, asked_by=(actor or {}).get("name", "unknown"), asked_at=S.now(), rows={i: dict(tick=False) for i in row_ids(spec)}, note="", reviewer=None, owner=None, verdict=None, voided=None)
        rec["rounds"].append(r)
        os.makedirs(os.path.dirname(snapshot_path(species_path, n)), exist_ok=True)
        with open(snapshot_path(species_path, n), "w") as fh:
            json.dump(spec, fh)
        write(species_path, rec)
        return r, True


def _round(rec, n, spec):
    r = next((x for x in rec["rounds"] if x["round"] == n), None)
    if r is None:
        refuse(404, f"round {n} does not exist", "round")
    if r is not current_round(rec):
        refuse(409, f"round {n} is closed; the open one is round {current_round(rec)['round']}", "round")
    if r.get("verdict"):
        refuse(409, f"round {n} was {'sent back' if r['verdict'] == 'back' else r['verdict']}; ask for a new one", "round")
    if r["file_hash"] != file_hash(spec):
        refuse(409, f"the file changed after round {n} was asked for; ask for a new round", "hash")
    return r


def tick(species_path, spec, n, row, on, note, actor):
    need_judge(actor)
    with LOCK:
        rec = read(species_path)
        r = _round(rec, n, spec)
        if row == "note":
            r["note"] = str(note or "")[:2000]
        else:
            if row not in r["rows"]:
                refuse(404, f"no such sheet: {row}", "row")
            if r.get("reviewer"):
                refuse(409, "the reviewer has signed; the ticks are locked", "row")
            r["rows"][row] = dict(tick=bool(on), by=actor["name"], at=S.now())
            if note is not None:
                r["note"] = str(note)[:2000]
        write(species_path, rec)
        return r


def back(species_path, spec, n, note, actor):
    need_judge(actor)
    with LOCK:
        rec = read(species_path)
        r = _round(rec, n, spec)
        r["verdict"] = "back"
        r["note"] = str(note if note is not None else r.get("note", ""))[:2000]
        r["sent_back_by"] = actor["name"]
        write(species_path, rec)
        return r


def sign(species_path, spec, n, actor):
    """The reviewer signs first (every sheet ticked), the owner second (the reviewer's signature on the same hash). Nobody signs a round they asked for."""
    need_judge(actor)
    with LOCK:
        rec = read(species_path)
        r = _round(rec, n, spec)
        h = file_hash(spec)
        if actor["name"] == r["asked_by"]:
            refuse(403, "refused: the maker never signs; this round was asked for by " + r["asked_by"], "role")
        stamp = dict(name=actor["name"], at=S.now(), hash=h)
        if actor["role"] == "reviewer":
            if r.get("reviewer"):
                refuse(409, "the reviewer has already signed this round", "sign")
            if ticked(r) < len(r["rows"]):
                refuse(409, f"{ticked(r)} of {len(r['rows'])} sheets are ticked; the reviewer signs when all are", "sign")
            r["reviewer"] = stamp
        else:
            if not r.get("reviewer"):
                refuse(409, "the reviewer signs first, the owner last", "sign")
            if r["reviewer"]["hash"] != h:
                refuse(409, "the reviewer's signature is not on this file", "sign")
            if r.get("owner"):
                refuse(409, "the owner has already signed this round", "sign")
            r["owner"] = stamp
        write(species_path, rec)
        return r


def note_edit(species_path, spec_hash, actor_name):
    """The file changed: a round with signatures on another hash is stamped as voided by this edit (the hash comparison would void it anyway; this records who and when)."""
    with LOCK:
        if not os.path.exists(record_path(species_path, sid_of(species_path))):
            return False
        rec = read(species_path)
        r = current_round(rec)
        if not r or r.get("voided") or not (r.get("reviewer") or r.get("owner")) or r["file_hash"] == spec_hash:
            return False
        r["voided"] = dict(at=S.now(), by=actor_name, hash=spec_hash)
        write(species_path, rec)
        return True


def blockers(species_path, spec):
    """Why a release is not allowed by the gate, one line each (empty when both signatures are on the file as it is)."""
    if species_path is None or not os.path.exists(record_path(species_path, sid_of(species_path))):
        return ["no round was asked for"] if species_path else []
    rec = read(species_path)
    r = current_round(rec)
    if not r:
        return ["no round was asked for"]
    j = judged(r, file_hash(spec))
    out = []
    if r.get("verdict"):
        out.append(f"round {r['round']} was sent back")
    elif not j["live"] and (r.get("reviewer") or r.get("owner")):
        out.append(f"the file changed after round {r['round']} was signed")
    elif not j["live"]:
        out.append(f"the file changed after round {r['round']} was asked for")
    else:
        if not r.get("reviewer"):
            out.append(f"round {r['round']}: the reviewer has not signed")
        elif not r.get("owner"):
            out.append(f"round {r['round']}: the owner has not signed")
    return out


def is_signed(species_path, spec):
    if species_path is None or not os.path.exists(record_path(species_path, sid_of(species_path))):
        return False
    r = current_round(read(species_path))
    return bool(r) and not r.get("verdict") and judged(r, file_hash(spec))["signed"]

"""Vivarium rooms 2-4: running totals from log/calls.jsonl and log/spend.json, and the plan's stop lines (ad-rooms-briefs.md §1, §4 rule 6).
python3 -I tools/roomstatus.py [ROUND_REQUESTS ROOM...] -> totals; with a round, exit 1 if the round's reserve at RES MXN a request would pass a line."""
import os, sys, json, datetime
from zoneinfo import ZoneInfo
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
ROOMS = ("reeds", "boulders", "ferns"); JOB, ROOM, CAP, RES = 300.0, 100.0, 250.0, 5.30   # owner 18:23 "ok to both": job 300, rooms 100, reserve 5.30
DAYLINE = {"2026-10-26": (25, 120.0)}            # P1: 25 requests / 120 MXN; P2: the job ceiling
def room_of(n):
    for r in ROOMS:
        if f"-{r}-" in n: return r
calls = [json.loads(l) for l in open("log/calls.jsonl")]
mine = [c for c in calls if c.get("name") and (c["name"].startswith(("idle-vivarium-", "vivarium-near-", "options-"))) and room_of(c["name"])]
today = datetime.datetime.now(ZoneInfo("America/Los_Angeles")).date().isoformat()
def pday(c): return datetime.datetime.strptime(c["time"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc).astimezone(ZoneInfo("America/Los_Angeles")).date().isoformat()
job = sum(c["costMxn"] or 0 for c in mine); per = {r: sum(c["costMxn"] or 0 for c in mine if room_of(c["name"]) == r) for r in ROOMS}
jd = [c for c in mine if pday(c) == today]; jday = sum(c["costMxn"] or 0 for c in jd)
spend = json.load(open("log/spend.json")); dall = sum(float(r.get("mxn") or 0) for r in spend if r.get("pacific_day") == today)
print(json.dumps({"pacific_day": today, "job_requests": len(mine), "job_mxn": round(job, 2), "rooms_mxn": {k: round(v, 2) for k, v in per.items()},
                  "job_today_requests": len(jd), "job_today_mxn": round(jday, 2), "pacific_day_all_work_mxn": round(dall, 2)}))
if len(sys.argv) > 1:
    n = int(sys.argv[1]); rooms = sys.argv[2:]; bad = []
    if job + n * RES > JOB + 1e-9: bad.append(f"job {job:.2f} + {n}x{RES} > {JOB}")
    for r in rooms:
        k = rooms.count(r)
        if per[r] + k * RES > ROOM + 1e-9: bad.append(f"room {r} {per[r]:.2f} + {k}x{RES} > {ROOM}")
    if today in DAYLINE:
        mr, mm = DAYLINE[today]
        if len(jd) + n > mr: bad.append(f"day requests {len(jd)} + {n} > {mr}")
        if jday + n * RES > mm + 1e-9: bad.append(f"day {jday:.2f} + {n}x{RES} > {mm}")
    if dall + n * RES > CAP + 1e-9: bad.append(f"Pacific day all work {dall:.2f} + {n}x{RES} > {CAP}")
    print("STOP: " + "; ".join(bad) if bad else "reserve OK"); sys.exit(1 if bad else 0)

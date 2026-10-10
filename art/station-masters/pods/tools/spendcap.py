"""The owner's standing rule (relayed by the programme lead, 2026-10-09): image and pixel generation (Gemini and Retro Diffusion together) may not spend more than 250 MXN per Pacific day without the owner's approval.
exec'd by gen.py and rd.py (no import under python3 -I). Money is counted from real tokens, per REQUEST (never per job):
  * a Gemini request is PRE-CHECKED at a worst case of 0.24 USD (the 4K image price): if the Pacific day's total plus that would pass the cap, the request is not made;
  * after it returns, its REAL cost is booked from the response's usageMetadata: prompt tokens at 2 USD per million, candidate (image output) tokens plus thought (thinking) tokens at 120 USD per million (the published Pro image rates,
    as given by the owner's console via the lead); a request that returned HTTP 200 without usageMetadata is booked at the worst case; a non-200 request is booked at 0 (not billed), logged all the same;
  * 20 MXN per USD, Pacific day (America/Los_Angeles), cap 250 MXN, ledger log/spend.json.
Rates are per model class; the model id is always written in the job, never read from the environment. Nano Banana 2 (Gemini 3.1 Flash Image) is priced from its own usage: its rates below are a PLACEHOLDER equal to the Pro rates (safe, an over-estimate)
until the lead gives the published ones."""
import json, os, threading, datetime
from zoneinfo import ZoneInfo
CAP_MXN = 250.0; MXN_PER_USD = 20.0; WORST_CASE_USD = 0.24
RATES = {"pro-image": {"input": 2.0, "output": 120.0, "thinking": 120.0},                       # USD per million tokens
         "flash-image": {"input": 2.0, "output": 120.0, "thinking": 120.0, "placeholder": True}}  # PLACEHOLDER until the published Nano Banana 2 rates are given
_LOCK = threading.Lock()
def rate_class(model):
    m = model.lower()
    if "pro-image" in m: return "pro-image"
    if "flash-image" in m: return "flash-image"
    raise ValueError(f"unknown image model id {model!r}: the cap needs its rates")
def pacific_day(now=None): return (now or datetime.datetime.now(datetime.timezone.utc)).astimezone(ZoneInfo("America/Los_Angeles")).date().isoformat()
def _rows(path): return json.load(open(path)) if os.path.exists(path) else []
def day_total(path, day=None):
    day = day or pacific_day(); return sum(float(r.get("mxn") or 0) for r in _rows(path) if r.get("pacific_day") == day)
def precheck(path, worst_usd=WORST_CASE_USD, now=None):
    """May a request that could cost up to worst_usd be made? Returns (allowed, the day's running total in MXN)."""
    total = day_total(path, pacific_day(now)); return total + worst_usd * MXN_PER_USD <= CAP_MXN + 1e-9, total
def real_cost_usd(model, usage, http_status):
    """The real cost of one Gemini request from its usageMetadata (a dict with promptTokenCount, candidatesTokenCount, thoughtsTokenCount)."""
    if http_status != 200: return 0.0
    if not usage: return WORST_CASE_USD
    r = RATES[rate_class(model)]; pt = usage.get("promptTokenCount") or 0; ct = usage.get("candidatesTokenCount") or 0; tt = usage.get("thoughtsTokenCount") or 0
    return (pt * r["input"] + ct * r["output"] + tt * r["thinking"]) / 1e6
def book(path, tool, tag, usd, extra=None, now=None):
    """Book a real cost after the request returned."""
    with _LOCK:
        rows = _rows(path); t = now or datetime.datetime.now(datetime.timezone.utc)
        rows.append({"tag": tag, "tool": tool, "usd": round(usd, 6), "mxn": round(usd * MXN_PER_USD, 4), "mxn_per_usd": MXN_PER_USD, "pacific_day": pacific_day(t), "time": t.strftime("%Y-%m-%dT%H:%M:%SZ"), **(extra or {})})
        json.dump(rows, open(path, "w"), indent=1)
def charge(path, tool, tag, usd, now=None):
    """A call with a known fixed price (Retro Diffusion, from its own check_cost): pre-check and book in one step before the call. Returns (allowed, total_after_or_current)."""
    with _LOCK:
        allowed, total = precheck(path, usd, now)
    if not allowed: return False, total
    book(path, tool, tag, usd, {"evidence": "charged before the call at the price check_cost returned"}, now); return True, total + usd * MXN_PER_USD

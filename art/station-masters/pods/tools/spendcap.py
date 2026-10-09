"""The owner's standing rule (relayed by the programme lead, 2026-10-09): image and pixel generation (Gemini and Retro Diffusion together) may not spend more than 250 MXN per Pacific day without the owner's approval.
Before every call its list price in MXN is added to that Pacific day's running total in log/spend.json (the console bills by Pacific day); a call that would take the day past the cap is not made. exec'd by gen.py and rd.py (no import under -I).
Prices (to confirm with the lead): GEMINI_IMAGE_USD, the gemini-3-pro-image list price per 1K image (default 0.134 USD); MXN_PER_USD (default 20, a round-up); Retro Diffusion is charged at the price its own check_cost returns."""
import json, os, threading, datetime
from zoneinfo import ZoneInfo
CAP_MXN = 250.0; MXN_PER_USD = float(os.environ.get("MXN_PER_USD", "20")); GEMINI_IMAGE_USD = float(os.environ.get("GEMINI_IMAGE_USD", "0.134")); _LOCK = threading.Lock()
def pacific_day(now=None): return (now or datetime.datetime.now(datetime.timezone.utc)).astimezone(ZoneInfo("America/Los_Angeles")).date().isoformat()
def day_total(path, day=None):
    day = day or pacific_day(); rows = json.load(open(path)) if os.path.exists(path) else []
    return sum(float(r.get("mxn") or 0) for r in rows if r.get("pacific_day") == day)
def charge(path, tool, tag, usd, now=None):
    """Add one call's list price to the Pacific day's total, before the call. Returns (allowed, total_after_or_current). A refused call adds nothing."""
    mxn = usd * MXN_PER_USD
    with _LOCK:
        rows = json.load(open(path)) if os.path.exists(path) else []; day = pacific_day(now); total = sum(float(r.get("mxn") or 0) for r in rows if r.get("pacific_day") == day)
        if total + mxn > CAP_MXN + 1e-9: return False, total
        rows.append({"tag": tag, "tool": tool, "usd": usd, "mxn": round(mxn, 4), "mxn_per_usd": MXN_PER_USD, "pacific_day": day, "time": (now or datetime.datetime.now(datetime.timezone.utc)).strftime("%Y-%m-%dT%H:%M:%SZ"), "evidence": "charged before the call at list price"})
        json.dump(rows, open(path, "w"), indent=1); return True, total + mxn

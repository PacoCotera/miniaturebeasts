"""Writes slices/status.json (and the status fields of slices/manifest.json): one status per slice, with the pass that signed it, for the builder's
place-masters tool. Reconciled with the art director's consolidated list (2026-10-08). python3 -I tools/status.py"""
import json, re
m = json.load(open("slices/manifest.json")); S = {}
FR = {"120x112", "120x96", "184x104", "184x112", "184x256", "184x304", "376x264"}
def sign(n, status, sig, note=""): S[n] = {"status": status, "signed_in": sig, "note": note}
for n in m:
    if re.match(r"rail-tab-", n): sign(n, "signed", "pass 4")
    elif n in ("room-bench-stage", "room-cradle"): sign(n, "signed", "pass 4", "re-cut to the layout of design-pods-relayout 29b6dc9 (pool on x 632)" if n == "room-bench-stage" else "")
    elif n in ("room-cradle-front", "room-shelf"): sign(n, "signed", "pass 7b", "re-cut for the new rectangle (shelf 488,368,288,72)" if n == "room-shelf" else "")
    elif re.match(r"plate-name-\d+x24$", n): sign(n, "signed", "pass 7b", "the 20 px name on its plate (the 0.6 tone signed in pass 6)")
    elif re.match(r"pod-(large|medium|small)-", n): sign(n, "signed", "pass 6", "layers signed across passes 4 to 7b; the 33 are standing")
    elif n.startswith("pod-well-"): sign(n, "withdrawn", None, "re-cut to the 32x48 class (pass 8); awaiting verdict")
    elif n.startswith("trait-picture-frame-"):
        size = re.search(r"(\d+x\d+)", n).group(1); kind = "sealed" if n.endswith("-sealed") else "unread" if n.endswith("-unread") else "plain"
        if size in FR: sign(n, "signed", {"plain": "pass 3", "unread": "pass 4", "sealed": "pass 6"}[kind])
        elif size == "232x312": sign(n, "signed", "pass 6", "the portrait frame and its states" + ("" if kind != "plain" else " (the plain frame is not named in the consolidated list; signed with its states in pass 6)"))
        else: sign(n, "new", None, "new size of design-pods-relayout 29b6dc9 (the Read page's grid); awaiting verdict")
    elif n in ("ring-column",): sign(n, "signed", "pass 1")
    elif n == "ring-hatch": sign(n, "signed", "pass 2", "the 112x56 slice of the earlier layout")
    elif n == "stamp-label-120x120": sign(n, "signed", "pass 1")
    elif re.match(r"plate-message-", n): sign(n, "signed", "pass 2")
    elif n in ("frame-top-bar-1024x40", "frame-bottom-line-1024x38"): sign(n, "signed", "pass 1", "excluded from placing (the frame redesign)")
    elif re.match(r"rail-emblem-(coat|face|stamina|glow|character)-", n): sign(n, "signed", "emblems round 3")
    elif re.match(r"rail-emblem-", n): sign(n, "new", None, "redrawn in emblems round 4; awaiting verdict")
    elif n == "page-pane-408x440": sign(n, "withdrawn", None, "signed in pass 1, withdrawn with the page's re-layout (the Read page is 256 wide); Compare still uses 408")
    elif n == "room-stamp-case": sign(n, "withdrawn", None, "the old 176x328 size; the case is now 152x152")
    elif n == "room-stamp-case-152x152": sign(n, "new", None, "the case at its new size (design-pods-relayout 29b6dc9); awaiting verdict")
    elif n in ("ring-column-112x522", "ring-hatch-80x56", "page-pane-256x440"): sign(n, "new", None, "re-cut for design-pods-relayout 29b6dc9 (the list column at 112, the Read page at 256); awaiting verdict")
    elif n == "ring-well-empty": sign(n, "withdrawn", None, "until the new ring masters are signed")
    elif re.match(r"ring-well-(selected|idle)|ring-arc-|glint-star", n): sign(n, "new", None, "the well rings from the concept; awaiting verdict")
    else: sign(n, "stand-in" if False else "unclassified", None, "")
json.dump(S, open("slices/status.json", "w"), indent=1)
for n, v in S.items(): m[n].update({"status": v["status"], "signed_in": v["signed_in"], "status_note": v["note"]})
json.dump(m, open("slices/manifest.json", "w"), indent=1)
from collections import Counter; print(Counter(v["status"] for v in S.values())); print([n for n, v in S.items() if v["status"] == "unclassified"])

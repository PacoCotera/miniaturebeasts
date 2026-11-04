"""Chunk 13: the play surface (spec 2.3 to 2.5, 8.2 and 8.3). What play may change of a species, worked out from the plan's declaration and the file alone: no build, no render.

A body plan declares up to six TOYS (`SURFACE`). A toy has axes; an axis is one gene of the file, either a range (a slider or the paint pots: 5 to 8 steps between the gene's hard limits) or a choice (picture chips: the gene's alleles).
The species file's `play` field may relabel a toy, hide it or narrow an axis, never widen it: `validate(doc)` refuses a widening and names the field. `play.state` is the mibi's own setting of each axis (the player's edit, a strict subset of what
studio can write), `play.words` the species' own limit sentences, `play.starter` whether the mibi is a starter.

`toys_of(doc, sweep)` is the effective surface the page draws: every step of every axis with its value, its picture end (the genome that builds it) and whether the safe-step sweep trimmed it.
`sweep(doc, fails_of)` is the sweep itself: the corners of the toys' step box, built as clay by the caller's `fails_of(states)`, and every step that fails at a corner trimmed. `sentence_of(doc, check)` is the one sentence play says for a check.

The plan modules own `SURFACE` and `BUILT` from chunk 26; until then the table lives here, as `spine.PLANS` does."""
import copy
import itertools
import os
import sys
import time

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BODY not in sys.path:
    sys.path.insert(0, BODY)

VERSION = "play-1"                     # part of the sweep's cache key: bump to re-sweep everything
MAX_TOYS = 7                   # five toys that shape the mibi on P2 and two that belong to the pods on P3 (How different?, Grow)


def rng(id, locus, steps, label=None, cage=True):
    return dict(id=id, kind="range", locus=locus, steps=steps, label=label or id, cage=cage)


def pick(id, locus, options, label=None, cage=True):
    return dict(id=id, kind="choice", locus=locus, options=options, label=label or id, cage=cage)


def dial(id, field, options, default, label=None):
    """A toy axis that is not a gene: the setting lives in the file's `play` block (`play.diff`, `play.grow`), is never built or swept and has no picture of its own."""
    return dict(id=id, kind="choice", locus=f"play.{field}", options=options, label=label or id, cage=False, virtual=True, default=default)


# The surface of a plan: each toy's id, its name in play (the copywriter's: words.md pl.toy.*), its kind, the parts of the body it moves (the checks of those parts are the ones that can stop it) and its axes.
# The quadruped's is alike (spec 2.3): the same toys on the same named ranges, against the genes its file carries (a toy whose genes the file does not have is left out).
_TOYS = [
    dict(id="body", label="Body", kind="slider", parts=["head", "neck", "back", "arms", "legs"], axes=[rng("size", "form.torso-girth", 7)]),
    dict(id="ears", label="Ears", kind="chips+slider", parts=["head", "ears"], axes=[pick("kind", "form.ear-kind", ["prick", "lop", "nub"]), rng("size", "form.ear-length", 7)]),
    dict(id="tail", label="Tail", kind="slider+chips", parts=["tail", "seat", "legs"], axes=[rng("length", "form.tail-length", 7), rng("curl", "form.tail-curl", 5), pick("tip", "anatomy.tail-tip-form", ["lantern", "tuft", "plain"])]),
    dict(id="paint", label="Paint", kind="pots", parts=[], axes=[rng("hue", "appearance.body-hue", 8, cage=False)]),
    dict(id="pattern", label="Pattern", kind="chips", parts=[], axes=[pick("kind", "appearance.pattern-kind", ["none", "spots", "labyrinth", "rings"], cage=False)]),
    # the pods' toys (chunk 15, spec 2.3): the width of the genes' pools for the babies, and the age at which the babies are shown (life stages: the ids are the file's, play says young, grown, elder)
    dict(id="diff", label="How different?", kind="dial", screen="pods", parts=[], axes=[dial("width", "diff", ["alike", "some", "wild"], "some")]),
    dict(id="grow", label="Grow", kind="grow", screen="pods", parts=[], axes=[dial("age", "grow", ["juvenile", "adult", "elder"], "juvenile")]),
]
SURFACE = {"biped": _TOYS, "quadruped": _TOYS}
BUILT = {"biped": True, "quadruped": False}            # whether the plan has a cage builder yet (the quadruped's is chunks 17-20)
# The words play says when a check stops a toy: the copywriter's (words.md "Play sentences (chunk 13)", ids pl.limit.*), one per check, true for every toy the check reaches and both ends of the toy. A few have a sentence for one toy, in TOY_WORDS.
# A check's own `play` sentence and the file's `play.words` come first. "loud" and "body" and "ears" belong to checks that are still to come.
WORDS = {"joins": "Then I wouldn't fit together any more!", "head.attach": "Then my head wouldn't sit straight!", "limbs": "My arms and legs need somewhere to hold on!"}
TOY_WORDS = {("joins", "body"): "Then my arms and legs wouldn't fit on!", ("joins", "ears"): "Then my ears wouldn't fit on my head!", ("joins", "tail"): "Then my tail wouldn't fit on right!",
             ("head.attach", "ears"): "With ears like these, my head wouldn't sit straight!", ("limbs", "tail"): "My legs need somewhere to hold on!"}
PLACEHOLDER = dict(body="Any rounder and I'd roll away!", ears="Big ears! Any bigger and I couldn't see.", loud="Ooh, that's more sparkle than I can carry!", default="That's as far as I can go!")
HOLD = "Hmm, that shape didn't work. Try another?"       # a build fails (words.md pl.wait.fail), also a placeholder


# ---------------------------------------------------------------------------------------------------------------------------- the file's loci and the plan's toys
def _entry(doc, locus):
    return next((e for e in ((doc.get("genome") or {}).get("loci") or []) if isinstance(e, dict) and e.get("locus") == locus), None)


def _bounds(e):
    """(lo, hi) of a blend's hard limits: the band, else the absolute pool."""
    b = e.get("band") or e.get("absolute") or {}
    return b.get("lo"), b.get("hi")


def plan_toys(doc):
    return SURFACE.get(doc.get("plan"), [])


def _file_toy(doc, tid):
    for t in ((doc.get("play") or {}).get("toys") or []):
        if isinstance(t, dict) and t.get("id") == tid:
            return t
    return {}


def _axis_plan(doc, ax):
    """The plan's ends of an axis as this file carries its gene: ('range', lo, hi) or ('choice', options), or None when the file has no such gene."""
    if ax.get("virtual"):
        return ("choice", list(ax["options"]))
    e = _entry(doc, ax["locus"])
    if e is None:
        return None
    if ax["kind"] == "range":
        if e.get("op") != "blend":
            return None
        lo, hi = _bounds(e)
        return ("range", lo, hi) if isinstance(lo, (int, float)) and isinstance(hi, (int, float)) else None
    if e.get("op") == "blend":
        return None
    return ("choice", [o for o in ax["options"] if o in (e.get("limits") or [])])


def steps_of(lo, hi, n):
    return [round(lo + (hi - lo) * i / (n - 1), 6) for i in range(n)]


def _narrowed(doc, toy, ax):
    """The axis as the file leaves it: ('range', lo, hi) or ('choice', options), inside the plan's. A narrowing that is not valid is ignored here (validate names it)."""
    base = _axis_plan(doc, ax)
    if base is None:
        return None
    nar = (_file_toy(doc, toy["id"]).get("narrow") or {}).get(ax["id"])
    if base[0] == "range":
        lo, hi = base[1], base[2]
        if isinstance(nar, dict):
            a, b = nar.get("lo", lo), nar.get("hi", hi)
            if all(isinstance(x, (int, float)) and not isinstance(x, bool) for x in (a, b)) and lo <= a <= b <= hi:
                lo, hi = a, b
        return ("range", lo, hi)
    opts = base[1]
    if isinstance(nar, dict) and isinstance(nar.get("only"), list):
        keep = [o for o in opts if o in nar["only"]]
        if keep:
            opts = keep
    return ("choice", opts)


def state_of(doc):
    return dict(((doc.get("play") or {}).get("state")) or {})


def home_of(doc, ax, eff):
    """The axis's current value: the mibi's own setting, else the type's (clamped into the axis)."""
    if ax.get("virtual"):
        v = (doc.get("play") or {}).get(ax["locus"].split(".", 1)[1], ax["default"]) if isinstance(doc.get("play"), dict) else ax["default"]
        return v if v in eff[1] else ax["default"]
    e = _entry(doc, ax["locus"])
    v = state_of(doc).get(ax["locus"], e.get("type") if e else None)
    if eff[0] == "range":
        v = float(v) if isinstance(v, (int, float)) else (eff[1] + eff[2]) / 2
        return min(eff[2], max(eff[1], v))
    return v if v in eff[1] else eff[1][0]


def nearest(values, v):
    return min(range(len(values)), key=lambda i: abs(values[i] - v))


def toys_of(doc, sweep=None):
    """The effective surface of a file, for the page and for `wb toys`: [{id, label, hidden, kind, parts, axes: [{id, locus, kind, label, cage, steps | options, home, ...}]}].
    A range axis lists `steps` (value, ok, picture) with `home` the step the mibi sits on; a choice lists `options` (id, ok, picture). `ok` is false for a step the sweep trimmed (`why`: the checks that failed at a corner). `sweep`: the stored result or None."""
    out = []
    sw = (sweep or {}).get("toys") or {}
    for toy in plan_toys(doc)[:MAX_TOYS]:
        ft = _file_toy(doc, toy["id"])
        axes = []
        for ax in toy["axes"]:
            eff = _narrowed(doc, toy, ax)
            if eff is None:
                continue
            s = (sw.get(toy["id"]) or {}).get(ax["id"]) or {}
            a = dict(id=ax["id"], locus=ax["locus"], kind=ax["kind"], label=ax["label"], cage=ax["cage"], locked=bool(s), virtual=bool(ax.get("virtual")))
            e = _entry(doc, ax["locus"])
            if ax["kind"] == "range":
                vals = steps_of(eff[1], eff[2], ax["steps"])
                h = nearest(vals, home_of(doc, ax, eff))
                lo_i, hi_i = s.get("lo", 0), s.get("hi", ax["steps"] - 1)
                why = {w["step"]: w["checks"] for w in s.get("trimmed", [])}
                a.update(unit=(e.get("band") or e.get("absolute") or {}).get("unit", ""), home=h, steps=[dict(i=i, value=v, ok=lo_i <= i <= hi_i, why=why.get(i, []), end=dict(genome=f"set:{ax['locus']}={v}")) for i, v in enumerate(vals)])
            else:
                banned = {b["option"]: b["checks"] for b in s.get("banned", [])}
                h = home_of(doc, ax, eff)
                words = ((doc.get("variety") or {}).get("look_words") or {}).get(ax["locus"]) or {}
                a.update(home=h, options=[dict(id=o, word=words[o][1] if isinstance(words.get(o), list) and len(words[o]) == 2 else o, ok=o not in banned, why=banned.get(o, []), end=dict(genome=None if ax.get("virtual") else f"set:{ax['locus']}={o}")) for o in eff[1]])
            axes.append(a)
        if axes:
            out.append(dict(id=toy["id"], label=ft.get("label") if isinstance(ft.get("label"), str) and ft.get("label") else toy["label"], plain=toy["label"], hidden=bool(ft.get("hide")), kind=toy["kind"], screen=toy.get("screen", "shape"), parts=toy["parts"], axes=axes))
    return out


def toy_for_part(part):
    """The toy a part of the Edit outline feeds, for the Play column: ears, the tail and its tip, the coat's paint (the first toy that reads it)."""
    for t in SURFACE["biped"]:
        if part in t["parts"] and part not in ("head", "neck", "back", "seat", "legs", "arms"):
            return t["id"]
    return {"back": "body", "tip": "tail"}.get(part)


# ---------------------------------------------------------------------------------------------------------------------------- validation
def validate(doc):
    """The problems of the file's `play` field as (path, message), each naming the field: a widening (the toy's axis reaches beyond the plan's), an unknown toy or axis, a state outside the narrowed axis."""
    p = doc.get("play")
    if p is None:
        return []
    errs = []
    if not isinstance(p, dict):
        return [("play", "play: must be an object {toys, words, state, starter, name}")]
    for k in p:
        if k not in ("toys", "words", "state", "starter", "name", "diff", "grow", "genome", "parents", "kept"):
            errs.append((f"play.{k}", f"play.{k}: not a field of play (toys, words, state, starter, name, diff, grow, genome, parents, kept)"))
    for k, opts in (("diff", DIALS), ("grow", GROWS)):
        if k in p and p[k] not in opts:
            errs.append((f"play.{k}", f"play.{k}: one of {', '.join(opts)}"))
    if "genome" in p and not (isinstance(p["genome"], dict) and all(isinstance(v, list) and len(v) == 2 for v in p["genome"].values())):
        errs.append(("play.genome", "play.genome: the mibi's own copies, {record: [copy, copy]}"))
    if "parents" in p and not (isinstance(p["parents"], list) and all(isinstance(x, str) for x in p["parents"])):
        errs.append(("play.parents", "play.parents: the ids of the mibi's parents"))
    if "name" in p and not (isinstance(p["name"], str) and 0 < len(p["name"].strip()) <= 10):
        errs.append(("play.name", "play.name: the mibi's own name, one to ten letters"))
    if "starter" in p and not isinstance(p["starter"], bool):
        errs.append(("play.starter", "play.starter: must be true or false"))
    plan = {t["id"]: t for t in plan_toys(doc)}
    toys = p.get("toys", [])
    if not isinstance(toys, list):
        return errs + [("play.toys", "play.toys: must be a list of {id, label, hide, narrow}")]
    seen = set()
    for t in toys:
        if not isinstance(t, dict) or not isinstance(t.get("id"), str):
            errs.append(("play.toys", "play.toys: each toy is an object with an id"))
            continue
        tid = t["id"]
        path = f"play.toys.{tid}"
        if tid not in plan:
            errs.append((path, f"{path}: the {doc.get('plan')} plan has no toy '{tid}' (it has {', '.join(plan)}); a species cannot add a toy"))
            continue
        if tid in seen:
            errs.append((path, f"{path}: listed twice"))
        seen.add(tid)
        for k in t:
            if k not in ("id", "label", "hide", "narrow"):
                errs.append((f"{path}.{k}", f"{path}.{k}: not a field of a toy (id, label, hide, narrow)"))
        if "label" in t and not (isinstance(t["label"], str) and t["label"].strip()):
            errs.append((f"{path}.label", f"{path}.label: must be a word or two"))
        if "hide" in t and not isinstance(t["hide"], bool):
            errs.append((f"{path}.hide", f"{path}.hide: must be true or false"))
        nar = t.get("narrow", {})
        if not isinstance(nar, dict):
            errs.append((f"{path}.narrow", f"{path}.narrow: must be an object of axis to {{lo, hi}} or {{only}}"))
            continue
        axes = {a["id"]: a for a in plan[tid]["axes"]}
        for aid, n in nar.items():
            ap = f"{path}.narrow.{aid}"
            if aid not in axes:
                errs.append((ap, f"{ap}: the {tid} toy has no axis '{aid}' (it has {', '.join(axes)})"))
                continue
            base = _axis_plan(doc, axes[aid])
            if base is None:
                errs.append((ap, f"{ap}: this file has no gene {axes[aid]['locus']} for it"))
            elif not isinstance(n, dict):
                errs.append((ap, f"{ap}: must be an object, {{lo, hi}} for a slider or {{only: [...]}} for chips"))
            elif base[0] == "range":
                for k in n:
                    if k not in ("lo", "hi"):
                        errs.append((f"{ap}.{k}", f"{ap}.{k}: a slider is narrowed by lo and hi"))
                a, b = n.get("lo", base[1]), n.get("hi", base[2])
                for k, v, lim, op in (("lo", a, base[1], "below"), ("hi", b, base[2], "above")):
                    if k in n and not (isinstance(v, (int, float)) and not isinstance(v, bool)):
                        errs.append((f"{ap}.{k}", f"{ap}.{k}: must be a number"))
                    elif k in n and ((v < lim - 1e-9) if k == "lo" else (v > lim + 1e-9)):
                        errs.append((f"{ap}.{k}", f"{ap}.{k} is {v:g}, {op} the {doc.get('plan')} plan's {'lowest' if k == 'lo' else 'highest'} {lim:g} for the {tid} toy: a species may narrow a toy, never widen it"))
                if all(isinstance(x, (int, float)) and not isinstance(x, bool) for x in (a, b)) and a > b:
                    errs.append((ap, f"{ap}: lo {a:g} is above hi {b:g}"))
            else:
                for k in n:
                    if k != "only":
                        errs.append((f"{ap}.{k}", f"{ap}.{k}: chips are narrowed by only"))
                only = n.get("only")
                if not isinstance(only, list) or not only:
                    errs.append((f"{ap}.only", f"{ap}.only: a list of the chips that stay"))
                else:
                    for o in only:
                        if o not in base[1]:
                            errs.append((f"{ap}.only", f"{ap}.only: '{o}' is not a chip of the {tid} toy ({', '.join(base[1])}); a species may narrow a toy, never widen it"))
    words = p.get("words", {})
    if not isinstance(words, dict):
        errs.append(("play.words", "play.words: must be an object of check id to one sentence"))
    else:
        from checks import REGISTRY
        import checks.biped  # noqa: F401
        ids = {c.id for c in REGISTRY}
        for k, v in words.items():
            if k not in ids and k != "default":
                errs.append((f"play.words.{k}", f"play.words.{k}: no check '{k}' (checks: {', '.join(sorted(ids))})"))
            elif not (isinstance(v, str) and v.strip()):
                errs.append((f"play.words.{k}", f"play.words.{k}: must be one sentence"))
    st = p.get("state", {})
    if not isinstance(st, dict):
        errs.append(("play.state", "play.state: must be an object of gene to value"))
    else:
        by = {ax["locus"]: (t, ax) for t in plan.values() for ax in t["axes"] if not ax.get("virtual")}
        for locus, v in st.items():
            sp = f"play.state.{locus}"
            if locus not in by:
                errs.append((sp, f"{sp}: no toy moves this gene (the toys move {', '.join(by)})"))
                continue
            t, ax = by[locus]
            eff = _narrowed(doc, t, ax)
            if eff is None:
                errs.append((sp, f"{sp}: this file has no such gene"))
            elif eff[0] == "range":
                if not (isinstance(v, (int, float)) and not isinstance(v, bool)) or not (eff[1] - 1e-9 <= v <= eff[2] + 1e-9):
                    errs.append((sp, f"{sp} is {v!r}, outside the {t['id']} toy's reach {eff[1]:g} to {eff[2]:g}"))
            elif v not in eff[1]:
                errs.append((sp, f"{sp}: '{v}' is not one of the {t['id']} toy's chips ({', '.join(eff[1])})"))
    return errs


# ---------------------------------------------------------------------------------------------------------------------------- sentences
def sentence_of(doc, check_id, toy=None):
    """The one sentence play says when this check stops a toy, and where it came from: ('file' | 'check' | 'words', text). The file's own words come first, then the check's, then the copywriter's (for this toy, then for the check), then the default."""
    w = ((doc or {}).get("play") or {}).get("words") or {}
    if isinstance(w.get(check_id), str) and w[check_id].strip():
        return "file", w[check_id]
    from checks import REGISTRY
    import checks.biped  # noqa: F401
    c = next((c for c in REGISTRY if c.id == check_id), None)
    if c is not None and c.play:
        return "check", c.play
    if (check_id, toy) in TOY_WORDS:
        return "words", TOY_WORDS[(check_id, toy)]
    if check_id in WORDS:
        return "words", WORDS[check_id]
    if isinstance(w.get("default"), str) and w["default"].strip():
        return "file", w["default"]
    return "words", PLACEHOLDER["default"]


def slots(doc):
    """Every sentence slot play has: [{check, name, toy, axis, situation, source, sentence}], one for each cage check that can stop a toy (a check of a part the toy moves), in the order the checks list.
    `source` says who wrote the sentence: file, check (the AD's), or words (the copywriter's). A check of no part (vertices, normals, mesh) is never shown to a player: it is listed once with toy None."""
    from checks import REGISTRY
    import checks.biped  # noqa: F401
    out = []
    for c in REGISTRY:
        if c.stage != "cage":
            continue
        hit = [t for t in plan_toys(doc) if set(t["parts"]) & set(c.part)]
        for t in hit or [None]:
            src, text = sentence_of(doc, c.id, t["id"] if t else None)
            ax = next((a for a in t["axes"] if a["cage"]), None) if t else None
            out.append(dict(check=c.id, name=c.name, toy=t["label"] if t else None, axis=ax["id"] if ax else None,
                            situation=(f"the {t['label']} toy at the far end of a step the check refuses" if t else "no toy reaches it: a trimmed step says the default"), source=src, sentence=text))
    return out


# ---------------------------------------------------------------------------------------------------------------------------- the sweep
def axes_of(doc):
    """The sweep's axes: [{toy, id, locus, kind, steps | options, values}] for the axes that change the cage (paint and pattern are coat: clay is the same at every step)."""
    out = []
    for toy in plan_toys(doc)[:MAX_TOYS]:
        for ax in toy["axes"]:
            if not ax["cage"]:
                continue
            eff = _narrowed(doc, toy, ax)
            if eff is None:
                continue
            home = home_of(doc, ax, eff)
            if eff[0] == "range":
                vals = steps_of(eff[1], eff[2], ax["steps"])
                out.append(dict(toy=toy["id"], id=ax["id"], locus=ax["locus"], kind="range", n=len(vals), values=vals, home=nearest(vals, home), home_value=home))
            else:
                out.append(dict(toy=toy["id"], id=ax["id"], locus=ax["locus"], kind="choice", options=eff[1], home=home))
    return out


def genome_of(state, doc=None):
    """The genome selector of a state {locus: value or allele}; an empty state is the type (the home). For a kept mibi (`play.genome`), the selector of its own copies with the settings that differ from them put on top."""
    own = (doc.get("play") or {}).get("genome") if isinstance(doc, dict) and isinstance(doc.get("play"), dict) else None
    if own:
        mine = pod_values(doc)
        diff = {k: v for k, v in state.items() if k not in mine or (abs(float(v) - float(mine[k])) > 1e-6 if isinstance(v, (int, float)) and isinstance(mine[k], (int, float)) else v != mine[k])}
        return pod_selector(own, diff)
    items = [f"{k}={round(v, 6) if isinstance(v, float) else v}" for k, v in sorted(state.items())]
    return "set:" + ";".join(items) if items else "type"


def corner_states(axes, lo, hi, banned):
    """The corners of the step box as states {locus: value}: the box of every range axis at its two ends (2^n), and every other chip of a choice axis crossed with the ends of its own toy's ranges. The home value of an axis is left out of a state."""
    ranges = [a for a in axes if a["kind"] == "range"]
    ends = [[(a, lo[a["locus"]]), (a, hi[a["locus"]])] for a in ranges]
    states = []

    def make(pairs, extra=()):
        s = {}
        for a, i in list(pairs) + list(extra):
            s[a["locus"]] = a["values"][i] if a["kind"] == "range" else i
        return s
    for combo in itertools.product(*ends):
        states.append(make(combo))
    for c in (a for a in axes if a["kind"] == "choice"):
        for o in c["options"]:
            if o == c["home"] or o in banned.get(c["locus"], ()):
                continue
            mine = [[(a, lo[a["locus"]]), (a, hi[a["locus"]])] for a in ranges if a["toy"] == c["toy"]]
            for combo in itertools.product(*mine) if mine else [()]:
                s = make(combo)
                s[c["locus"]] = o
                states.append(s)
    seen, out = set(), []
    for s in states:
        k = tuple(sorted(s.items()))
        if k not in seen:
            seen.add(k)
            out.append(s)
    return out


def sweep(doc, fails_of, rounds=4, progress=None):
    """The safe-step sweep. `fails_of(states)` builds each state of a list as clay and answers, for each, the check ids that fail there and passed at the home (a list of lists, same order).
    The corners of the step box are built; a failing corner is trimmed one step at a time (the toy of the widest remaining reach first, at the end the corner sits on; a chip that is still failing at the home ranges is banned) until it passes;
    then the smaller box's corners are built again, until a round trims nothing (at most `rounds`). Returns {toys: {toy: {axis: {lo, hi, trimmed, banned}}}, builds, rounds, home_ok}."""
    t0 = time.time()
    axes = axes_of(doc)
    ranges = [a for a in axes if a["kind"] == "range"]
    lo = {a["locus"]: 0 for a in ranges}
    hi = {a["locus"]: a["n"] - 1 for a in ranges}
    banned = {}
    why = {a["locus"]: dict(lo={}, hi={}) for a in ranges}
    why_banned = {}
    memo = {}
    builds = [0]

    base = {k: v for k, v in state_of(doc).items() if k in {a["locus"] for a in axes}}

    def judge(states):
        need = [s for s in states if tuple(sorted(s.items())) not in memo]
        if need:
            res = fails_of([dict(base, **s) for s in need])
            builds[0] += len(need)
            for s, r in zip(need, res):
                memo[tuple(sorted(s.items()))] = r
            if progress:
                progress(builds[0])
        return [memo[tuple(sorted(s.items()))] for s in states]

    done_rounds = 0
    for _ in range(rounds):
        done_rounds += 1
        changed = False
        corners = corner_states(axes, lo, hi, banned)
        for c in corners:
            # an earlier corner of this round may have trimmed a step this one stands on: it moves in to the new end
            c = {k: (next(a for a in ranges if a["locus"] == k)["values"][min(hi[k], max(lo[k], next(a for a in ranges if a["locus"] == k)["values"].index(v)))] if k in lo else v) for k, v in c.items()}
            f = judge([c])[0]
            while f:
                # the range axes this corner holds at a trimmable end, widest reach first
                def candidates(blame):
                    out = []
                    for a in ranges:
                        k = a["locus"]
                        if k not in c or (blame is not None and a["toy"] not in blame):
                            continue
                        i = a["values"].index(c[k])
                        if i == lo[k] and lo[k] < a["home"]:
                            out.append((a["home"] - lo[k], a, "lo"))
                        elif i == hi[k] and hi[k] > a["home"]:
                            out.append((hi[k] - a["home"], a, "hi"))
                    return out
                blame = culprits(f)
                cand = candidates(blame) or candidates(None)
                if len(cand) > 1:
                    # more than one toy stands at an end here: put each back home alone, and blame the ones whose return makes the corner pass (none alone: all of them)
                    back = judge([{k: v for k, v in c.items() if k != a["locus"]} for _, a, _ in cand])
                    cand = [x for x, r in zip(cand, back) if not r] or cand
                if cand:
                    _, a, side = max(cand, key=lambda x: x[0])
                    k = a["locus"]
                    why[k][side].setdefault(lo[k] if side == "lo" else hi[k], sorted(f))
                    if side == "lo":
                        lo[k] += 1
                    else:
                        hi[k] -= 1
                    c = dict(c, **{k: a["values"][lo[k] if side == "lo" else hi[k]]})
                    changed = True
                else:
                    ch = next((a for a in axes if a["kind"] == "choice" and a["locus"] in c and (blame is None or a["toy"] in blame)), None) or next((a for a in axes if a["kind"] == "choice" and a["locus"] in c), None)
                    if ch is None:
                        break
                    banned.setdefault(ch["locus"], set()).add(c[ch["locus"]])
                    why_banned[(ch["locus"], c[ch["locus"]])] = sorted(f)
                    changed = True
                    break
                f = judge([c])[0]
        if not changed:
            break
    toys = {}
    for a in axes:
        t = toys.setdefault(a["toy"], {})
        if a["kind"] == "range":
            k = a["locus"]
            tr = [dict(step=i, side=side, checks=ck) for side in ("lo", "hi") for i, ck in sorted(why[k][side].items())]
            t[a["id"]] = dict(locus=k, lo=lo[k], hi=hi[k], trimmed=tr)
            # steps trimmed on a side but without a recorded cause (one trim removes the steps between): record each removed step
            for i in range(0, lo[k]):
                if not any(x["step"] == i for x in tr):
                    tr.append(dict(step=i, side="lo", checks=next((x["checks"] for x in tr if x["side"] == "lo"), [])))
            for i in range(hi[k] + 1, a["n"]):
                if not any(x["step"] == i for x in tr):
                    tr.append(dict(step=i, side="hi", checks=next((x["checks"] for x in tr if x["side"] == "hi"), [])))
        else:
            t[a["id"]] = dict(locus=a["locus"], banned=[dict(option=o, checks=why_banned.get((a["locus"], o), [])) for o in sorted(banned.get(a["locus"], ()))])
    final = corner_states(axes, lo, hi, banned)
    bad = sum(1 for f in judge(final) if f)
    return dict(version=VERSION, toys=toys, builds=builds[0], rounds=done_rounds, corners=len(final), still_failing=bad, seconds=round(time.time() - t0, 2))


def culprits(check_ids):
    """The toys that can be blamed for these failing checks: those that move a part the check is about. A check about no part (vertices, normals, mesh) or a failed build blames every toy."""
    from checks import REGISTRY
    import checks.biped  # noqa: F401
    parts = set()
    for i in check_ids:
        c = next((c for c in REGISTRY if c.id == i), None)
        if c is None or not c.part:
            return None
        parts |= set(c.part)
    return {t["id"] for t in SURFACE["biped"] if set(t["parts"]) & parts}


def unbuilt(doc):
    """What the sweep says for a plan that has no cage builder yet: nothing is built and nothing trimmed; every step is `unchecked`."""
    return dict(version=VERSION, toys={}, builds=0, rounds=0, corners=len(corner_states(axes_of(doc), {a["locus"]: 0 for a in axes_of(doc) if a["kind"] == "range"}, {a["locus"]: a["n"] - 1 for a in axes_of(doc) if a["kind"] == "range"}, {})),
                still_failing=0, seconds=0.0, unbuilt=True, note=f"the {doc.get('plan')} plan has no cage builder yet (chunks 17-20): its toys are declared and its steps are listed, but none can be built, so none is checked or trimmed")


# ---------------------------------------------------------------------------------------------------------------------------- a play edit
def edit_ops(doc, toy_id, axis_id, to):
    """The JSON patch of one play move: the toy's axis set to step `to` (an index for a slider, a chip's id for chips). Raises ValueError (with the field) for a step the file's play does not reach."""
    toy = next((t for t in plan_toys(doc) if t["id"] == toy_id), None)
    if toy is None:
        raise ValueError(f"no toy '{toy_id}'")
    ax = next((a for a in toy["axes"] if a["id"] == axis_id), None)
    if ax is None:
        raise ValueError(f"the {toy_id} toy has no axis '{axis_id}'")
    if (_file_toy(doc, toy_id) or {}).get("hide"):
        raise ValueError(f"the {toy_id} toy is hidden in this file")
    eff = _narrowed(doc, toy, ax)
    if eff is None:
        raise ValueError(f"this file has no gene {ax['locus']}")
    if ax.get("virtual"):
        if to not in eff[1]:
            raise ValueError(f"{toy_id}.{axis_id}: '{to}' is not one of {', '.join(eff[1])}")
        key = ax["locus"].split(".", 1)[1]
        if not isinstance(doc.get("play"), dict):
            return [dict(op="add", path="/play", value={key: to})]
        return [dict(op="add", path=f"/play/{key}", value=to)]
    if eff[0] == "range":
        vals = steps_of(eff[1], eff[2], ax["steps"])
        if not isinstance(to, int) or isinstance(to, bool) or not 0 <= to < len(vals):
            raise ValueError(f"{toy_id}.{axis_id}: step {to!r} is not one of 0 to {len(vals) - 1}")
        v = vals[to]
    else:
        if to not in eff[1]:
            raise ValueError(f"{toy_id}.{axis_id}: '{to}' is not a chip ({', '.join(eff[1])})")
        v = to
    path = f"/play/state/{ax['locus'].replace('~', '~0').replace('/', '~1')}"
    if not isinstance(doc.get("play"), dict):
        return [dict(op="add", path="/play", value=dict(state={ax["locus"]: v}))]
    if not isinstance(doc["play"].get("state"), dict):
        return [dict(op="add", path="/play/state", value={ax["locus"]: v})]
    return [dict(op="add", path=path, value=v)]


def state_genome(doc):
    """The genome selector that builds the mibi as its toys have it: the file's `play.state`, or the type when it has none (a kept mibi: its own copies, with the toys' settings on top)."""
    return genome_of(state_of(doc), doc)


def step_state(doc, toy_id, axis_id, to):
    """The state the mibi would have after the move, as {locus: value}."""
    v = edit_ops(doc, toy_id, axis_id, to)[0]["value"]
    toy = next(t for t in plan_toys(doc) if t["id"] == toy_id)
    locus = next(a for a in toy["axes"] if a["id"] == axis_id)["locus"]
    return dict(state_of(doc), **{locus: v[locus] if isinstance(v, dict) and "state" not in v else (v["state"][locus] if isinstance(v, dict) else v)})


# ---------------------------------------------------------------------------------------------------------------------------- the warm set (spec 7)
def mibi_name(doc):
    """The mibi's own name: `play.name`, else the species file's own (a species with no mibi name is its species)."""
    n = (doc.get("play") or {}).get("name") if isinstance(doc.get("play"), dict) else None
    return n if isinstance(n, str) and n.strip() else (doc.get("name") or doc.get("id"))


def home_state(doc, sweep=None):
    """The mibi's setting of every axis it shows, as {locus: value}: the step it stands on (a range's value, a chip's id). Hidden toys have no setting."""
    out = {}
    for t in toys_of(doc, sweep):
        if t["hidden"]:
            continue
        for ax in t["axes"]:
            if not ax["virtual"]:
                out[ax["locus"]] = ax["steps"][ax["home"]]["value"] if ax["kind"] == "range" else ax["home"]
    return out


def warm_set(doc, sweep=None):
    """Every picture the page may need at once, as [{kind, toy, axis, step, genome}]: `step` the mibi with that one axis at that step (every other axis where the mibi stands), and `end` the toy's own end pictures
    (the type with only that value changed: the first and last step a slider reaches, every chip, every paint pot). A step the sweep trimmed is never listed. Each genome once."""
    base = home_state(doc, sweep)
    out, seen = [], set()

    def add(kind, toy, axis, step, genome):
        if genome not in seen:
            seen.add(genome)
            out.append(dict(kind=kind, toy=toy, axis=axis, step=step, genome=genome))
    for t in toys_of(doc, sweep):
        if t["hidden"]:
            continue
        for ax in t["axes"]:
            if ax["virtual"]:
                continue
            items = ax["steps"] if ax["kind"] == "range" else ax["options"]
            ok = [x for x in items if x["ok"]]
            for x in ok:
                v = x["value"] if ax["kind"] == "range" else x["id"]
                add("step", t["id"], ax["id"], x.get("i", v), genome_of({**base, ax["locus"]: v}, doc))
            ends = ok if (ax["kind"] == "choice" or t["id"] == "paint") else ok[:1] + ok[-1:]
            for x in ends:
                add("end", t["id"], ax["id"], x.get("i", x.get("id")), x["end"]["genome"])
    return out


# ---------------------------------------------------------------------------------------------------------------------------- pods and growing up (chunk 15, spec 2.1 from 3:00, 2.2 P3)
# A pod is a cross, never a breeding: one mibi alone sheds a pod of its own line (the game's shed pod: a cross of the mibi with itself), and two mibis cross only when they are not direct kin. Every pod holds the two copies of every record, so it is a
# whole genome of the file; the picture of a pod is the plush of that genome. The pods of one make come from the mibi, the dial and the round alone, so asking again gives the same six.
DIALS = ("alike", "some", "wild")
GROWS = ("juvenile", "adult", "elder")                   # the file's life stages; play says young, grown, elder
POD_COUNT = 6
SHED_TRIES = 24                                           # the game's: a pod that equals its parent is drawn again, and after this many draws there is no pod
# How different? is the width of the genes' pools for the babies, inside the hard limits (a position never leaves the pool, a look is only one of the pool's): `spread` is how far a blend moves from the parent, in shares of its pool; `redraw` is the chance
# that a copy of a look is drawn again from the pool instead of coming from the parent's two copies.
WIDTH = dict(alike=dict(spread=0.10, redraw=0.0), some=dict(spread=0.28, redraw=0.12), wild=dict(spread=0.55, redraw=0.35))


def pod_selector(copies, set_=None):
    """The genome selector of a whole genome of copies (and the toys' settings put on top): `pod:` and compact JSON."""
    import json
    o = dict(copies=copies)
    if set_:
        o["set"] = set_
    return "pod:" + json.dumps(o, sort_keys=True, separators=(",", ":"))


def _tables(doc):
    from wb import facade as F
    ispec = F.internal(doc)
    return F, ispec, F.tables(ispec)


def parent_copies(doc):
    """The mibi's two copies of every record as it stands: its own (a kept mibi, its toys' settings on top) or the type with its toys' settings."""
    F, ispec, tbl = _tables(doc)
    return F.genome_copies(F.resolve_genome(state_genome(doc), ispec), ispec)


def pod_values(doc):
    """What the kept mibi's own copies say at the toys' genes, as the toys read them: {locus: number or look}."""
    import genomeapply as GA
    import expressions as E
    g, own = doc["genome"], doc["play"]["genome"]
    out = {}
    for t in plan_toys(doc):
        for ax in t["axes"]:
            e = _entry(doc, ax["locus"])
            if ax.get("virtual") or e is None or ax["locus"] not in own:
                continue
            if ax["kind"] == "range":
                f, lo, hi = GA.blend_map(e)
                tm = (E._value(ax["locus"], own[ax["locus"]][0]) + E._value(ax["locus"], own[ax["locus"]][1])) / 2.0
                out[ax["locus"]] = GA.value_of(f, lo, hi, tm)
            else:
                out[ax["locus"]] = E.looks_of(g, own)[ax["locus"]]
    return out


def _is_tight(i):
    import s20genes as GN
    old = GN.SAMPLER_OF.get(i)
    return old in GN.GENES and GN.GENES[old][3] in ("body", "face")


def _copies_key(c):
    return {k: sorted(str(round(x, 5)) if isinstance(x, float) else str(x) for x in v) for k, v in c.items()}


def _redraw(e, rng):
    import numpy as np
    if e["op"] == "switch":
        return "on" if rng.random() < float(e.get("weight", 0.5)) else "off"
    al = [str(a) for a in e["limits"]]
    w = np.array(e.get("weights") or [1.0 / len(al)] * len(al), float)
    return str(rng.choice(al, p=w / w.sum()))


def draw_pod(g, parent, dial, rng):
    """One pod of one parent's copies: each position moves inside the pool by the dial's spread (the body and the face stay inside the middle 70 % of it, as the wild draws do), each look comes from one of the parent's two copies or, by the dial's
    chance, is drawn again from the pool. Of the loud looks a pod would show, only two stay."""
    import expressions as E
    import s20genes as GN
    W = WIDTH[dial]
    out = {}
    for e in g["loci"]:
        i = e["locus"]
        pc = parent[i]
        if e["op"] == "blend":
            if i in E.ABS_RECORD or E.is_modifier(e):
                out[i] = list(pc)
                continue
            t0 = (E._value(i, pc[0]) + E._value(i, pc[1])) / 2.0
            lo, hi = (0.15, 0.85) if _is_tight(i) else (0.0, 1.0)
            t = GN.grid_t(min(hi, max(lo, t0 + (float(rng.random()) * 2 - 1) * W["spread"])))
            out[i] = [t, t]
        else:
            out[i] = [(_redraw(e, rng) if rng.random() < W["redraw"] else pc[int(rng.integers(2))]) for _ in (0, 1)]
    if any(c == "on" for c in out.get("anatomy.whisker-presence", [])):                 # whiskers that show have at least one whisker
        for i_ in ("form.whisker-count",):
            if i_ in out and E._value(i_, out[i_][0]) < 0.4:
                out[i_] = [GN.grid_t(0.4)] * 2
    return E.limit_loud(g, out, E.type_copies(g))


def pod_rng(doc, parent, dial, round_no, i, tries=0):
    import hashlib
    import numpy as np
    seed = int(hashlib.sha256(f"{doc.get('id')}|{sorted(_copies_key(parent).items())}|{dial}|{round_no}|{i}|{tries}".encode()).hexdigest()[:15], 16)
    return np.random.Generator(np.random.PCG64([seed]))


def make_pod(doc, parent, dial, round_no, i, tries=0):
    """Pod `i` of round `round_no`: the copies, or None when the game's rule finds none (every draw equals the parent: SHED_TRIES draws)."""
    rng = pod_rng(doc, parent, dial, round_no, i, tries)
    pk = _copies_key(parent)
    for _ in range(SHED_TRIES):
        c = draw_pod(doc["genome"], parent, dial, rng)
        if _copies_key(c) != pk:
            return c
    return None


def make_pods(doc, round_no=0, dial=None, n=POD_COUNT, parent=None, tries=None):
    """The six pods of a make: [{i, tries, copies}]. `tries[i]` is how many times pod i has been drawn again (its picture would not build)."""
    dial = dial or (doc.get("play") or {}).get("diff") or "some"
    if dial not in DIALS:
        raise ValueError(f"how different? is one of {', '.join(DIALS)}")
    parent = parent or parent_copies(doc)
    out = []
    for i in range(n):
        k = (tries or {}).get(i, 0)
        c = make_pod(doc, parent, dial, round_no, i, k)
        if c is not None:
            out.append(dict(i=i, tries=k, copies=c))
    return out


def at_stage(doc, copies, stage):
    """The pod's copies at a life stage: a look that waits for an age the stage has not come to is put to sleep (the look's copies become the pool's first other look; what is passed on is unchanged, spec 4.2 rule 2)."""
    import expressions as E
    g = doc["genome"]
    by = E.by_locus(g)
    out = {k: list(v) for k, v in copies.items()}
    for x in doc.get("expressions") or []:
        if not E.stage_ok(x, stage):
            off = next((a for a in E.pool_of(by[x["locus"]]) if str(a) != str(x["look"])), None)
            if off is not None:
                out[x["locus"]] = [off, off]
    return out


def gated_looks(doc, copies, stage):
    """The age-gated looks this pod carries and shows at the grown stage, and whether each has come at `stage`: [(expression id, label, shows now)]."""
    import expressions as E
    last = E.STAGES[-1]
    shown = E.showing(doc["genome"], doc.get("expressions") or [], copies, last)
    return [(x["id"], x.get("label") or x["id"], x["id"] in E.showing(doc["genome"], doc.get("expressions") or [], copies, stage)) for x in (doc.get("expressions") or []) if x.get("age") and x["id"] in shown]


def how_often(share, aged):
    """The word under a look of the family strip: often, sometimes, rarely, or when grown for a look that waits for an age (words.md pl.family.rows)."""
    return "grown" if aged else ("often" if share >= 50 else "sometimes" if share >= 15 else "rarely")


def family_rows(doc, limit=4):
    """The strip under the nest, in pictures and four short words: how often each look runs in this family (1,000 wild draws, spec 4.2). The file's expressions first, then the looks the chips offer, the commonest of the rare ones last."""
    import expressions as E
    g = doc["genome"]
    ex = doc.get("expressions") or []
    f = E.freq(g, ex, n=1000, doc_id=doc.get("id"))
    words = ((doc.get("variety") or {}).get("look_words") or {})
    rows = []
    for x in ex:
        r = f["expressions"].get(x["id"])
        if not r:
            continue
        aged = bool(x.get("age"))
        share = r["wild"]["elder" if aged else "adult"]
        rows.append(dict(id=x["id"], label=x.get("label") or x["id"], locus=x["locus"], look=x["look"], how=how_often(share, aged), share=share))
    for t in plan_toys(doc):
        for ax in t["axes"]:
            if ax["kind"] != "choice" or ax.get("virtual") or _entry(doc, ax["locus"]) is None or ax["locus"] not in f["loci"]:
                continue
            for o in ax["options"]:
                share = f["loci"][ax["locus"]]["wild"].get(o)
                w = words.get(ax["locus"], {}).get(o)
                if share is None or not w or any(r["locus"] == ax["locus"] and r["look"] == o for r in rows) or o in ("none", "plain", "prick"):
                    continue
                rows.append(dict(id=f"{ax['locus']}={o}", label=w[0], locus=ax["locus"], look=o, how=how_often(share, False), share=share, toy=t["id"], axis=ax["id"]))
    rows.sort(key=lambda r: (0 if r["how"] == "grown" else 1, -r["share"]))
    return rows[:limit]


# ---- two mibis cross only when they are not direct kin (the game's rule, framework/cross.mjs directKin): a parent, a grandparent or a great-grandparent with its line, and two children of the same pair never cross
KIN_DEPTH = 3
LINE = ["parent", "grandparent", "great-grandparent"]


def direct_kin(x, y, lookup=lambda i: None, depth=KIN_DEPTH):
    """None, or {rel, by}: what y is to x. A mibi is {id, parents: [id, id]}; `lookup(id)` gives a parent's record (its own parents), None when it is gone: the walk stops there, and the id still counts."""
    def links(n):
        return [(p, lookup(p)) for p in (n.get("parents") or [])]

    def ancestors(z):
        out = {}

        def walk(n, gen):
            for k, node in links(n):
                if k is not None and k not in out:
                    out[k] = gen
                if node and gen < depth:
                    walk(node, gen + 1)
        walk(z, 1)
        return out
    ax, ay = ancestors(x), ancestors(y)
    if y["id"] in ax:
        return dict(rel=LINE[ax[y["id"]] - 1], by=y["id"])
    if x["id"] in ay:
        return dict(rel=LINE[ay[x["id"]] - 1].replace("parent", "child"), by=x["id"])
    px, py = x.get("parents") or [], y.get("parents") or []
    if len(px) == 2 and len(py) == 2 and sorted(px) == sorted(py):
        return dict(rel="same-parents", by="|".join(sorted(px)))
    return None


def pods_with(doc, mate_doc, lookup, round_no=0, dial=None, n=POD_COUNT):
    """Pods of two mibis, refused for direct kin. Raises ValueError("direct kin (rel): family does not cross"), the game's own line."""
    import expressions as E
    a = dict(id=doc["id"], parents=(doc.get("play") or {}).get("parents") or [])
    b = dict(id=mate_doc["id"], parents=(mate_doc.get("play") or {}).get("parents") or [])
    if a["id"] == b["id"]:
        raise ValueError("one mibi is not a pair")
    kin = direct_kin(a, b, lookup)
    if kin:
        raise ValueError(f"direct kin ({kin['rel']}): family does not cross")
    if (doc.get("species") or doc.get("name")) != (mate_doc.get("species") or mate_doc.get("name")) or doc.get("genome", {}).get("clan") != mate_doc.get("genome", {}).get("clan"):
        raise ValueError("the two are not of one species")
    import numpy as np
    dial = dial or "some"
    pa, pb = parent_copies(doc), parent_copies(mate_doc)
    out = []
    for i in range(n):
        import hashlib
        rng = np.random.Generator(np.random.PCG64([int(hashlib.sha256(f"{doc['id']}|{mate_doc['id']}|{round_no}|{i}".encode()).hexdigest()[:15], 16)]))
        out.append(dict(i=i, tries=0, copies=E.limit_loud(doc["genome"], E.cross(doc["genome"], pa, pb, rng), E.type_copies(doc["genome"]))))
    return out


# ---- keeping a pod: the pod becomes its own species file in the player's space, a mibi of its own
NAMES = ["Churro", "Luna", "Michi", "Pepita", "Tilo", "Nube", "Bimbo", "Tamal", "Mochi", "Pico", "Lola", "Fresa"]       # the namer's offers (words.md pl.name.picks names three of them; the game's namer owns the real list)


def valid_name(n):
    return isinstance(n, str) and 0 < len(n.strip()) <= 10 and n.strip().replace("-", "").replace(" ", "").isalpha()


def name_picks(doc, k=3, round_no=0):
    """Three of the namer's names, the same three each time for one mibi and round."""
    import hashlib
    h = int(hashlib.sha256(f"{doc.get('id')}|{round_no}".encode()).hexdigest()[:8], 16)
    taken = {(doc.get("play") or {}).get("name")}
    pool = [n for n in NAMES if n not in taken]
    return [pool[(h + 5 * j) % len(pool)] for j in range(k)]


def state_of_copies(doc, copies):
    """The toys' settings of a whole genome: what a toy would show at each of its genes (a slider's value inside the axis, a chip's look). A kept mibi starts with them."""
    import genomeapply as GA
    import expressions as E
    out = {}
    looks = E.looks_of(doc["genome"], copies)
    for t in plan_toys(doc):
        for ax in t["axes"]:
            if ax.get("virtual"):
                continue
            e = _entry(doc, ax["locus"])
            eff = _narrowed(doc, t, ax)
            if e is None or eff is None:
                continue
            if eff[0] == "range":
                f, lo, hi = GA.blend_map(e)
                tm = (E._value(ax["locus"], copies[ax["locus"]][0]) + E._value(ax["locus"], copies[ax["locus"]][1])) / 2.0
                out[ax["locus"]] = min(eff[2], max(eff[1], GA.value_of(f, lo, hi, tm)))
            else:
                v = looks.get(ax["locus"])
                out[ax["locus"]] = v if v in eff[1] else eff[1][0]
    return out


def kept_doc(doc, new_id, name, copies, diff=None, grow=None):
    """The species file of a kept mibi: the parent's file with its own copies, its toys' settings from them, its name, and its parents (a pod's parents are the mibi that shed it, twice)."""
    import copy as _copy
    d = _copy.deepcopy(doc)
    d["id"] = new_id
    pl = dict(starter=True, kept=True, name=name.strip(), state=state_of_copies(doc, copies), genome=copies, parents=[doc["id"], doc["id"]])
    old = doc.get("play") or {}
    for k in ("toys", "words"):
        if k in old:
            pl[k] = _copy.deepcopy(old[k])
    if diff:
        pl["diff"] = diff
    if grow:
        pl["grow"] = grow
    d["play"] = pl
    return d

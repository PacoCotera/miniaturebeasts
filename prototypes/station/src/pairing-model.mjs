// The pairing screen's model (station step 8-2; walk-4 picture 6 and the owner's 10:4x additions): everything the screen says about two picks, as plain data and the words from pods.json strings.pairing.
// No drawing and no rules of its own: the copies and chances are pairing.mjs's, the rest, vigour and pod time the engine's (state.mjs restOf, vigour.mjs). The aim is kept on the save (st.aim, per kind) the
// first time a household has one, so it does not move when a young hatches that carries it. Until wild-marking-draw-1 ships the live wild draw hides no marking: `aimOf` then returns null and the screen says
// the line has no aim yet; a save whose mibis carry off copies (the rounds' draw) gets the aim.
import * as S from "./state.mjs";
import { frameOf, traitState } from "./genome.mjs";
import { LOCI, copyValue } from "../../species/framework/catalogue.mjs";
import * as P from "./pairing.mjs";
import { podMinutes, vigourOfF } from "../../species/framework/vigour.mjs";
import { fill } from "./views/words.mjs";

const living = (st, kind) => st.mibis.filter((m) => !m.released && S.speciesOf(m) === kind && m.genome);

// The aim of a kind's household: kept once made. A saved aim that a mibi now holds twice on both traits stays (that is progress, not a new aim).
export function aimOf(st, kind) {
  const fr = frameOf(kind); if (!fr) return null;
  st.aim ??= {};
  if (!st.aim[kind]) { const a = P.makeAim(fr, living(st, kind)); if (a) st.aim[kind] = a; }
  return st.aim[kind] ?? null;
}
// The aim's looks as the player reads them (station step 8-5): the marking's own name (saddle, bands...) and the eyes' word (the look the aimed step falls in), taken from a household mibi that carries the copy,
// its two copies set to the aim: the engine's own reading (traitState), never a name of our own. "" when no mibi carries it.
const traitOfLocus = (fr, lid) => fr.chapters.flatMap((c) => c.traits).find((t) => t.loci?.includes(lid));
export function aimLooks(st, kind, aim) {
  const fr = frameOf(kind), out = { marking: "", eyes: "" }; if (!fr || !aim) return out;
  const hold = living(st, kind), shows = (m, lid, c) => { const t = traitOfLocus(fr, lid); return t ? traitState(fr, t, { ...m.genome, loci: { ...m.genome.loci, [lid]: [c, c] } })?.shows ?? "" : ""; };
  const mm = hold.find((m) => (m.genome.loci[P.MARKING] ?? []).includes("on")); if (mm) out.marking = String(shows(mm, P.MARKING, "on"));
  const locus = LOCI.get(P.EYES), em = hold.find((m) => (m.genome.loci[P.EYES] ?? []).some((c) => Math.abs(copyValue(locus, c) - aim.traits[1].step) < 1e-7));
  if (em) out.eyes = String(shows(em, P.EYES, em.genome.loci[P.EYES].find((c) => Math.abs(copyValue(locus, c) - aim.traits[1].step) < 1e-7)));
  return out;
}
// The markings a pair's young can wear, in the kind's order: plain when a young can carry no "on" pair, and the layouts the parents carry when both can pass an "on".
export function markingsOf(st, a, b) {
  const fr = frameOf(S.speciesOf(a)), t = fr && traitOfLocus(fr, P.MARKING), lay = fr && traitOfLocus(fr, "appearance.marking-layout"); if (!t) return [];
  const sw = (m) => m.genome.loci[P.MARKING] ?? [], offOk = [...sw(a), ...sw(b)].includes("off") || !sw(a).length, onOk = sw(a).includes("on") && sw(b).includes("on");
  const LID = "appearance.marking-layout", cs = lay ? [...new Set([a, b].flatMap((m) => m.genome.loci[LID] ?? []))] : [];
  const layouts = cs.map((c) => String(traitState(fr, t, { ...a.genome, loci: { ...a.genome.loci, [P.MARKING]: ["on", "on"], [LID]: [c, c] } })?.shows ?? ""));
  return [...new Set([...(offOk ? ["plain"] : []), ...(onOk ? layouts : [])].filter(Boolean))];
}
const traitWords = (Sg, aim, t, i, looks) => (i === 0 ? fill(Sg.aimMarking, { look: looks?.marking || t.look }) : looks?.eyes ? fill(Sg.aimEyesLook, { look: looks.eyes }) : fill(Sg.aimEyes, { i: t.idx + 1, n: t.of }));
const chanceWords = (Sg, p) => { const w = P.inWords(p); return w === "never" ? Sg.never : w === "always" ? Sg.always : w.startsWith("1 in ") ? fill(Sg.oneIn, { n: w.slice(5) }) : fill(Sg.inHundred, { n: w.split(" ")[0] }); };
const whenWords = (Sg, n) => (n >= 60 ? "an hour" : n <= 1 ? "a minute" : n + " minutes");
const vigourName = (Sg, v) => { const w = P.vigourWord(v); return w === "full" ? Sg.vigourFull : w === "lower" ? Sg.vigourLower : Sg.vigourLowest; };

// What one face says: its copies on each aim trait and its rest.
export function faceOf(st, Sg, aim, m, other, now) {
  const left = S.restMinutesLeft(st, m, other, now);
  return { id: m.id, name: m.name, counts: aim ? P.countsOf(aim, m).map((n) => fill(Sg.copies, { n })) : [], rest: left > 0 ? fill(Sg.restingFor, { n: left }) : "", resting: left > 0 };
}

// The screen's readout for the picks a and b (b may be null: the first pick).
export function readout(st, sv, spec, a, b, settings, now = Date.now()) {
  const Sg = spec.strings.pairing, kind = S.speciesOf(a), aim = aimOf(st, kind);
  const looks = aim ? aimLooks(st, kind, aim) : null;
  const out = { aim: aim ? aim.traits.map((t, i) => traitWords(Sg, aim, t, i, looks)) : [], looks, noAim: !aim ? Sg.noAim : "", a: faceOf(st, Sg, aim, a, b, now), b: b ? faceOf(st, Sg, aim, b, a, now) : null, chances: [], both: "", kin: "", pod: "", done: "", lens: Sg.lensWaits };
  if (!b) return out;
  const k = S.kinshipOf(st, a, b), kl = P.kinLine(k), base = S.budMinutes(st, 0, settings), mins = podMinutes(base, kl.vigour);
  out.kin = kl.kinship > 0 ? fill(Sg.kinSome, { kin: S.kinshipWord(kl.kinship), vigour: vigourName(Sg, kl.vigour), minutes: mins, base }) : Sg.kinNone;
  out.pod = fill(Sg.growsIn, { when: whenWords(Sg, mins) });
  if (aim) {
    const c = P.chances(aim, a, b);
    // item 3 (AD 15:03): the odds name the marking only when the pair can give it (its card has no dashed rim); a look only another mibi of the household carries is "a marking"
    const can = new Set(markingsOf(st, a, b)), pairLooks = looks && c.each[0] > 0 && !can.has(looks.marking) ?{ ...looks, marking: "" } : looks;
    out.chances = aim.traits.map((t, i) => fill(Sg.chanceLine, { trait: i === 0 && pairLooks && !pairLooks.marking ? Sg.aimMarkingAny : traitWords(Sg, aim, t, i, pairLooks), chance: chanceWords(Sg, c.each[i]) }));
    out.both = fill(Sg.chanceLine, { trait: Sg.chanceBoth, chance: chanceWords(Sg, c.both) });
    out.raw = c;
  }
  out.vigour = kl.vigour; out.minutes = mins;
  // where the young can land (station step 8-5): the coat's two ranges with the parents' marks, and the markings a young can wear, each marked new when none of your mibis of the kind wears it
  out.land = S.landOf(st, a, b);
  const fr = frameOf(kind), tm = fr && traitOfLocus(fr, P.MARKING), worn = new Set(living(st, kind).map((m) => (tm ? String(traitState(fr, tm, m.genome)?.shows ?? "") : "")));
  out.markings = markingsOf(st, a, b).map((w) => ({ word: w, isNew: !worn.has(w) }));
  const d = aim ? P.done(aim, living(st, kind), (x, y) => !S.pairBlock(st, sv, x, y, settings)) : null;
  out.done = d ? Sg.done : "";
  return out;
}

// A young's copies on its page, one line (after the hatch): "the marking 1 of 2 · eyes 2 of 2".
export function youngLine(st, spec, m) {
  const Sg = spec.strings.pairing, aim = aimOf(st, S.speciesOf(m)); if (!aim || !m?.genome) return "";
  return fill(Sg.youngCopies, { line: P.countsOf(aim, m).map((n, i) => `${i ? "eyes" : "marking"} ${fill(Sg.copies, { n })}`).join(" · ") });
}
// The same, a line a trait, as her page shows them (round 2 item 7): "marking 1 of 2", "eyes 2 of 2"; none while the household has no aim.
export function youngLines(st, spec, m) {
  const Sg = spec.strings.pairing, aim = m?.genome ? aimOf(st, S.speciesOf(m)) : null; if (!aim) return [];
  return P.countsOf(aim, m).map((n, i) => `${i ? "eyes" : "marking"} ${fill(Sg.copies, { n })}`);
}
export { vigourOfF };

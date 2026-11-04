// The Settings props (lvgl-switch.md §2.1; settings.json): pure selectors from the state, the Companion's facts and the focus to the props of the face's Settings words (screens/settings.c). Props name *what*, never *where*: the words
// of each row and of the detail the focused row shows, a dim flag and the focus targets by id; no rectangle, no measure, no layout rule. The output is plain JSON: { props (state, regions, focus), line (the bottom line, for the frame), requests (none) }.
//   m: { st, sv, settings, docked, companion: { name, since, keyed } | null, ui (UI.settings: { f }), now }
//   keyed: the Station trusts a key for the docked Companion (companions.mjs trustedPub). The checks that need the Caddy (its identity, the room for the copy) are the first plate's, not these.
import * as S from "../state.mjs";
import { fill, capLine } from "./words.mjs";

// The key of the Station's index of the sleeping realms it keeps a copy of (sleep.mjs INDEX_KEY, held equal by the test; nothing here imports the sequence).
export const SLEEP_INDEX_KEY = "mb-sleep-index";
export const TARGETS = ["realm", "companion", "sleeping", "sleep"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const dayWords = (ms) => { const d = new Date(typeof ms === "number" && ms > 0 ? ms : NaN); return Number.isFinite(d.getTime()) ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : ""; };

// Why the realm cannot be put to sleep now, from what the Station knows without asking the Caddy: null when nothing stops it. The order is the sleep's own (sleep.mjs preflight).
export function sleepBlock(m) {
  const { sv, docked, companion } = m;
  if (!docked) return "not docked";
  if (!companion || !companion.keyed) return "no key";
  if (!sv || sv.v !== 9 || typeof sv.wid !== "string" || !Array.isArray(sv.regions)) return "no save";
  return null;
}

// The realm's counts as words: the regions the save holds, the mibis that are not released, the pods in the case and the rack, and the world turn.
export function realmFacts(m, spec) {
  const { st, sv } = m, U = spec.strings.units, n = (k, v) => fill(U[k], { n: v });
  const regions = Array.isArray(sv?.regions) ? sv.regions.length : 1, mibis = st.mibis.filter((x) => !x.released).length, pods = st.tray.length + st.waiting.length;
  return { began: dayWords(sv?.began), regions: n("regions", regions), mibis: n("mibis", mibis), pods: n("pods", pods), turn: String(sv?.turn ?? st.turn ?? 0) };
}

export function settingsBuild(m, spec) {
  const Sg = spec.strings, R = Sg.rows, D = Sg.detail, f = realmFacts(m, spec), block = sleepBlock(m), c = m.companion, count = m.sleeping ?? 0;
  const state = m.docked ? Sg.state.docked : Sg.state.away;
  const cur = TARGETS.includes(m.ui?.f) ? m.ui.f : spec.focus.initial;
  const rows = {
    realm: { sub: f.began ? fill(R.realm.sub, { began: f.began }) : R.realm.subNoDate },
    companion: { sub: c ? fill(R.companion.sub, { name: c.name, state }) : R.companion.subNone },
    sleeping: { sub: count ? fill(R.sleeping.count, { n: count }) : R.sleeping.none },
    sleep: { sub: block ? Sg.reasons[block] : R.sleep.hint, dim: !!block },
  };
  const detail = { key: cur, title: "", blocks: [], foot: "" };
  if (cur === "realm") { detail.title = D.realm.title; detail.blocks.push({ kind: "facts", text: capLine(fill(f.began ? D.realm.facts : D.realm.factsNoDate, f)) }); }
  else if (cur === "companion") {
    detail.title = D.companion.title;
    detail.blocks.push({ kind: "facts", text: c ? capLine(fill(D.companion.facts, { name: c.name, state, since: dayWords(c.since) || "its first dock" })) : D.companion.factsNone });
  } else if (cur === "sleeping") { detail.title = D.sleeping.title; detail.blocks.push({ kind: "facts", text: count ? fill(D.sleeping.count, { n: count }) : D.sleeping.none }); }
  else {
    const Z = D.sleep; detail.title = Z.title;
    for (const p of Z.paras) detail.blocks.push({ kind: "para", text: p });
    if (block) detail.blocks.push({ kind: "notice", text: Sg.reasons[block] });
    detail.blocks.push({ kind: "label", text: Z.label });
    for (const t of f.began ? Z.facts : Z.factsNoDate) detail.blocks.push({ kind: "facts", text: fill(t, f) });
    detail.foot = Z.foot;
  }
  const targets = TARGETS.map((id) => ({ id, group: id }));
  const line = { ok: null, subject: R[cur].title, back: Sg.back, need: null };
  return { props: { state: "settings", regions: { ...rows, detail }, focus: { cur, targets } }, line, requests: [] };
}

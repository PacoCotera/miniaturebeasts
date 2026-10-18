// The decision panel as an overlay's props (panel.json, frame.json regions.panel; specs/station-decision-panel-spec.md Part 1; lvgl-switch.md §2.2): the title, the cards and the focus, with the bottom line built from the focused card
// (the line and the panel never disagree, because both read it). Props name *what*, never *where*: strings, asset ids and picture sizes, flags, the cost as the bottom line's price string, and the focus targets by id; the rectangles
// are frame.json's. Costs come from the rules (state.mjs), never from the strings. Runs in Node, tested there (tests/panel-props.test.mjs); the shape is panel.props.json.
//   m: { st, settings, ui: { create, panel: { screen, id, focus } }, jump: "arrival" | "fork" }, spec panel.json, frame frame.json, pods pods.json, create create.json
import * as S from "../state.mjs";
import { createPod, founderPicture } from "./create-props.mjs";
import { frameOf } from "../genome.mjs";
import { habitatShown } from "../trickle.mjs";
import { mibiReq } from "./home-props.mjs";

const fill = (t, o) => t.replace(/\{([^}]+)\}/g, (_, k) => (k in o ? o[k] : "{" + k + "}"));
const SPELL = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
export const JUVENILE = [176, 128], FOUNDER = [144, 152];   // the juvenile and the founder as the card shows them (T-20261016-70: each stands at least 80 px tall in the 160 slot; the spec's 104 × 112 stood at 43 %)

// The cards of the Grow this founder? panel, in order (§1.6, §3): the way out is always last. `act` and `room` stay on the host (the face is sent neither).
export function growCards(m, spec, frame, requests) {
  const { st, settings } = m, cr = m.ui.create, Sg = spec.strings.grow, p = createPod(st, cr), species = S.speciesOf(p), jump = m.jump === "fork" ? "fork" : "arrival";
  const req = (r) => { requests.push(r); return r.id; };
  const cost = S.growCost(st, cr.choices, settings), short = S.canPay(st, cost.e, cost.d, cost.s) ? "" : S.shortIcons(st, cost.e, cost.d, cost.s);
  const price = S.priceText(cost.e, cost.d, cost.s, 0);   // no minute count here: owner ruling 3 allows one, in the Incubator's context line and nowhere else
  const fr = frameOf(species), unread = fr.chapters.filter((c) => !p.read.includes(c.id) && !S.shutSealed(c, settings));
  const surprise = unread.length === 1 ? fill(Sg.cards.grow.line.one, { Chapter: unread[0].name }) : unread.length > 1 ? fill(Sg.cards.grow.line.more, { "n in words": SPELL[unread.length] ?? "many" }) : "";
  const jid = `mibi-juvenile-${species}-${JUVENILE.join("x")}`, juvenile = req({ kind: "slot", id: jid, master: jid, size: JUVENILE, until: "the founder's juvenile at 176 × 128 (T-20261016-70: cut from the 304 painting; S01 only so far: a species without it draws nothing)" });
  const founder = req({ kind: "founder", id: founderPicture(p, cr.choices, FOUNDER).id, pod: p.id, choices: cr.choices, species, read: [...p.read], size: FOUNDER });
  const mark = frame.regions.marks.room.research;
  const grow = (id, line, room) => ({ id, act: id, room, picture: juvenile, pictureSize: JUVENILE, mark, name: Sg.cards[id].name, cost: price, gain: false, short, line, loss: false, dim: !!short });
  const cards = jump === "fork"
    ? [grow("watch", Sg.cards.watch.line, "research"), grow("read", Sg.cards.read.line, "research")]
    : [grow("grow", surprise, "research")];
  cards.push({ id: "shape", act: "shape", room: null, picture: founder, pictureSize: FOUNDER, mark: "", name: Sg.cards.shape.name, cost: "", gain: false, short: "", line: "", loss: false, dim: false });
  return cards;
}
// The cards of the Return panels (§1.6): Return it (the gain from the rules, the loss "gone for good", the subject on its place's scene) and Keep (the subject as it is). The cost of the act is a gain, ❀ +2 for a mibi and ❀ +1 for a pod.
export const WILD = [144, 152], WILD_POD = [88, 112];
export function wildCards(m, spec, frame, requests) {
  const { st, settings } = m, id = m.ui.panel.id, mibi = id === "wildMibi", Sg = spec.strings[id], req = (r) => { requests.push(r); return r.id; };
  let subject, keepName, picture, size;
  if (mibi) {
    subject = habitatShown(st, m.sv, m.ui.hab.id); if (!subject) return [];
    keepName = fill(Sg.cards.keep.name, { name: subject.name }); size = WILD; picture = mibiReq(req, st, subject, size, settings);
  } else {
    subject = st.tray.find((q) => q.id === m.ui.pods.cur); if (!subject) return [];
    keepName = Sg.cards.keep.name; size = WILD_POD;
    const sp = S.speciesOf(subject), state = subject.idd ? "identified" : "sealed";
    picture = req({ kind: "pod", id: `pod:${sp ?? "-"}:${subject.idd ? "i" : "s"}:${size.join("x")}`, species: sp, state, size });
  }
  const mark = frame.regions.marks.room[mibi ? "vivarium" : "research"];
  return [
    { id: "return", act: "return", room: null, picture, pictureSize: size, mark, name: Sg.cards.return.name, cost: S.gainText(mibi ? S.PRICE.wildMibi : S.PRICE.wild), gain: true, short: "", line: Sg.cards.return.line, loss: true, dim: false, outcome: "wild" },
    { id: "keep", act: "keep", room: null, picture, pictureSize: size, mark: "", name: keepName, cost: "", gain: false, short: "", line: "", loss: false, dim: false },
  ];
}
// The cards of the Fit the upgrade? panel (§1.6): Fit it (the part fitted, ⚡ and ◆ from the rules, dimmed with what is short) and Not now (the part dimmed). Nothing is a mark: the part stays on the bench.
export const PART = [128, 128];
export function fitCards(m, spec, frame, requests) {
  const { st, settings } = m, Sg = spec.strings.fitUpgrade, req = (r) => { requests.push(r); return r.id; };
  const e = S.price(S.PRICE.tier2E, settings), d = S.price(S.PRICE.tier2D, settings), short = S.canPay(st, e, d, 0) ? "" : S.shortIcons(st, e, d, 0);
  const part = (id) => req({ kind: "slot", id, master: id, size: PART, until: "the Probe's upgrade part (bench.json regions.slot.part)" });
  return [
    { id: "fit", act: "fit", room: null, picture: part("bench-part-t2-fitted-128"), pictureSize: PART, mark: "", name: Sg.cards.fit.name, cost: S.priceText(e, d, 0), gain: false, short, line: Sg.cards.fit.line, loss: false, dim: !S.tier2Ready(st, settings) },
    { id: "later", act: "notNow", room: null, picture: part("bench-part-t2-dim-128"), pictureSize: PART, mark: "", name: Sg.cards.later.name, cost: "", gain: false, short: "", line: "", loss: false, dim: false },
  ];
}
// The cards of the Hatch now? panel (§1.6): Hatch now (the bud at its ready step, ❀ n from the rules, "ready at once"; dimmed when short) and Wait (the bud at its step now, nothing spent, "ready in about {n} min": the one minute count, owner ruling 3).
export const BUD = [128, 160];
export function growNowCards(m, spec, frame, requests) {
  const { st, settings } = m, Sg = spec.strings.growNow, now = m.now ?? Date.now(), req = (r) => { requests.push(r); return r.id; };
  const c = S.instantGrowCost(st, settings, now), short = S.canPay(st, c.e, c.d, c.s) ? "" : S.shortIcons(st, c.e, c.d, c.s), p = S.budProgress(st, settings, now);
  const bud = (id) => req({ kind: "slot", id, master: id, size: BUD, until: "the Incubator's bud master (incubator.json regions.bud)" });
  return [
    { id: "grow", act: "growNow", room: null, picture: bud("bud-ready-128x160"), pictureSize: BUD, mark: "", name: Sg.cards.grow.name, cost: S.priceText(c.e, c.d, c.s), gain: false, short, line: Sg.cards.grow.line, loss: false, dim: !!short },
    { id: "wait", act: "wait", room: null, picture: bud(p < 0.5 ? "bud-early-128x160" : "bud-late-128x160"), pictureSize: BUD, mark: "", name: Sg.cards.wait.name, cost: "", gain: false, short: "", line: fill(Sg.cards.wait.line, { n: S.budMinutesLeft(st, settings, now) }), loss: false, dim: false },
  ];
}
// The cards of the dock arrival's choice strip (the dock arrival spec, the strip form): Open the bay (the crates open, small; free; "{n in words} crates to the rack") and Later (the crates sealed, small; free; "they wait while docked").
export const STRIP_PICTURE = [96, 96];
export function dockCards(m, spec, frame, requests) {
  const Sg = spec.strings.dock, n = m.ui.cargo?.arrival?.crates ?? 0, C = frame.regions.panel.strip.picture;
  // the card's crate: a 96 × 96 window of the placed crate master, 1:1 (frame.json regions.panel.strip.picture.crops)
  const crop = (k) => { const c = C.crops[k], id = `crate-${k}-crop-${C.size[0]}x${C.size[1]}`; requests.push({ kind: "crop", id, master: c.master, of: c.of, at: c.at, size: C.size, until: "the crate master it is cut from (T-20261016-161)" }); return id; };
  const open = n === 1 ? Sg.oneCrate : fill(Sg.cards.open.line, { "n in words": SPELL[n] ?? "many" });
  const art = { well: "", focused: "", stage: "", glow: "", light: "" };
  return [
    { id: "open", act: "open", room: null, picture: crop("open"), pictureSize: STRIP_PICTURE, mark: "", name: Sg.cards.open.name, cost: "", gain: false, short: "", line: open, loss: false, dim: false, art },
    { id: "later", act: "later", room: null, picture: crop("sealed"), pictureSize: STRIP_PICTURE, mark: "", name: Sg.cards.later.name, cost: "", gain: false, short: "", line: Sg.cards.later.line, loss: false, dim: false, art },
  ];
}
// The masters the panel is drawn from (frame.json regions.panel.art, T-20261016-47 and -70): the housing, the veil, the contact shadow and the chip, and for each card its well (focused or not), stage, glow and light at the card's width.
export function artOf(frame, n, requests, wild = false) {
  const A = frame.regions.panel.art, P = frame.regions.panel, w = (P.cards.width - P.cards.gap * (n - 1)) / n, pw = w - 32, at = (t) => t.replace("{w}", w).replace("{pw}", pw);
  const req = (id, size) => { if (!requests.some((r) => r.id === id)) requests.push({ kind: "slot", id, master: id, size, until: "the decision panel's master (art director, T-20261016-47, -70)" }); return id; };
  const sz = (id) => id.match(/(\d+)x(\d+)(?:-focused)?$/).slice(1).map(Number);
  const pick = (t) => { const id = at(typeof t === "string" ? t : t.id); return req(id, sz(id)); };
  return { housing: pick(A.housing), veil: pick(A.veil), shadow: pick(A.shadow), chip: pick(A.chip), card: { well: pick(A.card), focused: pick(A.focused), stage: pick(A.stage), glow: pick(A.glow), light: pick(A.light) }, scene: wild ? pick(A.scene) : "" };
}
export const cardsOf = (m, spec, frame, requests) => (m.ui.panel.id === "grow" ? growCards(m, spec, frame, requests) : m.ui.panel.id === "fitUpgrade" ? fitCards(m, spec, frame, requests) : m.ui.panel.id === "growNow" ? growNowCards(m, spec, frame, requests) : m.ui.panel.id === "dock" ? dockCards(m, spec, frame, requests) : wildCards(m, spec, frame, requests));
export const titleOf = (m, spec) => {
  const id = m.ui.panel.id, t = spec.strings[id].title;
  if (id === "wildMibi") return fill(t, { name: habitatShown(m.st, m.sv, m.ui.hab.id)?.name ?? "" });
  return t;
};

// The first card that is neither dimmed nor a loss; if every card is one or the other, the way-out card (the last): the focus a panel opens on.
export const initialFocus = (cards) => "card." + (cards.find((c) => !c.dim && !c.loss) ?? cards.at(-1)).id;

export function panelBuild(m, spec, frame, pods) {
  const requests = [], cards = cardsOf(m, spec, frame, requests), Sg = spec.strings, ui = m.ui.panel;
  const cur = cards.some((c) => "card." + c.id === ui.focus) ? ui.focus : initialFocus(cards), card = cards.find((c) => "card." + c.id === cur);
  const strip = ui.id === "dock";   // the strip form: no veil, housing or masters of its own (the code-drawn plate and wells), the cards carry no art
  const art = strip ? { housing: "", veil: "", shadow: "", chip: "" } : artOf(frame, cards.length, requests, cards.some((c) => c.outcome === "wild")), regions = { title: titleOf(m, spec), art: { housing: art.housing, veil: art.veil, shadow: art.shadow, chip: art.chip }, cards: cards.map(({ act, room, art: own, ...c }) => ({ ...c, art: strip ? own : c.outcome === "wild" ? { ...art.card, glow: "", scene: art.scene } : art.card })) };
  const subject = card.line || (card.room ? fill(Sg.toRoom, { room: Sg.rooms[card.room] }) : "");
  const line = { ok: card.name, ...(card.cost ? { price: card.cost } : {}), subject, back: Sg.back, need: card.short ? fill(pods.strings.needMore, { icons: card.short }) : null };
  if (card.dim) { line.dim = true; line.short = card.short; }
  return { overlay: { id: "panel", state: "open", ...(strip ? { form: "strip" } : {}), regions, focus: { cur, targets: cards.map((c) => ({ id: "card." + c.id, enabled: true })) } }, line, requests, cards };
}

// The decision panel as an overlay's props (panel.json, frame.json regions.panel; specs/station-decision-panel-spec.md Part 1; lvgl-switch.md §2.2): the title, the cards and the focus, with the bottom line built from the focused card
// (the line and the panel never disagree, because both read it). Props name *what*, never *where*: strings, asset ids and picture sizes, flags, the cost as the bottom line's price string, and the focus targets by id; the rectangles
// are frame.json's. Costs come from the rules (state.mjs), never from the strings. Runs in Node, tested there (tests/panel-props.test.mjs); the shape is panel.props.json.
//   m: { st, settings, ui: { create, panel: { screen, id, focus } }, jump: "arrival" | "fork" }, spec panel.json, frame frame.json, pods pods.json, create create.json
import * as S from "../state.mjs";
import { createPod, founderPicture } from "./create-props.mjs";
import { frameOf } from "../genome.mjs";
import { habitatShown } from "../trickle.mjs";
import { mibiReq } from "./home-props.mjs";
import { layers, relitPod, podArea, bgOf } from "./capsule-props.mjs";
import { slot } from "./pods-props.mjs";
import { relitJuvenile } from "./hatch-props.mjs";
import { fill, plural } from "./words.mjs";
import { req as reqOf } from "./requests.mjs";

const SPELL = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];   // parked: a count above twelve reads "many" here, the shared spell gives its digits
// (the Grow this founder? panel and its JUVENILE and FOUNDER pictures are retired with T-20261016-222)   // the juvenile and the founder as the card shows them (T-20261016-70: each stands at least 80 px tall in the 160 slot; the spec's 104 × 112 stood at 43 %)


// The Incubate | Keep shaping panel (T-20261016-222; build spec 6a): Create's `confirm` state, drawn by the face's panel overlay in its `incubate` form. The two cards are the two bezels; the left window is the sealed capsule with this founder's pod,
// the right is Create as it stands (the face's snapshot; nothing to send). The price is the founder's: ⚡ ❀ ◆ from the rules, then the pod itself (16 x 20), which becomes the mibi. Props name what: ids, strings and the price; the places are panel.json's `incubate`.
export function incubateCards() {
  return [{ id: "incubate", act: "incubate", room: null, dim: false, loss: false, name: "incubate", cost: "", short: "" }, { id: "keep", act: "keep", room: null, dim: false, loss: false, name: "keep", cost: "", short: "" }];
}
export function incubateBuild(m, spec, frame, pods, createSpec) {
  const { st, settings } = m, cr = m.ui.create, requests = [], req = reqOf(requests), P = spec.incubate, Sg = createSpec.strings.panel, p = createPod(st, cr), species = S.speciesOf(p), signed = "signed (art director, the capsule masters list)";
  const cost = S.growCost(st, cr.choices, settings), text = S.priceText(cost.e, cost.d, cost.s, 0), [lw, lh] = P.windows.left.slice(2);
  const room = slot(req, "capsule-room-dusk-474x468", [0, 0, lw, lh], signed);
  const sz = [296, 459], L = layers(req, sz, ["interior-dusk", "shell-dusk", "seal-ring", "glass-closed"]);
  const cv = podArea(P.left.podHeight), at = P.left.layers, foot = P.left.foot;
  const pod = relitPod(req, { species, variant: "pod", light: "dusk", h: P.left.podHeight, area: cv, bg: bgOf({ id: L["interior-dusk"], at }, foot, cv.anchor) });
  const icon = req({ kind: "podicon", id: `podicon:${species}:16x20`, species, size: P.price.pod.size });
  const regions = { cards: [{ id: "incubate" }, { id: "keep" }], verbs: { incubate: Sg.incubate, keep: Sg.keep }, price: text === "free" ? "" : text, pod: icon,
    left: { room, interior: L["interior-dusk"], shell: L["shell-dusk"], seal: L["seal-ring"], glass: L["glass-closed"], layerSize: sz, pod, podSize: cv.size, podAnchor: cv.anchor } };
  const ui = m.ui.panel, cur = ui.focus === "card.keep" ? "card.keep" : "card.incubate";
  const line = { ok: cur === "card.keep" ? Sg.keep : Sg.incubate, subject: "", need: "", back: Sg.back };   // the verb of the focused bezel; the price stands in the panel's header, not here
  return { overlay: { id: "panel", state: "open", form: "incubate", regions, focus: { cur, targets: [{ id: "card.incubate", enabled: true }, { id: "card.keep", enabled: true }] } }, line, requests, cards: incubateCards() };
}
// The cards of the Release panels (§1.6): Release it (the gain from the rules, its fact in the text colour, the subject on its place's scene) and Keep (the subject as it is). The cost of the act is a gain, ❀ +2 for a mibi and ❀ +1 for a pod.
export const WILD = [144, 152], WILD_POD = [88, 112];
export function wildCards(m, spec, frame, requests) {
  const { st, settings } = m, id = m.ui.panel.id, mibi = id === "wildMibi", Sg = spec.strings[id], req = reqOf(requests);
  let subject, keepName, picture, size, releaseName, fact;
  if (mibi) {
    subject = habitatShown(st, m.sv, m.ui.hab.id); if (!subject) return [];
    keepName = fill(Sg.cards.keep.name, { name: subject.name }); size = WILD; releaseName = fill(Sg.cards.return.name, { name: subject.name }); fact = fill(Sg.cards.return.line, { name: subject.name }); picture = mibiReq(req, st, subject, size, settings);
  } else {
    subject = st.tray.find((q) => q.id === m.ui.pods.cur); if (!subject) return [];
    keepName = Sg.cards.keep.name; size = WILD_POD; releaseName = Sg.cards.return.name; fact = fill(Sg.cards.return.line, { place: S.PLACE_WORD[subject.g] || "wild" });
    const sp = S.speciesOf(subject), state = subject.idd ? "identified" : "sealed";
    picture = req({ kind: "pod", id: `pod:${sp ?? "-"}:${subject.idd ? "i" : "s"}:${size.join("x")}`, species: sp, state, size });
  }
  const mark = frame.regions.marks.room[mibi ? "vivarium" : "research"];
  return [
    { id: "return", act: "return", room: null, picture, pictureSize: size, mark, name: releaseName, cost: S.gainText(mibi ? S.PRICE.wildMibi : S.PRICE.wild), gain: true, short: "", line: fact, loss: false, dim: false, outcome: "wild" },
    { id: "keep", act: "keep", room: null, picture, pictureSize: size, mark: "", name: keepName, cost: "", gain: false, short: "", line: "", loss: false, dim: false },
  ];
}
// The cards of the Fit the upgrade? panel (§1.6): Fit it (the part fitted, ⚡ and ◆ from the rules, dimmed with what is short) and Not now (the part dimmed). Nothing is a mark: the part stays on the bench.
export const PART = [128, 128];
export function fitCards(m, spec, frame, requests) {
  const { st, settings } = m, Sg = spec.strings.fitUpgrade, req = reqOf(requests);
  const e = S.price(S.PRICE.tier2E, settings), d = S.price(S.PRICE.tier2D, settings), short = S.canPay(st, e, d, 0) ? "" : S.shortIcons(st, e, d, 0);
  const part = (id) => req({ kind: "slot", id, master: id, size: PART, until: "the Probe's upgrade part (bench.json regions.slot.part)" });
  return [
    { id: "fit", act: "fit", room: null, picture: part("bench-part-t2-fitted-128"), pictureSize: PART, mark: "", name: Sg.cards.fit.name, cost: S.priceText(e, d, 0), gain: false, short, line: Sg.cards.fit.line, loss: false, dim: !S.tier2Ready(st, settings) },
    { id: "later", act: "notNow", room: null, picture: part("bench-part-t2-dim-128"), pictureSize: PART, mark: "", name: Sg.cards.later.name, cost: "", gain: false, short: "", line: "", loss: false, dim: false },
  ];
}
// The cards of the Hatch now | Wait panel (T-20261016-222; the Incubator's `confirm` state): Hatch now (the bud at its ready step, ❀ n from the rules; dimmed when short) and Wait (nothing spent, "ready in about {n} min": the one minute count, owner ruling 3). The pictures are the windows' (hatchNowBuild), not the cards'.
export function growNowCards(m, spec) {
  const { st, settings } = m, Sg = spec.strings.growNow, now = m.now ?? Date.now();
  const c = S.instantGrowCost(st, settings, now), short = S.canPay(st, c.e, c.d, c.s) ? "" : S.shortIcons(st, c.e, c.d, c.s);
  return [
    { id: "grow", act: "growNow", room: null, mark: "", name: Sg.cards.grow.name, cost: S.priceText(c.e, c.d, c.s), gain: false, short, line: Sg.cards.grow.line, loss: false, dim: !!short },
    { id: "wait", act: "wait", room: null, mark: "", name: Sg.cards.wait.name, cost: "", gain: false, short: "", line: fill(Sg.cards.wait.line, { n: S.budMinutesLeft(st, settings, now) }), loss: false, dim: false },
  ];
}
// The bud as the juvenile it becomes, before it exists: the mibi the hatch will make (hatchBud's own `read`), at the juvenile stage. Only its looks are used.
export function hatchedGhost(st, settings) {
  const B = st.bud, fr = frameOf(B.species), read = B.kind === "cross" ? [...(B.read || [])] : fr.chapters.filter((c) => (B.read || []).includes(c.id) || !S.shutSealed(c, settings)).map((c) => c.id);
  return { id: -1, sp: B.sp, species: B.species, genome: B.genome, sha: B.sha, read, stage: "juvenile" };
}
// The Hatch now | Wait panel's props (panel.json `hatchnow`, the day set at x0.733): the hatched look in the left window and the growing look in the right, drawn by the face from the same layers.
export function hatchNowBuild(m, spec, frame, pods) {
  const { st, settings } = m, now = m.now ?? Date.now(), requests = [], req = reqOf(requests), P = spec.hatchnow, W = spec.incubate.windows, B = st.bud, species = B.species, signed = "signed (art director, the capsule masters list)";
  const cards = growNowCards(m, spec), sz = [296, 459], [lw, lh] = W.left.slice(2);
  const room = slot(req, "capsule-room-day-474x468", [0, 0, lw, lh], signed), L = layers(req, sz, ["interior-day", "shell", "bar-lit", "glass-closed"]), door = slot(req, "capsule-door-open-457x459", [0, 0, 457, 459], signed);
  const lay = P.left.layers, rlay = P.right.layers, area = podArea(180), sealedArea = podArea(P.left.podHeight);
  const interior = { id: L["interior-day"], at: lay };
  const opened = relitPod(req, { species, variant: "opened", light: "day", h: P.left.podHeight, scale: P.left.openedScale, tag: "panel", area, bg: bgOf(interior, P.left.foot, area.anchor) });
  const juv = relitJuvenile(req, st, hatchedGhost(st, settings), settings, { height: P.left.juvenile.height, foot: P.left.juvenile.foot, light: "day", interior });
  const sealed = relitPod(req, { species, variant: "pod", light: "day", h: P.right.podHeight, area: sealedArea, bg: bgOf({ id: L["interior-day"], at: rlay }, P.right.foot, sealedArea.anchor) });
  const progress = S.budProgress(st, settings, now), barPx = Math.max(1, Math.floor(P.bar.max * progress));
  const regions = { cards: [{ id: "grow" }, { id: "wait" }], verbs: { grow: cards[0].name, wait: cards[1].name }, price: cards[0].cost, caption: cards[1].line, barPx,
    left: { room, interior: L["interior-day"], shell: L.shell, door, bar: L["bar-lit"], layerSize: sz, opened, openedSize: area.size, openedAnchor: area.anchor, juvenile: juv.picture, juvenileSize: juv.size, juvenileAnchor: juv.anchor },
    right: { room, interior: L["interior-day"], shell: L.shell, glass: L["glass-closed"], bar: L["bar-lit"], layerSize: sz, pod: sealed, podSize: sealedArea.size, podAnchor: sealedArea.anchor } };
  const ui = m.ui.panel, cur = ui.focus === "card.wait" || ui.focus === "card.grow" ? ui.focus : initialFocus(cards), card = cur === "card.wait" ? cards[1] : cards[0];
  const line = { ok: card.name, subject: "", need: card.dim ? fill(pods.strings.needMore, { icons: card.short }) : "", back: spec.strings.back ?? "Back" };
  return { overlay: { id: "panel", state: "open", form: "hatchnow", regions, focus: { cur, targets: [{ id: "card.grow", enabled: true }, { id: "card.wait", enabled: true }] } }, line, requests, cards };
}
// The cards of the dock arrival's choice strip (the dock arrival spec, the strip form): Open the bay (the crates open, small; free; "{n in words} crates to the rack") and Later (the crates sealed, small; free; "they wait while docked").
export const STRIP_PICTURE = [96, 96];
export function dockCards(m, spec, frame, requests) {
  const Sg = spec.strings.dock, n = m.ui.cargo?.arrival?.crates ?? 0, C = frame.regions.panel.strip.picture;
  // the card's crate: a 96 × 96 window of the placed crate master, 1:1 (frame.json regions.panel.strip.picture.crops)
  const crop = (k) => { const c = C.crops[k], id = `crate-${k}-crop-${C.size[0]}x${C.size[1]}`; requests.push({ kind: "crop", id, master: c.master, of: c.of, at: c.at, size: C.size, until: "the crate master it is cut from (T-20261016-161)" }); return id; };
  const open = plural(n, Sg.oneCrate, fill(Sg.cards.open.line, { "n in words": SPELL[n] ?? "many" }));
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
export const cardsOf = (m, spec, frame, requests) => (m.ui.panel.id === "incubate" ? incubateCards() : m.ui.panel.id === "fitUpgrade" ? fitCards(m, spec, frame, requests) : m.ui.panel.id === "growNow" ? growNowCards(m, spec) : m.ui.panel.id === "dock" ? dockCards(m, spec, frame, requests) : wildCards(m, spec, frame, requests));
export const titleOf = (m, spec) => {
  const id = m.ui.panel.id, t = spec.strings[id].title;
  if (id === "wildMibi") return fill(t, { name: habitatShown(m.st, m.sv, m.ui.hab.id)?.name ?? "" });
  if (id === "growNow") return fill(t, { Species: S.cap(S.spName(m.st.bud)) });
  return t;
};

// The first card that is not dimmed (a loss card, where a panel has one, is never first); if every card is one or the other, the way-out card (the last): the focus a panel opens on.
export const initialFocus = (cards) => "card." + (cards.find((c) => !c.dim && !c.loss) ?? cards.at(-1)).id;

export function panelBuild(m, spec, frame, pods) {
  if (m.ui.panel.id === "incubate") return incubateBuild(m, spec, frame, pods, m.create);
  if (m.ui.panel.id === "growNow") return hatchNowBuild(m, spec, frame, pods);
  const requests = [], cards = cardsOf(m, spec, frame, requests), Sg = spec.strings, ui = m.ui.panel;
  const cur = cards.some((c) => "card." + c.id === ui.focus) ? ui.focus : initialFocus(cards), card = cards.find((c) => "card." + c.id === cur);
  const strip = ui.id === "dock";   // the strip form: no veil, housing or masters of its own (the code-drawn plate and wells), the cards carry no art
  const art = strip ? { housing: "", veil: "", shadow: "", chip: "" } : artOf(frame, cards.length, requests, cards.some((c) => c.outcome === "wild")), regions = { title: titleOf(m, spec), art: { housing: art.housing, veil: art.veil, shadow: art.shadow, chip: art.chip }, cards: cards.map(({ act, room, art: own, ...c }) => ({ ...c, art: strip ? own : c.outcome === "wild" ? { ...art.card, glow: "", scene: art.scene } : art.card })) };
  const subject = !strip ? "" : card.line || (card.room ? fill(Sg.toRoom, { room: Sg.rooms[card.room] }) : "");
  const line = { ok: card.name, ...(card.cost ? { price: card.cost } : {}), subject, back: Sg.back, need: card.short ? fill(pods.strings.needMore, { icons: card.short }) : null };
  if (card.dim) { line.dim = true; line.short = card.short; }
  return { overlay: { id: "panel", state: "open", ...(strip ? { form: "strip" } : {}), regions, focus: { cur, targets: cards.map((c) => ({ id: "card." + c.id, enabled: true })) } }, line, requests, cards };
}

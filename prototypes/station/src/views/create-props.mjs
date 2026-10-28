// The Create props (lvgl-switch.md §2.1, §4 R; create.json): pure selectors from the state, the screen's UI state and the presentation to the props of the face's Create words. Props name *what*, never *where*: states, counts,
// asset ids, strings, flags and which trait and look is chosen; no rectangle, no measure, no layout rule, no colour (the words place everything from create.json). The output is plain JSON:
// { props (state, regions, focus), line (the bottom line, for the frame), requests (the pictures the host makes ready before the props) }.
// Runs in Node, tested there (tests/create-props.test.mjs); the shape is create.props.json.
//   m: { st, settings, ui: { create: { podId, choices, f, clash, grown } } }, spec create.json, pods pods.json
//   ui.create.grown is what ✓ Grow it made (intents/create.mjs): { code, cost }; it holds the screen in its grow state while the pod, no longer in the rack, travels.
import * as S from "../state.mjs";
import { shutSealed } from "../state.mjs";
import { plateReq, kPct } from "../stamplook.mjs";
import { warnWords } from "./goal-words.mjs";
import { frameOf, traitState, genomeDigest, stampSizing, codeText } from "../genome.mjs";
import { railOf } from "./pods-props.mjs";
import { slotAt as slot, ph as phOf } from "./requests.mjs";
import { treatmentOf, drawnDigest, builtOf } from "../art.mjs";
import { layers, relitPod, podArea, bgOf } from "./capsule-props.mjs";
import { fill, spell, plural } from "./words.mjs";
import { req as reqOf } from "./requests.mjs";

const slug = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// The traits a pod can be shaped on: the read ones, in chapter order, with their chapter (the ring order of ◀ ▶).
export const reviewTraits = (p, frame) => frame.chapters.filter((c) => p.read.includes(c.id)).flatMap((c) => c.traits.map((t) => ({ c, t })));
// The pod Create is on: held by id; while it grows, the one ✓ Grow it made (the rack no longer holds it), else the rack's.
export const createPod = (st, cr) => cr.grown?.pod ?? st.tray.find((q) => q.id === cr.podId) ?? null;
// The founder's picture id for the choices made (the picture the roll's dither starts from and ends on): founder:<species>:<drawn digest>:<clear|ghost|veil-<groups>>:<w>x<h>. The drawn digest is the genome as drawn (Glow's emission and
// Charge's phase are not the mibi's own while unread); the treatment is art.mjs's treatmentOf on the chapters read: nothing read the ghost, an unread look a veil over its groups (body, coat, face, leg, tail), only doings unread clear.
export function founderPicture(p, choices, size) {
  const fr = frameOf(S.speciesOf(p)), g = S.founderGenome(p, choices), b = builtOf(fr, g, p.read), t = treatmentOf(fr, p.read, !b.error && b.validation.status === "valid" ? b.scene : null);
  return { id: `founder:${S.speciesOf(p)}:${drawnDigest(fr, g, p.read)}:${t.mode === "veil" ? "veil-" + t.groups.join("+") : t.mode}:${size.join("x")}`, read: [...p.read], mode: t.mode };
}

export function createBuild(m, spec, pods) {
  const { st, settings } = m, cr = m.ui.create, requests = [], req = reqOf(requests);
  const p = createPod(st, cr), fr = frameOf(S.speciesOf(p)), R = spec.regions, list = reviewTraits(p, fr), changed = S.changedTraits(cr.choices), grown = !!cr.grown;
  const state = grown ? "grow" : list.length ? "shape" : "nothingRead";
  const ph = phOf(req, "its master (masters/index.json)");
  const f = clamp(cr.f, 0, Math.max(0, list.length - 1)), cur = list[f] ?? null, genome = S.founderGenome(p, cr.choices);
  const regions = {};

  // the bench: the Create stage master
  regions.bench = { room: [slot(req, R.bench.slice, R.bench.rect, "the Create stage master")] };

  // the rail: one tab a chapter and one 12 × 12 mark a tab: a clash cross when a trait of the chapter clashes, else a changed diamond when one is changed, else none (fix 11); the open tab is the focused trait's chapter (nothing is open while it grows, fix 5 C7)
  const open = cur && !grown ? fr.chapters.findIndex((c) => c === cur.c) : -1, rail = railOf(m, pods, p, fr.chapters, req, open, null);
  rail.focused = null;
  rail.tabs.forEach((tab, i) => {
    const c = fr.chapters[i];
    tab.glint = false;
    tab.mark = c.traits.some((t) => cr.clash.includes(t.id)) ? "clash" : c.traits.some((t) => cr.choices[t.id]) ? "changed" : "";
  });
  regions.rail = rail;   // the changed and clash pips are the words' chrome rects (create.json: the kit's chrome), never pictures

  // the roll: three pictures (as the pod is, only the first copy, only the second copy) or one; the chosen one ringed
  if (list.length) {
    const opts = S.rollOptions(p, cur.t.id), rolls = opts.length > 1, pic = (look) => slot(req, `roll-${S.speciesOf(p)}-${slug(cur.t.name)}${look == null ? "" : "-" + slug(look)}-128x72`, [0, 0, ...R.roll.picture.size], "the roll picture master (cut from the painting)");
    const chosen = rolls ? (cr.choices[cur.t.id] || 0) : 0, clash = cr.clash.includes(cur.t.id);
    const pictures = rolls ? opts.map((o) => pic(o.look)) : [pic(cur.t.nature === "doing" ? null : traitState(fr, cur.t, genome).shows)];
    regions.roll = { form: rolls ? "roll" : "single", chosen, clash, pictures, notches: rolls, shown: !grown };   // grow: every node kept with no size (shown false), the pictures stay requested (fix 5 C7)   // the notches are the words' chrome, drawn only while the trait rolls
  }

  // the trait line: the focused trait and its chosen look; the changed tag (chrome), the clash cross or the breed mark (the mark is named in every state: the face keeps its node)
  const T = spec.strings.traitLine, breedPic = slot(req, "mark-breed-28x16", [0, 0, ...R.traitLine.breedMark.size], "the breed mark master");
  let line = { text: "", changed: false, breed: breedPic, doing: false, clash: false };   // nothingRead and grow: no size (fix 5 C2, C7); the tag is the face's, from the plate-name series (C9)
  if (cur && !grown) {
    const opts = S.rollOptions(p, cur.t.id), choice = cr.choices[cur.t.id] || 0, own = traitState(fr, cur.t, genome), name = cur.t.name;
    if (cr.clash.includes(cur.t.id)) line = { ...line, text: fill(T.clash, { Trait: name }), clash: true };
    else if (cur.t.nature === "doing") line = { ...line, text: fill(T.doing, { Trait: name }), doing: true };
    else if (opts.length <= 1) line = { ...line, text: fill(T.oneLook, { Trait: name }) };
    else if (choice) {   // the look is the founder's own after the choice (own.shows); sameLook only when all four hold (game designer fix 5 Q2a)
      const podOwn = traitState(fr, cur.t, p.genome), same = podOwn.kind === "hides" && choice !== podOwn.hiddenChoice && own.kind !== "asleep";
      line = { ...line, text: own.kind === "asleep" ? fill(T.asleep, { Trait: name, shows: own.shows, sleeping: own.asleep }) : fill(same ? T.sameLook : T.only, { Trait: name, look: own.shows }), changed: true };
    }
    else if (own.kind === "asleep") line = { ...line, text: fill(T.asleep, { Trait: name, shows: own.shows, sleeping: own.asleep }) };
    else line = { ...line, text: fill(T.asPod, { Trait: name }) };
  }
  regions.traitLine = line;

  // the work tray, the founder, the pod and its dish, the origin, the small chamber
  regions.chamber = { back: ph("chamber-back-400x320", R.chamber.rect.slice(2)) };
  regions.chamberFront = { picture: ph("chamber-front-400x320", R.chamberFront.rect.slice(2)) };
  const fp = founderPicture(p, cr.choices, R.founder.rect.slice(2));
  regions.founder = { picture: req({ kind: "founder", id: fp.id, pod: p.id, choices: cr.choices, species: S.speciesOf(p), read: fp.read, size: R.founder.rect.slice(2) }) };
  const sizeClass = fr.pod?.sizeClass ?? "medium", box = pods.classes.pod[sizeClass];
  regions.pod = { sizeClass, picture: req({ kind: "pod", id: `pod:${S.speciesOf(p)}:i:${box.join("x")}`, species: S.speciesOf(p), state: "identified", size: box }) };   // the pod at rest in the capsule is regions.pod.dome, set below
  regions.podShadow = { picture: slot(req, `pod-${sizeClass}-shadow`, [0, 0, box[0] + pods.shadow.widen, pods.shadow.h], "the contact shadow") };   // as Pods' rule: named in every state, the face keeps its node
  regions.cradle = { front: slot(req, R.cradleFront.slice, R.cradleFront.rect, "the dish's front (CA3: Create's own)") };   // the dish itself is painted into the stage; its front is drawn in every state
  regions.origin = S.podOriginLines(p);
  { const size = R.dome.rect.slice(2), L = layers(req, size, ["interior-day", "shell", "bar-lit", "glass-closed", "door-open"]);   // the capsule (T-20261016-222): its interior, the glass drawn in code, the shell and the bar; the bar is lit while another bud grows
    const B = !grown ? st.bud : null, dstate = grown ? "grow" : !B ? "empty" : S.budReady(st, settings, m.now ?? Date.now()) ? "ready" : "growing";   // the chamber mirrors the Incubator (UI/UX round 2, B2): empty door open; a bud growing glass closed, its pod, the bar lit; ready door open, its pod; after Incubate glass over the new pod once it lands
    regions.dome = { back: L["interior-day"], glass: L["glass-closed"], door: L["door-open"], bar: L["bar-lit"], state: dstate };
    regions.domeFront = { picture: L.shell };
    const h = R.dome.podHeight, area = podArea(h), foot = R.travel.foot.to;   // the pod at rest in it: 72 tall, relit, its foot on the moss line
    if (B) { const pa = podArea(h); Object.assign(regions.dome, { pod: relitPod(req, { species: B.species, variant: "pod", light: "day", h, area: pa, bg: bgOf({ id: L["interior-day"], at: R.dome.rect.slice(0, 2) }, foot, pa.anchor) }), podSize: pa.size, podAnchor: pa.anchor }); }
    regions.pod.dome = relitPod(req, { species: S.speciesOf(p), variant: "pod", light: "day", h, area, bg: bgOf({ id: L["interior-day"], at: R.dome.rect.slice(0, 2) }, foot, area.anchor) }); regions.pod.domeSize = area.size; regions.pod.domeAnchor = area.anchor; }

  // the painted contact shadow under the founder (fix 6 A2): named in every state, the face keeps its node and gives it no size until the picture is on the face
  regions.founderShadow = { picture: slot(req, "founder-shadow-224x14", [0, 0, ...R.founderShadow.rect.slice(2)], "the contact shadow") };

  // the stamp of the read and changed chapters, and the code (printed at Grow)
  const readIds = [...new Set([...p.read, ...fr.chapters.filter((c) => c.traits.some((t) => changed.includes(t.id))).map((c) => c.id)])], sz = stampSizing(fr, genome);
  const k = spec.colours.stampLabel.k;
  regions.stamp = { case: { back: slot(req, R.stampCase.slice, R.stampCase.rect, "the stamp case master"), front: slot(req, R.stampCaseFront.slice, R.stampCaseFront.rect, "the case's front glass") }, size: sz.size, N: sz.N, cell: sz.cell, plate: plateReq(req, k), asset: req({ kind: "stamp", id: `stamp:${genomeDigest(genome)}:${[...readIds].sort().join(",")}:${sz.size}:k${kPct(k)}`, pod: p.id, species: S.speciesOf(p), read: readIds, size: sz.size, choices: cr.choices, k }) };
  regions.code = grown ? codeText(cr.grown.code) : "";

  // the bottom line: ✓ Grow it and the price, what stays a surprise, the first block (the rules' order, growBlockKey) with its notice; ← the pod
  const Sg = spec.strings, cost = grown ? cr.grown.cost : S.growCost(st, cr.choices, settings), key = grown ? null : S.growBlockKey(st, p, cr.choices, settings, cr.clash);
  const unread = fr.chapters.filter((c) => !p.read.includes(c.id) && !shutSealed(c, settings)), shut = fr.chapters.filter((c) => !p.read.includes(c.id) && shutSealed(c, settings)), name = S.spName(p);
  // the context: nothingRead the pod's own sentence; unread chapters the count alone (a shut sealed chapter is never counted: shutSealed); every other chapter read and a sealed one shut, naming it (owner, W4); else fully known
  const subject = state === "nothingRead" ? Sg.traitLine.none : unread.length ? plural(unread.length, fill(Sg.surprise.one, { Chapter: unread[0].name }), fill(Sg.surprise.more, { "n in words": spell(unread.length, "many") })) : shut.length ? fill(Sg.sealedShut, { Chapter: shut[0].name }) : S.cap(S.aAn(name)) + ", fully known";
  // grow: the line is Growing, with no action, price or way back (null: the frame drops their nodes), an empty right slot and its own context (fix 5 C6); else C5: the right slot is Create's own, block reasons first, then the shortfall, then the warning, else empty
  const bottom = grown ? { ok: null, price: null, back: null, subject: Sg.growing, need: "" } : { ok: Sg.action, price: S.priceText(cost.e, cost.d, cost.s, S.budMinutes(st, changed.length, settings)), back: S.cap(name), subject, need: "" };
  if (!grown && key && key.key === "short") { bottom.dim = true; bottom.short = key.short; bottom.need = fill(Sg.notices.shortFrom[key.from], { icons: key.short }); }   // short: the dimmed ✓, the short figures amber
  else if (!grown && key) { bottom.blocked = true; bottom.need = key.key === "busy" ? Sg.notices.busy : key.key === "full" ? Sg.notices.full : key.key === "clash" ? Sg.notices.clash : ""; }   // busy, full, clash: the verb and the price in mist; ✓ plays the plate (intents/create.mjs)

  if (!key && !grown && m.frame) bottom.need = warnWords(st, m.sv, settings, m.frame, cost, { key: "grow", pod: p }) || "";   // ✓ would leave the goal's next price short: one amber line, nothing asked
  const props = { state, regions, focus: { cur: list.length && !grown ? "roll" : "room", targets: list.length && !grown ? [{ id: "roll", group: "roll" }] : [] } };
  return { props, line: bottom, requests };
}

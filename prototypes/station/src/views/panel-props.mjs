// The decision panel as an overlay's props (panel.json, frame.json regions.panel; specs/station-decision-panel-spec.md Part 1; lvgl-switch.md §2.2): the title, the cards and the focus, with the bottom line built from the focused card
// (the line and the panel never disagree, because both read it). Props name *what*, never *where*: strings, asset ids and picture sizes, flags, the cost as the bottom line's price string, and the focus targets by id; the rectangles
// are frame.json's. Costs come from the rules (state.mjs), never from the strings. Runs in Node, tested there (tests/panel-props.test.mjs); the shape is panel.props.json.
//   m: { st, settings, ui: { create, panel: { screen, id, focus } }, jump: "arrival" | "fork" }, spec panel.json, frame frame.json, pods pods.json, create create.json
import * as S from "../state.mjs";
import { createPod, founderPicture } from "./create-props.mjs";
import { frameOf } from "../genome.mjs";

const fill = (t, o) => t.replace(/\{([^}]+)\}/g, (_, k) => (k in o ? o[k] : "{" + k + "}"));
const SPELL = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
export const PICTURE = [104, 112];   // the juvenile and the founder as the card shows them (decision panel spec §1.6)

// The cards of the Grow this founder? panel, in order (§1.6, §3): the way out is always last. `act` and `room` stay on the host (the face is sent neither).
export function growCards(m, spec, frame, requests) {
  const { st, settings } = m, cr = m.ui.create, Sg = spec.strings.grow, p = createPod(st, cr), species = S.speciesOf(p), jump = m.jump === "fork" ? "fork" : "arrival";
  const req = (r) => { requests.push(r); return r.id; };
  const changed = S.changedTraits(cr.choices), cost = S.growCost(st, cr.choices, settings), short = S.canPay(st, cost.e, cost.d, cost.s) ? "" : S.shortIcons(st, cost.e, cost.d, cost.s);
  const price = S.priceText(cost.e, cost.d, cost.s, S.budMinutes(st, changed.length, settings));
  const fr = frameOf(species), unread = fr.chapters.filter((c) => !p.read.includes(c.id) && !S.shutSealed(c, settings));
  const surprise = unread.length === 1 ? fill(Sg.cards.grow.line.one, { Chapter: unread[0].name }) : unread.length > 1 ? fill(Sg.cards.grow.line.more, { "n in words": SPELL[unread.length] ?? "many" }) : "";
  const jid = `mibi-juvenile-${species}-${PICTURE.join("x")}`, juvenile = req({ kind: "slot", id: jid, master: jid, size: PICTURE, until: "the founder's juvenile (the stand-in at this size)" });   // the stand-in the Vivarium places at this size, by its own id
  const founder = req({ kind: "founder", id: founderPicture(p, cr.choices, PICTURE).id, pod: p.id, choices: cr.choices, species, read: [...p.read], size: PICTURE });
  const mark = frame.regions.marks.room.research;
  const grow = (id, line, room) => ({ id, act: id, room, picture: juvenile, pictureSize: PICTURE, mark, name: Sg.cards[id].name, cost: price, gain: false, short, line, loss: false, dim: !!short });
  const cards = jump === "fork"
    ? [grow("watch", Sg.cards.watch.line, "research"), grow("read", Sg.cards.read.line, "research")]
    : [grow("grow", surprise, "research")];
  cards.push({ id: "shape", act: "shape", room: null, picture: founder, pictureSize: PICTURE, mark: "", name: Sg.cards.shape.name, cost: "", gain: false, short: "", line: "", loss: false, dim: false });
  return cards;
}
export const cardsOf = (m, spec, frame, requests) => (m.ui.panel.id === "grow" ? growCards(m, spec, frame, requests) : []);
export const titleOf = (m, spec) => (m.ui.panel.id === "grow" ? spec.strings.grow.title : "");

// The first card that is neither dimmed nor a loss; if every card is one or the other, the way-out card (the last): the focus a panel opens on.
export const initialFocus = (cards) => "card." + (cards.find((c) => !c.dim && !c.loss) ?? cards.at(-1)).id;

export function panelBuild(m, spec, frame, pods) {
  const requests = [], cards = cardsOf(m, spec, frame, requests), Sg = spec.strings, ui = m.ui.panel;
  const cur = cards.some((c) => "card." + c.id === ui.focus) ? ui.focus : initialFocus(cards), card = cards.find((c) => "card." + c.id === cur);
  const regions = { title: titleOf(m, spec), cards: cards.map(({ act, room, ...c }) => c) };
  const subject = card.line || (card.room ? fill(Sg.toRoom, { room: Sg.rooms[card.room] }) : "");
  const line = { ok: card.name, ...(card.cost ? { price: card.cost } : {}), subject, back: Sg.back, need: card.short ? fill(pods.strings.needMore, { icons: card.short }) : null };
  if (card.dim) { line.dim = true; line.short = card.short; }
  return { overlay: { id: "panel", state: "open", regions, focus: { cur, targets: cards.map((c) => ({ id: "card." + c.id, enabled: true })) } }, line, requests, cards };
}

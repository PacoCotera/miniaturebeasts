// One mibi up close as props (lvgl-switch.md §2.1, §4 V; habitat.json): pure selectors from the state, the focus and the presentation to the props of the face's Habitat words. Props name *what*, never *where*: ids, strings, states,
// counts, flags and the focus targets by id; no rectangle, no measure, no layout rule, no colour (the words place everything from habitat.json). The output is plain JSON:
// { props (state, regions, focus), line (the bottom line, for the frame), requests (the pictures the host makes ready before the props) }.
// Runs in Node, tested there (tests/habitat-props.test.mjs); the shape is habitat.props.json.
//   m: { st, sv, settings, docked, light, focus (the ring: a target id, or null for the way in), habId (the mibi up close), meetId (the new mibi whose meet is on), armed (the Wild gate), offline }
import * as S from "../state.mjs";
import * as T from "../sitting.mjs";
import { frameFor } from "../state.mjs";
import { stampSizing, genomeDigest, codeText } from "../genome.mjs";
import { habitatShown } from "../trickle.mjs";
import { habitsOf, placesOf } from "../state.mjs";

const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => (k in o ? o[k] : "{" + k + "}"));
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven"];
const paintWaiting = (mb) => !mb.paint || ["queued", "painting", "capped", "sent"].includes(mb.paint.state);
// The species' face (the top bar's mark, frame.json regions.marks.face), docked or dimmed.
const faceId = (frame, mb, away) => (away ? frame.regions.marks.face.away : frame.regions.marks.face.docked).replace("{mibi}", S.spName(mb).toLowerCase());

export function habitatBuild(m, spec, frame, home) {
  const { st, sv, settings } = m, requests = [], req = (r) => { requests.push(r); return r.id; };
  const R = spec.regions, Sg = spec.strings, docked = !!m.docked;
  const shown = habitatShown(st, sv, m.habId); if (!shown) return null;
  const slot = (id, size, until) => req({ kind: "slot", id, master: id, size, until: until || "its master (habitat.json masters)" });
  const carried = S.carriedIds(st, sv), proj = S.projectCarried(st, sv), pend = S.pendingCarry(st, sv);
  const out = S.isAway(st, sv, shown), meet = !out && m.meetId != null && String(m.meetId) === String(shown.id);
  const state = out ? "out" : meet ? "meet" : "rest";
  const stage = S.mibiStage(st, shown, settings), stageWord = home.strings.stages[stage] ?? stage, species = S.spName(shown), fr = frameFor(shown), sid = String(shown.id);
  const waiting = paintWaiting(shown);

  const regions = {};
  regions.stage = { room: [slot("room-vivarium-stage-habitat", R.stage.rect.slice(2), "the up-close stage master")] };
  regions.glass = { picture: slot(`${spec.light.pictures[m.light]}-${spec.light.size.join("x")}`, spec.light.size, "the near Vivarium master (the light)") };
  regions.resident = out
    ? { id: sid, name: shown.name, stage, picture: "", waiting: false, out: slot("mark-out-with-companion-64x96", R.resident.out.rect.slice(2), "the out mark") }
    : { id: sid, name: shown.name, stage, picture: req({ kind: "mibi", id: `mibi:${shown.id}:${R.resident.rect[2]}x${R.resident.rect[3]}`, mibi: shown.id, species: S.speciesOf(shown), size: R.resident.rect.slice(2) }), waiting, out: "" };
  regions.nameTag = { text: shown.name };
  regions.meetRibbon = { text: meet ? fill(Sg.meet, { name: shown.name }) : "" };

  // the card: who it is (the species word is the door to the guide), where it came from and what it remembers, its code, the heart and the notches, its stamp
  const place = (g) => S.PLACE_WORD[g] || g, from = shown.from || {};
  const story = (from.of && from.of.length === 2 ? [fill(Sg.story.bred[0], { A: from.of[0] }), fill(Sg.story.bred[1], { B: from.of[1] })] : [fill(Sg.story.founder[0], { place: place(from.g) })]).concat(shown.mem ? [fill(Sg.story.memory, { place: place(shown.mem) })] : []).slice(0, 3);
  const sz = stampSizing(fr, shown.genome);
  regions.card = {
    heart: shown.bonded ? slot("heart-full-24", R.card.heart.size, "the heart master") : "",
    notches: { count: Math.min(shown.notches || 0, 3), picture: slot("notch-skill-16x24", R.card.notches.notch, "the skill notch master") },
    species: { text: fill(Sg.speciesLine, { Species: species, stage: stageWord }), mark: slot("mark-guide-16", [16, 16], "the guide mark master") },
    story, code: codeText(shown.code),
    stamp: { size: sz.size, asset: req({ kind: "stamp", id: `stamp:${genomeDigest(shown.genome)}:${[...(shown.read || [])].sort().join(",")}:${sz.size}`, species: S.speciesOf(shown), read: shown.read || [], size: sz.size, mibi: shown.id }) },
  };

  // the plates, one a chapter in ring order: read, unread (readable at home or out) or sealed
  const sealedShut = (c) => !!c.sealed && !settings.sealedOpen && !(shown.read || []).includes(c.id);
  const plates = (fr?.chapters ?? []).slice(0, R.plates.places.max).map((c) => {
    const st2 = (shown.read || []).includes(c.id) ? "read" : sealedShut(c) ? "sealed" : "unread";
    return { id: c.id, state: st2, ground: slot(`chapter-plate-${st2}-40x40`, [40, 40], "the chapter plate master"), emblem: req({ kind: "emblem", id: `emblem:${c.id}:${st2}:24`, chapter: c.id, state: st2 }) };
  });
  regions.plates = { items: plates };

  // the Companion module: the set as it will be, in its order; an add request waiting shows its lamp
  const places = proj.slice(0, 3).map((id) => { const mb = S.mibiById(st, id); return mb ? { picture: req({ kind: "mibi", id: `mibi:${mb.id}:48x48`, mibi: mb.id, species: S.speciesOf(mb), size: [48, 48] }), waiting: !carried.includes(id) } : null; });
  while (places.length < 3) places.push(null);
  regions.door = { state: !proj.length ? "none" : docked ? "docked" : "away", glyph: docked ? frame.regions.marks.companion.docked : frame.regions.marks.companion.away, places, lamp: frame.regions.marks.lamp8.away };

  // the Portrait module
  const pst = shown.portrait ? (shown.portrait.state === "delivered" ? "portrayed" : "painting") : st.sitting ? "held" : "none";
  regions.portrait = { state: pst, frame: slot(`sitting-frame-${pst === "none" ? "empty" : pst === "portrayed" ? "portrait" : "held"}-32x48`, [32, 48], "the sitting frame master") };

  // the Cross module: one face a partner, an adult or an elder of its species; a partner out with the Companion while it is away is dimmed
  const partners = S.isAdult(st, shown, settings) ? S.crossPartners(st, sv, shown, settings) : [], pickable = partners.filter((p) => !p.away);
  const crossState = stage === "juvenile" ? "young" : out ? "out" : !partners.length ? "alone" : !pickable.length ? "away" : "adult";
  regions.cross = { state: crossState, faces: partners.slice(0, R.cross.faces.max).map((p) => ({ picture: faceId(frame, p, !!p.away), away: !!p.away })) };

  // the Wild module: shut at rest, ajar once armed
  const wildBlock = S.returnMibiBlock(st, sv, shown), armed = !!m.armed && !wildBlock;
  regions.wild = { state: armed ? "armed" : "shut", gate: slot(`gate-wild-${armed ? "open" : "shut"}-48x48`, [48, 48], "the gate master") };

  // the strip: one tile a bay, the housed mibis in bay order then the free bays; the mibi up close is the shown tile
  const housed = S.housed(st).slice().sort((a, b) => a.bay - b.bay), n = S.bayCount(st, settings);
  const tiles = housed.slice(0, n).map((mb) => { const away = S.isAway(st, sv, mb); return { id: String(mb.id), state: away ? "out" : "housed", shown: mb.id === shown.id, picture: away ? "" : req({ kind: "mibi", id: `mibi:${mb.id}:48x48`, mibi: mb.id, species: S.speciesOf(mb), size: [48, 48] }) }; });
  while (tiles.length < n) tiles.push({ id: "", state: "free", shown: false, picture: "" });
  regions.tiles = { glyph: frame.regions.marks.companion.away, items: tiles };

  // the focus: every target of the state in the graph's groups; the plate a chapter still to read is enabled, the door and the modules as their rules say
  const unread = (p) => p.state === "unread", cost = (p) => S.mibiReadCost(st, shown, p.id, settings);
  const dKind = pend.find((r) => r.id === shown.id)?.op ?? (proj.includes(shown.id) ? "bring" : proj.length >= 3 ? "full" : "take");
  const sitting = pst === "held" && !(!docked && carried.includes(shown.id)) && habitsOf(shown).length && placesOf(shown).length;
  const targets = [];
  if (state !== "out") targets.push({ id: "resident", group: "resident", enabled: true });
  if (state !== "meet") targets.push({ id: "name", group: "name", enabled: true });
  targets.push({ id: "species", group: "species", enabled: true });
  plates.forEach((p, i) => targets.push({ id: "plate." + i, group: "plate", enabled: unread(p) }));
  targets.push({ id: "door", group: "top", enabled: dKind === "take" || dKind === "bring" });
  targets.push({ id: "portrait", group: "top", enabled: !!sitting });
  targets.push({ id: "cross", group: "low", enabled: crossState === "adult" });
  targets.push({ id: "wild", group: "low", enabled: !wildBlock });
  for (const t of tiles) if (t.state !== "free") targets.push({ id: "tile." + t.id, group: "tile", enabled: true });
  const has = (id) => targets.some((t) => t.id === id), cur = m.focus && has(m.focus) ? m.focus : out ? "name" : "resident";
  const focus = { cur, targets, resolve: { "tile.shown": "tile." + sid }, armed: armed ? "wild" : null };

  // the bottom line (habitat.json bottomLine): the action and the context of the focused target; ← Vivarium
  const a = S.aAn(stageWord).split(" ")[0], words = { a, stage: stageWord, species }, contextOf = shown.bonded ? fill(Sg.residentContextBonded, words) : fill(Sg.residentContext, words);
  const named = { name: shown.name };
  const painting = waiting ? (m.offline ? Sg.offline : Sg.painting) : null;
  let line = { ok: null, subject: "", back: Sg.back, need: null };
  const id = cur.startsWith("tile.") ? "resident" : cur;
  if (id === "resident") line = { ok: meet ? fill(Sg.name, named) : fill(Sg.greet, named), subject: painting ?? contextOf, back: Sg.back, need: null };
  else if (id === "name") line = { ok: fill(Sg.rename, named), subject: out ? Sg.out : painting ?? contextOf, back: Sg.back, need: null };
  else if (id === "species") line = { ok: Sg.guide, subject: fill(Sg.every, { Species: species }), back: Sg.back, need: null };
  else if (id.startsWith("plate.")) {
    const p = plates[+id.slice(6)], ch = fr.chapters[+id.slice(6)], Chapter = ch.name;
    if (p.state === "read") line = { ok: null, subject: fill(Sg.plateRead, { Chapter }), back: Sg.back, need: null };
    else if (p.state === "sealed") line = { ok: null, subject: fill(Sg.plateSealed, { Chapter }), back: Sg.back, need: null };
    else { const c = cost(p), short = c > st.d ? S.shortIcons(st, 0, c, 0) : ""; line = { ok: fill(Sg.read, { Chapter }), price: c ? "◆ " + c : "", ...(short ? { dim: true, short } : {}), subject: fill(Sg.plateUnread, { Chapter }), back: Sg.back, need: null }; }
  } else if (id === "door") {
    const now = docked;
    line = dKind === "take" ? { ok: fill(Sg.take, named), subject: now ? Sg.takeNow : Sg.takeNext }
      : dKind === "bring" ? { ok: fill(Sg.bring, named), subject: now ? Sg.bringNow : Sg.bringNext }
      : dKind === "add" ? { ok: null, subject: now ? Sg.takeNow : Sg.takeNext }
      : dKind === "home" ? { ok: null, subject: Sg.bringNext }
      : { ok: null, subject: Sg.full };
    line = { ...line, back: Sg.back, need: null };
  } else if (id === "portrait") {
    const why = pst === "none" ? Sg.noSitting : pst === "painting" ? Sg.portraitOnWay : pst === "portrayed" ? Sg.portrayed : !docked && carried.includes(shown.id) ? Sg.portraitOut : !habitsOf(shown).length ? Sg.noPose : !placesOf(shown).length ? Sg.noPlace : null;
    line = why ? { ok: null, subject: why, back: Sg.back, need: null } : { ok: fill(Sg.portray, named), subject: Sg.portrayContext, back: Sg.back, need: null };
  } else if (id === "cross") {
    line = crossState === "adult" ? { ok: fill(Sg.cross, named), subject: fill(Sg.partners, { "n in words": WORDS[Math.min(pickable.length, 11)], Species: species }) }
      : { ok: null, subject: crossState === "out" ? Sg.crossOut : crossState === "away" ? Sg.crossAway : crossState === "alone" ? fill(Sg.noPartner, { Species: species }) : Sg.crossLater };
    line = { ...line, back: Sg.back, need: null };
  } else if (id === "wild") {
    const price = S.gainText(S.PRICE.wildMibi), key = { "a bonded mibi stays": "bonded", "not until it is adult": "young", "already with you": "withYou", "goes at the next dock": "waiting" }[wildBlock];
    line = wildBlock ? { ok: null, subject: Sg.wildBlocks[key] ?? wildBlock }
      : armed ? { ok: fill(Sg.wildAgain, named), price, subject: Sg.wildAgainContext } : { ok: fill(Sg.wild, named), price, subject: Sg.wildContext };
    line = { ...line, back: Sg.back, need: null };
  }
  return { props: { state, regions, focus }, line, requests, shown };
}

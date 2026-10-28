// One mibi up close as props (lvgl-switch.md §2.1, §4 V; habitat.json): pure selectors from the state, the focus and the presentation to the props of the face's Habitat words. Props name *what*, never *where*: ids, strings, states,
// counts, flags and the focus targets by id; no rectangle, no measure, no layout rule, no colour (the words place everything from habitat.json). The output is plain JSON:
// { props (state, regions, focus), line (the bottom line, for the frame), requests (the pictures the host makes ready before the props) }.
// Runs in Node, tested there (tests/habitat-props.test.mjs); the shape is habitat.props.json.
//   m: { st, sv, settings, docked, light, focus (the ring: a target id, or null for the way in), habId (the mibi up close), meetId (the new mibi whose meet is on), offline }
//   sittingSpec: sitting.json, for the Portrait module's ✓ strings.lookPortrait (the portrait, offered while its picture is held)
import * as S from "../state.mjs";
import { warnWords } from "./goal-words.mjs";
import { frameFor } from "../state.mjs";
import { stampSizing, genomeDigest, codeText } from "../genome.mjs";
import { habitatShown } from "../trickle.mjs";
import { mibiReq, movingProp, restOf } from "./home-props.mjs";
const hash = (n) => (Math.imul(n + 1, 2654435761) >>> 0) % 65521;   // the residents' seed (home-props.mjs)
import { habitsOf, placesOf } from "../state.mjs";
import { listForm } from "../../../ui/specs/derive.mjs";
import { kPct } from "../stamplook.mjs";
import { doorOpen } from "../nav.mjs";
import { fill, spell } from "./words.mjs";
import { req as reqOf, slot as slotOf, plateDevice, slotAt } from "./requests.mjs";
import { portraitOffered } from "./sitting-props.mjs";
import { roomIds, nearOf } from "./room-props.mjs";

// The species' face (the top bar's mark, frame.json regions.marks.face), docked or dimmed.
const faceId = (frame, mb, away) => (away ? frame.regions.marks.face.away : frame.regions.marks.face.docked).replace("{mibi}", S.spName(mb).toLowerCase());

export function habitatBuild(m, spec, frame, home, sittingSpec = null) {
  const { st, sv, settings } = m, requests = [], req = reqOf(requests);
  const R = spec.regions, Sg = spec.strings, docked = !!m.docked;
  const shown = habitatShown(st, sv, m.habId); if (!shown) return null;
  const slot = slotOf(req, "its master (habitat.json masters)");
  const carried = S.carriedIds(st, sv), proj = S.projectCarried(st, sv), pend = S.pendingCarry(st, sv);
  const out = S.isAway(st, sv, shown), meet = !out && m.meetId != null && String(m.meetId) === String(shown.id);
  const state = out ? "out" : meet ? "meet" : "rest";
  const stage = S.mibiStage(st, shown, settings), stageWord = home.strings.stages[stage] ?? stage, species = S.spName(shown), fr = frameFor(shown), sid = String(shown.id);
  const waiting = false;
  const plate = (w, h) => req(plateDevice(w, h));
  const well = (name) => slot(name, name.match(/(\d+)x(\d+)/).slice(1).map(Number), "the device well (fix 2: placed 1:1)");

  const regions = {};
  regions.stage = { room: [slot("room-vivarium-stage-habitat", R.stage.rect.slice(2), "the up-close stage master")] };
  const roomOf = shown.room ?? st.face?.room ?? 0, near = nearOf(req, roomOf, m.light);   // the room of the mibi up close: its near view of the light (544 × 408)
  regions.glass = { picture: near };
  regions.room = { id: roomIds(roomOf, m.light).id, base: near, pieces: {} };   // the near view is the room's picture here; the pieces stand in the painting, not up close
  regions.resident = out
    ? { id: sid, name: shown.name, stage, picture: "", waiting: false, out: "" }   // out with the Companion: nothing is drawn at the mibi's spot (the line says it)
    : { id: sid, name: shown.name, stage, picture: mibiReq(req, st, shown, R.resident.rect.slice(2), settings, m.light, "habitat"), waiting, out: "" };
  if (!out) {   // Station M1 §2.6: its seed (the up-close tick's phase), its moving set up close (close and its shadow) and its rest by the household's stagger
    regions.resident.seed = hash(shown.id);
    const mv = movingProp(shown, stage, req, m, ["close", "closeShadow"]); if (mv) regions.resident.moving = { set: mv.set, close: mv.close, shadow: mv.closeShadow };
    if (m.time != null && m.restRules) { const here = S.homeMibis(st, sv); regions.resident.rest = restOf(here.map((mb) => ({ id: String(mb.id), seed: hash(mb.id), species: S.speciesOf(mb), stage: S.mibiStage(st, mb, settings) })), m.time, m.restRules)[sid] ?? "awake"; }
  }
  regions.nameTag = { text: shown.name };
  regions.meetRibbon = { text: meet ? fill(Sg.meet, { name: shown.name }) : "" };

  // the card: who it is (the species word is the door to the guide), where it came from and what it remembers, its code, the heart and the notches, its stamp
  const place = (g) => S.PLACE_WORD[g] || g, from = shown.from || {};
  const story = (from.of && from.of.length === 2 ? [fill(Sg.story.bred[0], { A: from.of[0] }), fill(Sg.story.bred[1], { B: from.of[1] })] : [fill(Sg.story.founder[0], { place: place(from.g) })]).concat(shown.mem ? [fill(Sg.story.memory, { place: place(shown.mem) })] : []).slice(0, 3);
  const sz = stampSizing(fr, shown.genome), read = fr.chapters.filter((c) => (shown.read || []).includes(c.id)).map((c) => c.id);   // the stamp of the chapters read: never an unread or a shut sealed one (the Incubator hatch's form, so the meet keeps the hatch's picture)
  regions.card = {
    plate: plate(416, 208),
    heart: shown.bonded ? slot("heart-full-24", R.card.heart.size, "the heart master") : "",
    notches: { count: Math.min(shown.notches || 0, 3), picture: slot("notch-skill-16x24", R.card.notches.notch, "the skill notch master") },
    species: { text: fill(Sg.speciesLine, { Species: species, stage: stageWord }), mark: slotAt(req, "mark-guide-16", [0, 0, 16, 16], "the guide mark master (AD G1)") },
    story, code: codeText(shown.code),
    stamp: { size: sz.size, N: sz.N, cell: sz.cell, plate: slot("plate-well-120x120", [120, 120], "the label's well (Habitat GB2)"), asset: req({ kind: "stamp", id: `stamp:${genomeDigest(shown.genome)}:${[...read].sort().join(",")}:${sz.size}:k${kPct(spec.colours.stampLabel.k)}`, mibi: shown.id, species: S.speciesOf(shown), read, size: sz.size, k: spec.colours.stampLabel.k }),
      corner: shown.portrait?.state === "delivered" ? slot(R.stamp.portrayed.slice, R.stamp.portrayed.rect.slice(2)) : "" },   // the portrayed corner on the label (regions.stamp.portrayed): only once the portrait came
  };

  // the plates, one a chapter in ring order: read, unread (readable at home or out) or sealed
  const sealedShut = (c) => !!c.sealed && !settings.sealedOpen && !(shown.read || []).includes(c.id);
  const plates = (fr?.chapters ?? []).slice(0, R.plates.places.max).map((c) => {
    const st2 = (shown.read || []).includes(c.id) ? "read" : sealedShut(c) ? "sealed" : "unread";
    return { id: c.id, state: st2, ground: slotAt(req, `chapter-plate-${st2}-40x40`, [0, 0, 40, 40], "the chapter plate master (AD P1)"), emblem: req({ kind: "emblem", id: `emblem:${c.id}:${st2}:24`, chapter: c.id, state: st2 }) };
  });
  regions.plates = { items: plates };

  // the Companion module: the set as it will be, in its order; an add request waiting shows its lamp
  const places = proj.slice(0, 3).map((id) => { const mb = S.mibiById(st, id); return mb ? { picture: mibiReq(req, st, mb, [48, 48], settings), waiting: !carried.includes(id), well: well("plate-well-48x48") } : null; });
  while (places.length < 3) places.push(null);
  for (let i = 0; i < 3; i++) if (!places[i]) places[i] = { picture: "", waiting: false, well: well("plate-well-48x48") };   // fix 2 F4: a free place is the well alone
  regions.door = { plate: plate(272, 96), state: !proj.length ? "none" : docked ? "docked" : "away", glyph: docked ? frame.regions.marks.companion.docked : frame.regions.marks.companion.away, places, lamp: frame.regions.marks.lamp8.away };

  // the Portrait module
  const pst = shown.portrait ? (shown.portrait.state === "delivered" ? "portrayed" : "painting") : st.sitting ? "held" : "none";
  regions.portrait = { plate: plate(136, 96), state: pst, frame: slotAt(req, `sitting-frame-${pst === "none" ? "empty" : pst === "portrayed" ? "portrait" : "held"}-48x40`, [0, 0, 48, 40], "the sitting frame master (AD, candidates)"), picture: pst === "portrayed" && shown.portrait.digest ? req({ kind: "portrait", id: `portrait:${String(shown.portrait.digest).slice(0, 16)}:40x30`, digest: shown.portrait.digest, size: [40, 30] }) : "" };

  // the Cross module: one face a partner, an adult or an elder of its species; a partner out with the Companion while it is away is dimmed
  const partners = S.isAdult(st, shown, settings) ? S.crossPartners(st, sv, shown, settings) : [], pickable = partners.filter((p) => !p.away);
  const crossState = stage === "juvenile" ? "young" : out ? "out" : !partners.length ? "alone" : !pickable.length ? "away" : "adult";
  regions.cross = { plate: plate(272, 96), state: crossState, faces: partners.slice(0, R.cross.faces.max).map((p) => ({ picture: faceId(frame, p, !!p.away), away: !!p.away })) };

  // the Wild module: the gate stays shut; ✓ opens the Return panel (decision panel spec §1.6), which replaced the "✓ again" arm
  const wildBlock = S.returnMibiBlock(st, sv, shown);
  regions.wild = { plate: plate(136, 96), state: "shut", gate: slotAt(req, "gate-wild-shut-48x48", [0, 0, 48, 48], "the gate master (AD W1)") };

  // the strip: one tile a place, the room shown's mibis in slot order then the free places; the mibi up close is the shown tile
  const housed = S.inRoom(st, shown.room ?? st.face?.room ?? 0), n = S.ROOM;   // the room of the mibi up close: a mibi met shows its own room
  const tw = listForm(R.tiles, n).first[2];   // the tile width of the form n places take (vivarium.json tiles.forms)
  const tiles = housed.slice(0, n).map((mb) => { const away = S.isAway(st, sv, mb), isShown = mb.id === shown.id; return { id: String(mb.id), state: away ? "out" : "housed", shown: isShown, picture: away ? "" : mibiReq(req, st, mb, [48, 48], settings), well: well(`plate-well-${tw}x48${isShown ? "-shown" : ""}`) }; });
  while (tiles.length < n) tiles.push({ id: "", state: "free", shown: false, picture: "", well: "" });
  regions.strip = { plate: n ? plate(992, 64) : "" };
  regions.tiles = { glyph: frame.regions.marks.companion.away, items: tiles };

  // the focus: every target of the state in the graph's groups; the plate a chapter still to read is enabled, the door and the modules as their rules say
  const unread = (p) => p.state === "unread", cost = (p) => S.mibiReadCost(st, shown, p.id, settings);
  const dKind = pend.find((r) => r.id === shown.id)?.op ?? (proj.includes(shown.id) ? "bring" : proj.length >= 3 ? "full" : "take");
  const sitting = pst === "held" && !(!docked && carried.includes(shown.id)) && habitsOf(shown).length && placesOf(shown).length;
  const look = pst === "portrayed" && portraitOffered(shown) && doorOpen("sitting") && !S.isAway(st, sv, shown) && !!sittingSpec?.strings?.lookPortrait;   // portrayed and its picture held: ✓ opens the sitting's state portrait
  const targets = [];
  if (state !== "out") targets.push({ id: "resident", group: "resident", enabled: true });
  if (state !== "meet") targets.push({ id: "name", group: "name", enabled: true });
  targets.push({ id: "species", group: "species", enabled: true });   // ✓ Open the guide: the Library's Level 1 on this species
  targets.push({ id: "family", group: "family", enabled: true, lines: from.of && from.of.length === 2 ? 2 : 1 });   // ✓ See the family: Level 3, close on this mibi; its box is the story's origin lines (the face measures them)
  plates.forEach((p, i) => targets.push({ id: "plate." + i, group: "plate", enabled: unread(p) }));
  targets.push({ id: "door", group: "top", enabled: dKind === "take" || dKind === "bring" });
  targets.push({ id: "portrait", group: "top", enabled: (!!sitting && doorOpen("sitting")) || look });
  targets.push({ id: "cross", group: "low", enabled: crossState === "adult" && doorOpen("cross") });
  targets.push({ id: "wild", group: "low", enabled: !wildBlock });
  for (const t of tiles) if (t.state !== "free") targets.push({ id: "tile." + t.id, group: "tile", enabled: true });
  const has = (id) => targets.some((t) => t.id === id), cur = m.focus && has(m.focus) ? m.focus : out ? "name" : "resident";
  const focus = { cur, targets, resolve: { "tile.shown": "tile." + sid } };

  // the bottom line (habitat.json bottomLine): the action and the context of the focused target; ← Vivarium
  const a = S.aAn(stageWord).split(" ")[0], words = { a, stage: stageWord, species }, contextOf = shown.bonded ? fill(Sg.residentContextBonded, words) : fill(Sg.residentContext, words);
  const named = { name: shown.name };
  const painting = waiting ? (m.offline ? Sg.offline : Sg.painting) : null;
  let line = { ok: null, subject: "", back: Sg.back, need: null };
  const id = cur.startsWith("tile.") ? "resident" : cur;
  if (id === "resident") line = { ok: meet ? fill(Sg.name, named) : fill(Sg.greet, named), subject: painting ?? contextOf, back: Sg.back, need: null };
  else if (id === "name") line = { ok: fill(Sg.rename, named), subject: out ? Sg.out : painting ?? contextOf, back: Sg.back, need: null };
  else if (id === "species") line = { ok: Sg.guide, subject: fill(Sg.every, { Species: species }), back: Sg.back, need: null };
  else if (id === "family") line = { ok: Sg.family, subject: "", back: Sg.back, need: null };
  else if (id.startsWith("plate.")) {
    const p = plates[+id.slice(6)], ch = fr.chapters[+id.slice(6)], Chapter = ch.name;
    if (p.state === "read") line = { ok: null, subject: fill(Sg.plateRead, { Chapter }), back: Sg.back, need: null };
    else if (p.state === "sealed") line = { ok: null, subject: fill(Sg.plateSealed, { Chapter }), back: Sg.back, need: null };
    else { const c = cost(p), short = c > st.d ? S.shortIcons(st, 0, c, 0) : ""; line = { ok: fill(Sg.read, { Chapter }), price: c ? "◆ " + c : "", ...(short ? { dim: true, short } : {}), subject: fill(Sg.plateUnread, { Chapter }), back: Sg.back, need: !short && c && frame ? warnWords(st, m.sv, settings, frame, { d: c }, { key: "read", mibi: shown }) : null }; }
  } else if (id === "door") {
    const now = docked;
    line = dKind === "take" ? { ok: fill(Sg.take, named), subject: now ? Sg.takeNow : Sg.takeNext }
      : dKind === "bring" ? { ok: fill(Sg.bring, named), subject: now ? Sg.bringNow : Sg.bringNext }
      : dKind === "add" ? { ok: null, subject: now ? Sg.takeNow : Sg.takeNext }
      : dKind === "home" ? { ok: null, subject: Sg.bringNext }
      : { ok: null, subject: Sg.full };
    line = { ...line, back: Sg.back, need: null };
  } else if (id === "portrait") {
    const why = pst === "none" ? Sg.noSitting : pst === "painting" ? Sg.portraitOnWay : pst === "portrayed" ? Sg.portrayed : !docked && carried.includes(shown.id) ? Sg.portraitOut : !habitsOf(shown).length ? Sg.noPose : !placesOf(shown).length ? Sg.noPlace : !doorOpen("sitting") ? Sg.shut.portrait : null;
    line = look ? { ok: sittingSpec.strings.lookPortrait, subject: Sg.portrayed, back: Sg.back, need: null }   // bottomLine.portrait.portrayed: ✓ strings.lookPortrait only while the picture is held
      : why ? { ok: null, subject: why, back: Sg.back, need: null } : { ok: fill(Sg.portray, named), subject: Sg.portrayContext, back: Sg.back, need: null };
  } else if (id === "cross") {
    line = crossState === "adult" && !doorOpen("cross") ? { ok: null, subject: Sg.shut.cross }
      : crossState === "adult" ? { ok: fill(Sg.cross, named), subject: fill(Sg.partners, { "n in words": spell(Math.min(pickable.length, 11)), Species: species }) }
      : { ok: null, subject: crossState === "out" ? Sg.crossOut : crossState === "away" ? Sg.crossAway : crossState === "alone" ? fill(Sg.noPartner, { Species: species }) : Sg.crossLater };
    line = { ...line, back: Sg.back, need: null };
  } else if (id === "wild") {
    const price = S.gainText(S.PRICE.wildMibi), key = { "a bonded mibi stays": "bonded", "not until it is adult": "young", "already with you": "withYou", "goes at the next dock": "waiting" }[wildBlock];
    line = wildBlock ? { ok: null, subject: Sg.wildBlocks[key] ?? wildBlock }
      : { ok: fill(Sg.wild, named), price, subject: Sg.wildContext };
    line = { ...line, back: Sg.back, need: null };
  }
  return { props: { state, regions, focus }, line, requests, shown };
}

// The sitting as props (sitting.json; the props names of the architect's ARCH-2): pure selectors from the state, the sitting's UI memory and the presentation to the props of the face's Sitting screen. Props name *what*, never *where*:
// ids, strings, states and the focus targets by id; no rectangle, no measure, no layout rule, no colour (the face places everything from sitting.json). The output is plain JSON:
// { props (state, regions, focus), line (the bottom line, for the frame), requests (the pictures the host makes ready before the props) }, or null when there is nothing to show (no such mibi; state portrait while its picture is not held).
// Runs in Node, tested there (tests/sitting-props.test.mjs); the shape is sitting.props.json. The window's from-ids are not props: the host passes them in the dither event.
//   m: { st, sv, settings, light (the hour's), mibiId (the mibi sitting), ui: { step: "pose"|"place"|"confirm"|"begin"|"portrait", pose (the habit chosen), place (the place chosen), focus ("card.<i>" or "room"), armed ("room" or null) } }
// Every mibi picture is mibiReq with poseFor's pose: the card 96 (view default, day), the thumb 48 (view default, day) and the window 304 × 312 (view habitat; the hour's light on the pose step, day after). A habit with no signed key
// is poseFor's owed anchor: its requests carry `owed`, and a scene showing one is never a golden.
import * as S from "../state.mjs";
import { frameFor } from "../state.mjs";
import { stampSizing, genomeDigest } from "../genome.mjs";
import { kPct } from "../stamplook.mjs";
import { poseFor } from "../layered-stand.mjs";
import { offer, beginBlock } from "../sitting.mjs";
import { portraitOpening } from "../portrait-source.mjs";
import { mibiReq, figureOf } from "./home-props.mjs";
import { fill } from "./words.mjs";
import { req as reqOf, slot as slotOf, plateDevice } from "./requests.mjs";
import { nearOf } from "./room-props.mjs";

export const SITTING_STATES = ["pose", "place", "confirm", "begin", "portrait"];
const STEPS = ["pose", "place", "confirm"];
const WINDOW = [304, 312], CARD = [96, 96], THUMB = [48, 48];

// The portrait state is offered only while the portrait is delivered and its 528×392 opening is held on this device (portrait-source.mjs portraitOpening; sitting.json regions.portrait.until).
export const portraitOffered = (mb) => !!(mb && mb.portrait && mb.portrait.state === "delivered" && mb.portrait.digest && portraitOpening(mb.portrait.digest));

export function sittingBuild(m, spec, habitat) {
  const { st, settings } = m, ui = m.ui || {}, requests = [], req = reqOf(requests);
  const mb = S.mibiById(st, m.mibiId); if (!mb) return null;
  const state = SITTING_STATES.includes(ui.step) ? ui.step : "pose";
  if (state === "portrait" && !portraitOffered(mb)) return null;
  const R = spec.regions, Sg = spec.strings, slot = slotOf(req, "its master (sitting.json masters)");
  const stage = S.mibiStage(st, mb, settings), species = S.speciesOf(mb), sid = String(mb.id), named = { name: mb.name };
  const portrayed = state === "portrait";
  const o = offer(st, mb, m.sv), poses = o.poses, places = o.places;
  const chosenPose = portrayed ? mb.portrait.pose : ui.pose ?? null, chosenPlace = portrayed ? mb.portrait.place : ui.place ?? null;
  const well = (name) => slot(name, name.match(/(\d+)x(\d+)/).slice(1).map(Number), "the device well (fix 2: placed 1:1)");
  const pose = (habit) => poseFor(species, stage, habit);
  const card = (habit) => mibiReq(req, st, mb, CARD, settings, "day", "default", pose(habit));
  const thumb = (habit) => mibiReq(req, st, mb, THUMB, settings, "day", "default", pose(habit));
  const placeCard = (g) => slot(`place-${g}-96x96`, CARD), placeThumb = (g) => slot(`place-${g}-48x48`, THUMB);
  const backdrop = (g) => slot(`sitting-backdrop-${g}-${habitat.light.size.join("x")}`, habitat.light.size);

  // the focus: the cards on the pose and place steps (the card chosen before in this visit, else card.0); the room on the others
  const items = state === "pose" ? poses : state === "place" ? places : [];
  const before = state === "pose" ? poses.indexOf(chosenPose) : state === "place" ? places.indexOf(chosenPlace) : -1;
  const targets = items.map((_, i) => ({ id: "card." + i, group: "card", enabled: true }));
  const cur = items.length ? (targets.some((t) => t.id === ui.focus) ? ui.focus : "card." + Math.max(0, before)) : "room";
  const focused = items.length ? items[+cur.slice(5)] : null;
  // a Lift mid-ceremony (the mibi carried while the Companion is away): the choices are kept, the confirm step reads habitat.json strings.portraitOut and never lights, ✓ does nothing, until the Dock
  const out = state === "confirm" && !!chosenPose && !!chosenPlace && beginBlock(st, mb, chosenPose, chosenPlace, m.sv) === habitat.strings.portraitOut;
  const armed = state === "confirm" && !out && ui.armed === "room" ? "room" : null;

  const regions = {};
  regions.stage = { room: [slot("room-vivarium-stage-habitat", R.stage.rect.slice(2), "the up-close stage master")] };
  // the glass: Habitat's own in the hour's light on the pose step; the focused or chosen place's backdrop in its day light after
  regions.glass = { picture: state === "pose" ? nearOf(req, mb.room ?? st.face?.room ?? 0, m.light) : backdrop(state === "place" ? focused : chosenPlace) };
  if (state === "place") for (const g of places) if (g !== focused) backdrop(g);   // regions.glass.load: every place card's backdrop on the place step (at most five), so a ring move never waits on a load; the host drops them with the screen
  // the resident: the focused card's habit (pose) or the chosen pose (place, confirm, begin) at the Habitat factor; the hour's light on the pose step, ungraded after; a slot in state portrait
  const habit = state === "pose" ? focused : chosenPose;
  if (portrayed) regions.resident = { id: sid, name: mb.name, stage, picture: "", figure: null, pose: chosenPose };
  else {
    const p = habit ? pose(habit) : "anchor", light = state === "pose" ? m.light : "day";
    regions.resident = { id: sid, name: mb.name, stage, picture: mibiReq(req, st, mb, WINDOW, settings, light, "habitat", p), figure: figureOf(st, mb, WINDOW, settings, "habitat", p), pose: habit ?? null };
  }
  regions.nameTag = { text: portrayed ? "" : mb.name };
  regions.portrait = { picture: portrayed ? req({ kind: "portrait", id: `portrait:${String(mb.portrait.digest).slice(0, 16)}:528x392`, digest: mb.portrait.digest, size: [528, 392] }) : "" };
  const G = R.gilt.slices;
  regions.gilt = { picture: state === "confirm" ? slot(armed ? G.armed : G.rest, R.gilt.rect.slice(2)) : state === "begin" ? slot(G.armed, R.gilt.rect.slice(2)) : portrayed ? slot(G.rest, R.gilt.rect.slice(2)) : "" };
  regions.deck = { plate: req(plateDevice(R.deck.rect[2], R.deck.rect[3])) };
  regions.heading = { text: fill(Sg.heading[state === "begin" ? "confirm" : state], named) };
  regions.cards = { items: state === "pose" ? poses.map((h) => ({ picture: card(h), well: well(R.cards.well), pose: h })) : state === "place" ? places.map((g) => ({ picture: placeCard(g), well: well(R.cards.well), place: g })) : [] };
  regions.chosen = { items: ["confirm", "begin", "portrait"].includes(state) ? [{ picture: card(chosenPose), well: well(R.chosen.well) }, { picture: placeCard(chosenPlace), well: well(R.chosen.well) }] : [] };
  // the stamp: Habitat's label, the same picture, size and look; the portrayed corner always (state portrait only)
  if (portrayed) {
    const fr = frameFor(mb), sz = stampSizing(fr, mb.genome), read = fr.chapters.filter((c) => (mb.read || []).includes(c.id)).map((c) => c.id), k = habitat.colours.stampLabel.k;
    regions.stamp = { size: sz.size, N: sz.N, cell: sz.cell, plate: slot(R.stamp.plate, [120, 120], "the label's well (Habitat GB2)"), asset: req({ kind: "stamp", id: `stamp:${genomeDigest(mb.genome)}:${[...read].sort().join(",")}:${sz.size}:k${kPct(k)}`, mibi: mb.id, species, read, size: sz.size, k }), corner: slot(R.stamp.portrayed.slice, R.stamp.portrayed.rect.slice(2)) };
  } else regions.stamp = { size: 0, N: 0, cell: 0, plate: "", asset: "", corner: "" };
  regions.strip = { plate: req(plateDevice(R.strip.rect[2], R.strip.rect[3])) };
  // the steps: current, done (with the chosen picture at 48) or ahead; in state portrait all done, Portray's thumb the portrait at 40 × 30 in its frame
  const at = portrayed ? 3 : Math.min(STEPS.indexOf(state === "begin" ? "confirm" : state), 2), T = R.steps.thumb.portrait;
  regions.steps = { items: STEPS.map((k, i) => {
    const s = i < at ? "done" : i === at ? "current" : "ahead", done = s === "done";
    const picture = !done ? null : i === 0 ? thumb(chosenPose) : i === 1 ? placeThumb(chosenPlace) : req({ kind: "portrait", id: `portrait:${String(mb.portrait.digest).slice(0, 16)}:${T.picture.size.join("x")}`, digest: mb.portrait.digest, size: T.picture.size });
    return { state: s, word: Sg.steps[k], picture, well: well(R.steps.wells[s]), frame: done && i === 2 ? slot(T.frame, [48, 40]) : "" };
  }) };

  // the bottom line (sitting.json bottomLine): the action and the context of the state; the ← word
  const placeWord = (g) => "the " + (S.PLACE_WORD[g] || g);
  const line = state === "pose" ? { ok: Sg.thisPose, subject: focused ? habitat.strings.watchHabits[focused] ?? focused : "", back: mb.name, need: null }
    : state === "place" ? { ok: Sg.thisPlace, subject: focused ? placeWord(focused) : "", back: Sg.steps.pose, need: null }
    : state === "confirm" && out ? { ok: null, subject: habitat.strings.portraitOut, back: Sg.steps.place, need: null }
    : state === "confirm" ? { ok: fill(armed ? Sg.portrayAgain : Sg.portray, named), subject: Sg.once, back: Sg.steps.place, need: null }
    : state === "begin" ? { ok: null, subject: "", back: null, need: null }
    : { ok: null, subject: Sg.portraitContext ?? "", back: mb.name, need: null };
  return { props: { state, regions, focus: { cur, targets, armed } }, line, requests };
}

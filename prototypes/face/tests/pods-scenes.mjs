// Pods' scenes for the face tests that need a screen to draw on (the layer table, the animation engine): the props views/pods-props.mjs gives for seeded pods of the real frames, in each state of
// the screen (the inventory, its filter tray and Find, the reading screen (a sealed pod, the rail, an unread and a read chapter open, the detail, the stamp view, a sealed chapter)), with the frame's props and the pictures each asks for
// at the size its request names. A case is { state, name, props, pictures: [{ id, w, h }] }, the shape of tests/vectors/pods-words.json's cases.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { setFrames, frameOf, podGenome } from "../../station/src/genome.mjs";
import * as S from "../../station/src/state.mjs";
import { podsProps } from "../../station/src/views/pods-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), specs = path.resolve(here, "../../ui/specs/station"), framesDir = path.resolve(here, "../../workbench/frames");
const J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), podsSpec = J("pods"), frameSpec = J("frame");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided" };

// the masters' own sizes; any other request is its size (a crop, a slot), an emblem 24, a star 12, else 16
const SIZE = { "cabinet-strip-672x228": [672, 228], "pod-niche-88x88": [88, 88], "pod-niche-shadow-88x88": [88, 88], "pod-niche-husk-88x88": [88, 88], "pods-lantern-96x160": [96, 160], "pods-fern-120x200": [120, 200], "reading-bench-1024x520": [1024, 520] };
export const sizeOf = (r) => SIZE[r.id] ?? (r.kind === "readchamber" ? [548, 356] : r.kind === "readrail" ? (r.small ? [272, 40] : [526, 71]) : r.kind === "readdisc" ? [r.d + 8, r.d + 8] : r.kind === "emblem" ? [24, 24] : r.kind === "star" ? [12, 12] : Array.isArray(r.size) ? r.size : r.size ? [r.size, r.size] : [16, 16]);
// the frame's own pictures: the material icons and the companion
const FRAME_PICTURES = [...["energy", "data", "essence"].map((id) => ({ id: `icon:${id}:16`, w: 16, h: 16 })), ...["frame-companion-outline-16x24", "frame-companion-solid-16x24"].map((id) => ({ id, w: 16, h: 24 }))];

// a tray of seeded pods: [species, seed, identified, chapters read]
export function tray(pods) {
  const st = S.freshSt("w1", 1, 1000); S.normalize(st); st.e = 20; st.d = 40; st.s = 20; st.readEver = true;
  for (const [sp, gs, idd, n] of pods) { const p = S.seedPodFromGenome(st, podGenome(frameOf(sp), gs), settings, 1000).pod; if (idd) S.skipIdentify(st, p); frameOf(sp).chapters.filter((c) => !c.sealed).slice(0, n).forEach((c) => S.read(st, p, c.id, settings)); }
  return st;
}
export function scene(state, name, st, ui, focus) {
  const b = podsProps({ st, settings, docked: true, crates: 0, now: 5000, focus, ui: { view: "inventory", sort: "use", chips: [], word: null, first: 0, ...ui } }, podsSpec, frameSpec);
  const frame = { top: { screen: "pods", title: "Pods", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null } }, line: { back: "Home", need: "", ...b.line }, plate: { text: "" } };
  const seen = new Set(), pictures = [];
  for (const p of [...b.requests.map((r) => { const [w, h] = sizeOf(r); return { id: r.id, w, h }; }), ...FRAME_PICTURES]) if (!seen.has(p.id)) { seen.add(p.id); pictures.push(p); }
  return { state, name, props: { screen: "pods", ...b.props, motion: true, frame }, pictures };
}
export function podsCases() {
  const out = [], TWELVE = [["S01", 11, 1, 2], ["S01", 12, 1, 0], ["S02", 13, 1, 1], ["S01", 14, 0, 0], ["S03", 15, 1, 8], ["S02", 16, 1, 0], ["S04", 17, 1, 0], ["S01", 18, 1, 4], ["S02", 19, 0, 0], ["S03", 20, 1, 0], ["S04", 21, 1, 2], ["S01", 22, 1, 1]];
  out.push(scene("inventory", "no pods", tray([]), {}, "sort"));
  { const st = tray(TWELVE); out.push(scene("inventory", "twelve pods, the ring on the first card", st, {}, "card.0")); out.push(scene("inventory", "the panel's first button", st, {}, "act.0"));
    out.push(scene("filter", "the filter tray", st, { view: "filter", chips: ["S02"] }, "tchip.2.1")); out.push(scene("find", "Find", st, { view: "find", find: { letter: "L" } }, "word.0")); }
  { const st = tray([["S01", 51, 0, 0], ["S01", 52, 1, 0]]); S.putOnBench(st, st.tray[0]); out.push(scene("read", "a sealed pod", st, { view: "room" }, "key")); }
  { const st = tray([["S01", 61, 1, 1], ["S01", 62, 1, 0]]); S.putOnBench(st, st.tray[0]); out.push(scene("read", "the rail", st, { view: "room", lane: 1 }, "rail")); out.push(scene("read", "an unread chapter open", st, { view: "room", lane: 1, at: "right" }, "key"));
    out.push(scene("read", "a read chapter open", st, { view: "room", lane: 0, at: "right" }, "plate.0")); out.push(scene("read", "the read", st, { view: "room", lane: 0, at: "right", reading: { pod: st.tray[0].id, chapter: "coat", read: [], reward: 0, cost: 2 } }, "hold")); out.push(scene("read", "the detail", st, { view: "room", lane: 0, at: "detail", trait: 0 }, "trait")); st.stampTaught = true; out.push(scene("read", "the stamp view", st, { view: "room", lane: 0, at: "stamp" }, "stamp")); }
  { const st = tray([["S02", 71, 1, 3], ["S02", 72, 1, 0]]); S.putOnBench(st, st.tray[0]); out.push(scene("read", "a sealed chapter", st, { view: "room", lane: 3 }, "rail")); }
  return out;
}

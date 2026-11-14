// L4b (B1): in a crowded room the focused mibi's name label stands UNDER its figure (shifted sideways along the ground line when a neighbour is there), never above its head while a clear place under or beside it exists, and never over a face (any figure's upper half).
//   node --test prototypes/face/tests/tag-under.test.mjs
import { test } from "node:test";
import "../../station/tests/fixtures/rooms.mjs";   // the rooms spec for the props builders, as the page registers it
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { setFrames } from "../../station/src/genome.mjs";
import * as S from "../../station/src/state.mjs";
import { vivariumBuild } from "../../station/src/views/vivarium-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), spec = J("vivarium"), homeSpec = J("home");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
setFrames(readdirSync(path.resolve(here, "../../workbench/frames/language")).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(path.resolve(here, "../../workbench/frames/language"), f), "utf8"))));
const T0 = 1_000_000, WIN = spec.regions.window.rect;

function scene(o) {
  const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", rooms: 1 }, st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; st.dock = { docked: true, at: T0 }; st.rooms = 1;
  st.face.room = 0; S.seedAdults(st, "S01", 5, o.adults, settings);
  for (const m of st.mibis) m.paint = { state: "landed" };
  const sv = { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], carried: [], tier: 1, shield: 3 };
  const b = vivariumBuild({ st, sv, settings, docked: true, light: "day", focus: "resident." + st.mibis[o.focus].id, seen: null, last: null, motionSets: false }, spec, frameSpec, homeSpec, J("pods"));
  return { ...b, st, settings };
}
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function standIn(id, size) { const [w, h] = size, d = new Uint8ClampedArray(w * h * 4), k = hash(id); for (let i = 0; i < w * h; i++) { d[i * 4] = 70 + (k & 127); d[i * 4 + 1] = 70 + ((k >> 7) & 127); d[i * 4 + 2] = 70 + ((k >> 14) & 127); d[i * 4 + 3] = 255; } return { w, h, data: d }; }
const sizeOf = (r) => r.size ?? r.base?.size ?? [16, 16];
const frameProps = (line = {}) => ({ top: { screen: "vivarium", title: "Vivarium", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null } }, line: { back: "Home", need: "", ...line }, plate: { text: "" } });
async function start(b) {
  const f = await bootFace(pathToFileURL(dist + "/node/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["vivarium", spec], ["rooms", J("rooms")]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0);
  for (const px of [14, 15, 16]) for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:${px}`, withPolicy((i) => standIn(i, [px, px])));
  for (const id of ["frame-companion-outline-16x24", "frame-companion-solid-16x24", "home-lamp-sky-12x12", "home-lamp-hairline-12x12", "home-lamp-sprout-12x12", "home-lamp-amber-12x12"]) f.handleOf(id, withPolicy((i) => standIn(i, id.includes("16x24") ? [16, 24] : [12, 12])));
  for (const r of b.requests) f.handleOf(r.id, withPolicy((i) => standIn(i, sizeOf(r))));
  f.t = 0; f.motion = false; f.build = b;
  assert.equal(f.props({ screen: "vivarium", ...b.props, motion: false, frame: frameProps(b.line) }), 0, f.errors().join("; "));
  for (let i = 0; i < 2; i++) f.frame((f.t += 16));
  return f;
}
const logOf = (f) => { let lg = null; for (let m; (m = f.poll("log"));) lg = m; return lg ?? f.lastLog; };
const FIG = [31, 68, 33, 28];   // the figure's box inside its picture, as the vivarium tests give it
const hit = (a, b) => { const w = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]), h = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]); return w > 0 && h > 0 ? w * h : 0; };

test("a crowded room (eight adults, each focused in turn, 12 seeds): the label is under its own figure's top half or beside it, never on a face, and above a head only when it could not be elsewhere", { skip }, async () => {
  let n = 0, above = 0;
  for (let seed = 1; seed <= 12; seed++) for (let focus = 0; focus < 8; focus++) {
    const b = scene({ adults: 8, focus }); for (const [i, r] of b.props.regions.residents.entries()) { r.figure = FIG; r.seed = seed * 7919 + i * 104729; }
    const f = await start(b), lg = logOf(f), tag = lg.regions.find((r) => r.id === "nameTag" && r.layer === "chrome")?.rect;
    assert.ok(tag, `seed ${seed} focus ${focus}: a tag is drawn`);
    const faces = b.st.mibis.map((m) => { const nb = f.nodeBox("g." + m.id)?.box; if (!nb) return null; const r = [nb[0] + WIN[0] + FIG[0], nb[1] + WIN[1] + FIG[1], FIG[2], FIG[3]]; return [r[0] + Math.floor(r[2] / 8), r[1], r[2] - Math.floor(r[2] / 4), Math.floor(r[3] / 2)]; }).filter(Boolean);
    faces.forEach((fc, i) => assert.equal(hit(tag, fc), 0, `seed ${seed} focus ${focus}: the tag ${tag} lies on figure ${i}'s face ${fc}`));
    const own = f.nodeBox("g." + b.st.mibis[focus].id)?.box, feetY = own[1] + WIN[1] + FIG[1] + FIG[3] - 1;
    if (tag[1] + tag[3] <= feetY - FIG[3]) above++;
    const off = Math.abs(tag[0] + tag[2] / 2 - (own[0] + WIN[0] + FIG[0] + FIG[2] / 2));   // L4b2: a label reads as its own mibi's: its centre is within half a figure width of the figure's centre
    const fx = own[0] + WIN[0] + FIG[0];
    if (fx >= WIN[0] + 56 && fx + FIG[2] <= WIN[0] + WIN[2] - 56) assert.ok(off <= FIG[2] / 2 + 1,`seed ${seed} focus ${focus}: the tag ${tag} is detached from its figure (centre ${off} px off, more than half the ${FIG[2]} px figure)`);
    n++;
  }
  assert.ok(above * 4 <= n, `a label goes above a head only as the last resort (it was ${above} of ${n}: a place under or beside the figure that lies on a face, or the window's foot)`);
});

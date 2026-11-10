// The steps for the stills (tools/light-stills.py): for each room the pair, share and gain the Station derives at the four lights, @L50 (warm sun) and @L65 (the cloud), plus the residents' gain at the hours of the Vivarium stills.
// node light-stills-steps.mjs > steps.json
import { readFileSync } from "node:fs";
import { lightOf } from "../src/light-curve.mjs";
import { useCurve, gainOfKey } from "../src/light-grade.mjs";
import { stepMix } from "../src/room-steps.mjs";
const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const C = read("../../ui/specs/station/frame.json").light.curve, ROOMS = read("../../ui/specs/station/rooms.json");
useCurve(C);
const at = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return lightOf((h * 60 + m) * 60, C); };
const rooms = {};
for (const room of ROOMS.order) {
  rooms[room] = { dawn: { a: "dawn", b: "dawn", w: 0, gain: [1, 1, 1] }, day: { a: "day", b: "day", w: 0, gain: [1, 1, 1] }, dusk: { a: "dusk", b: "dusk", w: 0, gain: [1, 1, 1] }, night: { a: "night", b: "night", w: 0, gain: [1, 1, 1] } };
  for (const [name, t] of [["@L50", "09:50"], ["@L65", "10:05"]]) rooms[room][name] = stepMix(at(t).key, room, ROOMS);
}
const hours = {};
for (const t of ["03:00", "07:00", "09:50", "10:05", "10:35", "13:35", "17:15", "19:30"]) { const L = at(t); hours[t] = { key: L.key, mood: L.mood, resident: gainOfKey(L.key) ?? [1, 1, 1], rooms: Object.fromEntries(ROOMS.order.map((r) => [r, stepMix(L.key, r, ROOMS) ?? { a: L.base, b: L.base, w: 0, gain: L.gain }])) }; }
console.log(JSON.stringify({ rooms, hours, duskFallback: Object.fromEntries(ROOMS.order.filter((r) => ROOMS.rooms[r].duskFallback).map((r) => [r, ROOMS.rooms[r].duskFallback])) }));

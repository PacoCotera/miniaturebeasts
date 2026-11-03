// The full map of a generator 4 world cuts every outward water corner (both side neighbours land) as a 7 px quarter disc of the ground
// across it, with the 2 px foam along the arc. Drawing only: the pixels differ from the uncut bake inside those corners and nowhere else.
import test from "node:test";
import assert from "node:assert/strict";
import * as W from "../src/world.mjs";
import { makePage, PAGE } from "./page-harness.mjs";

const { MW, MH, L } = W, CELL = 26;
const p = makePage({ console: "silent", canvas: true });
const bake = (seed, biome, gen) => { p.run(`newWorld(${seed}, 4); G = genWorld(${seed}, 4, '${biome}'); G.gen = ${gen};`); return Int16Array.from(p.run("buildMapPB()").p); };

test("the edge-mark cache key carries the Fells flag in the one expression (a stray semicolon once cut it off)", () => {
  const line = PAGE.split("\n").find(l => l.includes("const key = 'em' + cs"));
  assert.ok(line, "the key line"); assert.ok(/const key = [^;]*\(heavy \? ':F' : ''\);/.test(line), line);
});

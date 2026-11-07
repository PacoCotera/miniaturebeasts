// The paws' beans and domes in three.js through the rest pose and the walk clip: node toes-three.mjs viewer.html -> JSON on stdout
// per pose (rest, walk at 8 phases): per paw bone the delta matrix (bone world x inverse bind, column-major), the beans' three centres and the dome's centroid (weight > 0.9 on the paw bone), all in the glb's frame.
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ??= "/home/mb/pw156/browsers";
const require = createRequire("/home/mb/pw156/package.json");
const { chromium } = require("playwright");
const b = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const pg = await b.newPage({ viewport: { width: 320, height: 320 } });
await pg.goto(pathToFileURL(path.resolve(process.argv[2])).href + "#shot");
await pg.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
const out = await pg.evaluate(() => {
  const sc = window.__scene; let beans, body;
  sc.traverse((o) => { if (o.isSkinnedMesh && o.name === "beans") beans = o; if (o.isSkinnedMesh && o.name.startsWith("loika")) body = o; });
  
  const paws = ["fore_paw.L", "fore_paw.R", "hind_paw.L", "hind_paw.R"];
  const nb = beans.geometry.attributes.position.count / 12;
  const pos = (m, i) => { const v = new beans.position.constructor(); m.getVertexPosition(i, v); return v.applyMatrix4(m.matrixWorld).toArray(); };
  const dome = {};
  for (const p of paws) {
    const bi = body.skeleton.bones.findIndex((x) => x.name === p.replace(".", "")), idx = [];
    const si = body.geometry.attributes.skinIndex, sw = body.geometry.attributes.skinWeight;
    for (let i = 0; i < si.count; i++) { let w = 0; for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === bi) w += sw.getComponent(i, k); if (w > 0.9) idx.push(i); }
    dome[p] = idx;
  }
  const snap = () => {
    const res = {};
    paws.forEach((p, pi) => {
      const bone = body.skeleton.bones.findIndex((x) => x.name === p.replace(".", "")), M = body.skeleton.bones[bone].matrixWorld.clone().multiply(body.skeleton.boneInverses[bone]);
      const cen = [0, 1, 2].map((t) => { const s = [0, 0, 0]; for (let i = 0; i < nb; i++) { const q = pos(beans, (3 * pi + t) * nb + i); for (let k = 0; k < 3; k++) s[k] += q[k] / nb; } return s; });
      const dc = [0, 0, 0]; for (const i of dome[p]) { const q = pos(body, i); for (let k = 0; k < 3; k++) dc[k] += q[k] / dome[p].length; }
      res[p] = { D: M.toArray(), beans: cen, dome: dc, ndome: dome[p].length, beanBone: beans.skeleton.bones[beans.geometry.attributes.skinIndex.getComponent(3 * pi * nb, 0)].name };
    });
    return res;
  };
  const poses = [];
  window.__pose("stand", 0); poses.push({ name: "rest", paws: snap() });
  for (let k = 0; k < 8; k++) { window.__pose("walk", k / 8 * 1.0); poses.push({ name: "walk" + k, paws: snap() }); }
  return poses;
});
console.log(JSON.stringify(out));
await b.close();

// The AD's lower-face numbers (foundation/lowerface.mjs lowerNumbers) read off sprites, in the master's frame: node lowernum.mjs PNG [PNG ...]  (read only; the first is the master when no PNG is given)
import { loadImage } from "../../foundation/imgtools.mjs";
import { irisCentres } from "../../foundation/headcontract.mjs";
import { lowerNumbers } from "../../foundation/lowerface.mjs";
import { MASTER } from "../../foundation/paths.mjs";
const M = loadImage(MASTER("S01", 304)), mI = irisCentres(M), m = lowerNumbers(M);
const f = (v) => (v === null || v === undefined ? "-" : Math.round(v));
const show = (name, n) => console.log(name.padEnd(28), `front@178/194/210 ${f(n.front(178))}/${f(n.front(194))}/${f(n.front(210))} (29/48/59)  tip ${f(n.tip)} row ${f(n.forwardRow)} (20, 155-165)  ring ${f(n.ring)}  leg ${n.leg.map(f)} (52,46,44)  bib218/250 ${f(n.bib218)}/${f(n.bib250)} (65/85)  edge100/110 ${f(n.edge100)}/${f(n.edge110)} (180/186)  area ${n.area} (${m.area})  under ${n.under}  rms ${Math.sqrt(n.rows.reduce((a, y) => a + (n.front(y) - m.front(y)) ** 2, 0) / n.rows.length).toFixed(1)}`);
show("master", m);
for (const p of process.argv.slice(2)) show(p.split("/").slice(-3).join("/"), lowerNumbers(loadImage(p), mI));

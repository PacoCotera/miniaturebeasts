// The head sheet (fix round 6): the master's head and the build's head side by side at 304 and 96, and the build's head square to the camera, front and side, with the AD's
// screen numbers read off the master and the build the same way (headcontract.mjs). There is no front or side master, only the three-quarter view, so those two cells are the build's alone.
import { express } from "./express.mjs";
import { buildScene } from "./scene.mjs";
import { renderCreature, coarse } from "./render.mjs";
import { makeTile, masterOf } from "./sheets.mjs";
import { sheet } from "./page.mjs";
import { crop, loadImage } from "./imgtools.mjs";
import { MASTER } from "./paths.mjs";
import { frameMeasures, screenMeasures, irisCentres, headSilhouette, contractFromOutline, projector, arcMeasures, rearStep } from "./headcontract.mjs";

const f1 = (v, d = 1) => (v === null || v === undefined || Number.isNaN(v) ? "-" : Number(v).toFixed(d));
const masterBox = (img) => { let t = Infinity, b = -Infinity; for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (img.data[(y * img.width + x) * 4 + 3] >= 128) { t = Math.min(t, y); b = Math.max(b, y); } return { height: b - t }; };
// the head's screen box in a render, with a margin, clipped to the picture
function headCrop(img, sil, margin) {
  const xs = sil.left.map((v, y) => (v === null ? null : y)).filter((v) => v !== null), top = Math.min(...sil.top.filter((v) => v !== null)), bot = Math.max(...sil.bottom.filter((v) => v !== null));
  const l = Math.min(...sil.left.filter((v) => v !== null)), r = Math.max(...sil.right.filter((v) => v !== null)), x0 = Math.max(0, Math.floor(l - margin)), y0 = Math.max(0, Math.floor(top - margin * 2.2));
  return crop(img, x0, y0, Math.min(img.width - x0, Math.ceil(r - l + 2 * margin)), Math.min(img.height - y0, Math.ceil(bot - top + margin * 2.2 + margin)));
}
// the build's head square to the camera: the head and the body aligned (no head yaw, no roll), seen from the front (camera yaw 0) or from its left side (yaw -90)
function squareView(house, spec, ex, camYaw) {
  const pose = { ...ex.pose, headYawSigned: 0, rollSigned: 0, yawBody: 0 }, scene = buildScene(house, { plan: spec.plan, kinds: spec.kinds, fp: ex.fp, body: ex.body, pose });
  const camera = { yaw: camYaw, pitch: house.solver.camera["pitch-deg"] }, extents = coarse(scene, camera, { n: 240 }), ref = masterBox(loadImage(MASTER(spec.id, 304))), out = {};
  for (const s of [304, 96]) { const img = renderCreature(scene, camera, s, { ref, look: spec.look, extents }); out[s] = { img, sil: headSilhouette(scene, projector(scene, camera, s, ref, extents), { W: img.width, H: img.height, step: s === 304 ? 0.025 : 0.02 }) }; }
  return out;
}

export function headSheet(house, spec) {
  const t = makeTile(house, spec, { label: "x", sizes: [304, 96, 48] }), m = masterOf(spec.id), ref = masterBox(m[304]), sc = t.ex.scene;
  // the build's head silhouette (from its field) at 304 and 96, for the crops and the contract
  const ext = coarse(sc, t.camera, { n: 240 }), sil304 = headSilhouette(sc, projector(sc, t.camera, 304, ref, ext), { step: 0.012 }), sil96 = headSilhouette(sc, projector(sc, t.camera, 96, ref, ext), { W: 96, H: 88, step: 0.02 });
  const geo = contractFromOutline(sil304), fm = frameMeasures(sc.head), S = screenMeasures(t.r[304]), M = screenMeasures(m[304]), Ib = irisCentres(t.r[304]), Im = irisCentres(m[304]);
  // fix round 7: the two sets of eyes are the landmark the pictures are laid over (the front outline and the rear are read in the master's frame with the eye mid-points aligned; the raw columns differ by the body's length)
  const eyeShift = Math.round(((Im.far.x + Im.near.x) - (Ib.far.x + Ib.near.x)) / 2), gapPx = (I) => Math.hypot(I.near.x - I.far.x, I.near.y - I.far.y);
  const arc = arcMeasures(sil304.top), stepM = rearStep(M.top), stepB = rearStep(S.top.map((v, x, a) => a[x - eyeShift] ?? null).map((v) => v)), proj0 = projector(sc, t.camera, 304, ref, ext), axis = [proj0([0, 0, 0.5]), proj0([0, 0, -0.5])], headPx = Math.hypot(axis[0][0] - axis[1][0], axis[0][1] - axis[1][1]);
  const shift = M.forward.x - S.forward.x, edgeErr = [100, 110, 120, 130, 140, 150, 160, 170, 180, 190].map((y) => (S.leftEdge[y] ?? 0) + eyeShift - (M.leftEdge[y] ?? 0)), worst = Math.max(...edgeErr.map(Math.abs)), rms = Math.sqrt(edgeErr.reduce((a, d) => a + d * d, 0) / edgeErr.length);
  const front = squareView(house, spec, t.ex, 0), side = squareView(house, spec, t.ex, -90);
  const pic = (a, b, k96 = 4) => [[{ img: a }], [{ img: b, scale: k96 }]];
  const hc304 = (img) => crop(img, 0, 60, 250, 175), hc96 = (img) => crop(img, 0, 14, 72, 52);
  const cell = (pics, lines) => ({ pics, lines });
  const dome = (geo.domeSpan / Math.max(1, S.notch.x - geo.left0));
  const cells = [
    cell(pic(hc304(m[304]), hc96(m[96])), [["Master Loika, three-quarter", "name"], ["Signed art. 304 above, 96 below at 4x", "dim"]]),
    cell(pic(hc304(t.r[304]), hc96(t.r[96])), [["Build, three-quarter", "name"], [`Head ${f1(fm.W, 2)} H wide, ${f1(fm.depth, 2)} H deep`, "dim"]]),
    cell(pic(headCrop(front[304].img, front[304].sil, 8), headCrop(front[96].img, front[96].sil, 2)), [["Build, front", "name"], [`Height over width ${f1(fm.heightOverWidth, 2)} (target 0.68 or more)`, "dim"]]),
    cell(pic(headCrop(side[304].img, side[304].sil, 8), headCrop(side[96].img, side[96].sil, 2)), [["Build, side", "name"], [`Length with the snout ${f1(fm.length, 2)} H, crown at ${f1(fm.crownShare, 2)} of the skull`, "dim"]]),
  ];
  const gM = gapPx(Im), gB = gapPx(Ib), ratio = [Im.far.n / Im.near.n, Ib.far.n / Ib.near.n], yE2 = 2 * sc.head.geometry.yE;
  const rows = [
    ["Screen numbers at 304, master then build (target in brackets)", "name"],
    [`Eye line, far side up: ${f1(Im.tiltDeg)} and ${f1(Ib.tiltDeg)} degrees (8 to 11)`, "dim"],
    [`Iris centres apart: ${f1(gM, 0)} and ${f1(gB, 0)} px (88 to 92)`, gB < 87 || gB > 93 ? "bad" : "dim"],
    [`Far eye over near eye, iris area: ${f1(ratio[0], 2)} and ${f1(ratio[1], 2)} (0.45 to 0.65)`, ratio[1] < 0.43 || ratio[1] > 0.67 ? "bad" : "dim"],
    [`Forward-most point, y: ${f1(M.forward.y, 0)} and ${f1(S.forward.y, 0)} (155 to 165)`, S.forward.y < 152 ? "bad" : "dim"],
    [`Front outline against the master, y 100 to 190, the eye mid-points aligned (${f1(Math.abs(eyeShift), 0)} px apart): ${f1(rms)} px rms, worst ${f1(worst, 0)} px (within 5)`, rms > 5 ? "bad" : "dim"],
    [`Top outline of the build, far brow to rear: longest straight run ${f1(arc.straightRun, 0)} px (under 20), sharpest turn in 6 px ${f1(arc.maxTurnDeg, 0)} degrees (under 30); the master's top is under its leaves`, arc.straightRun > 20 || arc.maxTurnDeg > 30 ? "bad" : "dim"],
    [`Rear at x 180 in the master's frame, top edge y: ${M.top[180]} and ${S.top[180 - eyeShift] ?? "-"} (108 or less); in the picture's own columns ${S.rearAt180}`, (S.top[180 - eyeShift] ?? 999) > 108 ? "bad" : "dim"],
    [`Rear fall and its step, master then build: ${f1(stepM.fallDeg, 0)} degrees to (${stepM.step.x}, ${stepM.step.y}) and ${f1(stepB.fallDeg, 0)} degrees to (${stepB.step.x}, ${stepB.step.y}) (65 degrees or more, step at x 195 to 205, y 131 plus or minus 4). The AD's own reading of the notch is by eye; the auto reading is the steepest 5 px chord and where it has eased under 20 degrees`, stepB.fallDeg < 60 ? "bad" : "dim"],
    ["Head frame, build (target)", "name"],
    [`Crown at y ${f1(geo.crown, 0)} from the field (about 80, the leaf bases); head height along its own axis ${f1(headPx, 0)} px (105 plus or minus 4)`, Math.abs(headPx - 105) > 4 ? "bad" : "dim"],
    [`Width at the eye line ${f1(fm.W, 2)} H (1.40 to 1.50), eye centres ${f1(yE2, 2)} H apart (0.98), height over width ${f1(fm.heightOverWidth, 2)} (0.68 or more), depth ${f1(fm.depth, 2)}`, fm.W < 1.4 || fm.W > 1.5 || fm.heightOverWidth < 0.68 ? "bad" : "dim"],
    [`Width 0.30 above the eye line ${f1(fm.wUp30, 2)} W (0.72 or more), 0.35 below ${f1(fm.wDown35, 2)} W`, fm.wUp30 < 0.72 ? "bad" : "dim"],
    [`Crown at ${f1(fm.crownShare, 2)} of the skull's length (0.45 to 0.55), brow ${f1(fm.brow, 2)} H outside the chord (0.06), rear-most point at z ${f1(fm.rearZ, 2)} (0 to -0.15)`, "dim"],
    [`Snout stands ${f1(fm.snout, 2)} H proud (0.16 or less), length ${f1(fm.length, 2)} H (1.25 or less)`, fm.length > 1.25 ? "bad" : "dim"],
    [`Muzzle front ${f1(fm.muzzleBelowCrown, 2)} H under the crown (0.73)`, "dim"],
  ];
  const nums = { pics: [], lines: rows.slice(0, 10) }, frame = { pics: [], lines: rows.slice(10) };
  return { spec: sheet("The head: the master beside the round head, and the build square to the camera", cells, 4, { cellW: 292, note: "There is no front or side master, only this three-quarter view, so front and side are the build's alone. The crown of the master is under its leaves; both are read the same way, with leaves left out by hue." }), numbersSpec: sheet("The head's numbers: screen contract at 304 and head frame", [nums, frame], 2, { cellW: 700 }), tile: t, numbers: { fm, geo, edgeErr, eyeShift, tilt: [Im.tiltDeg, Ib.tiltDeg], gap: [gM, gB], far: ratio, forward: [M.forward.y, S.forward.y], rear180: [M.top[180], S.top[180 - eyeShift] ?? null], arc, step: [stepM, stepB], headPx, yE2, rms } };
}

// the round head against the AD's contract as a markdown table (the calibration table's last section): what, the AD's target, the master, the build
export function contractMarkdown(numbers) {
  const n = numbers, fm = n.fm, g = (v, d = 2) => f1(v, d), L = ["", "## The round head against the AD's contract (fix round 7, ruling 0 and must-fix 1 to 5)", "", "The screen numbers are read the same way off the master's and the build's 304 pictures (leaves left out by hue), the pictures laid over each other by the mid-point of the eyes; the head-frame numbers off the build's head field. There is no front or side master.", "", "| what | AD target | master | build |", "| --- | --- | --- | --- |"];
  const row = (a, b, c, d) => L.push(`| ${a} | ${b} | ${c} | ${d} |`);
  row("eye line, degrees far side up", "8 to 11", g(n.tilt[0]), g(n.tilt[1]));
  row("iris centres apart, px", "88 to 92", g(n.gap[0], 0), g(n.gap[1], 0));
  row("far eye iris area over near eye", "0.45 to 0.65", g(n.far[0]), g(n.far[1]));
  row("forward-most point of the head, y", "155 to 165", g(n.forward[0], 0), g(n.forward[1], 0));
  row("front outline against the master, y 100 to 190, rms and worst px", "within 5", "-", `${g(n.rms, 1)} and ${g(Math.max(...n.edgeErr.map(Math.abs)), 0)}`);
  row("top outline, longest straight run px and sharpest 6 px turn in degrees", "under 20 and under 30", "under its leaves", `${g(n.arc.straightRun, 0)} and ${g(n.arc.maxTurnDeg, 0)}`);
  row("rear at x 180, top edge y, master's frame", "108 or less", n.rear180[0], n.rear180[1]);
  row("rear fall (degrees) and its step (x, y)", "65 or more, (195 to 205, 131 plus or minus 4)", `${g(n.step[0].fallDeg, 0)} to (${n.step[0].step.x}, ${n.step[0].step.y})`, `${g(n.step[1].fallDeg, 0)} to (${n.step[1].step.x}, ${n.step[1].step.y})`);
  row("head height along its axis, px", "105 plus or minus 4", "about 105", g(n.headPx, 0));
  row("width at the eye line, H", "1.40 to 1.50", "-", g(fm.W));
  row("eye centres apart, H", "0.98", "-", g(n.yE2));
  row("height over width, front", "0.68 or more", "-", g(fm.heightOverWidth));
  row("width 0.30 above the eye line, over W", "0.72 or more", "-", g(fm.wUp30));
  row("width 0.35 below the eye line, over W", "no target in round 7", "-", g(fm.wDown35));
  row("skull depth, H", "no target in round 7 (1.05 to 1.10 in round 6)", "-", g(fm.depth));
  row("length with the snout, H", "1.25 or less", "-", g(fm.length));
  row("crown, share of the skull's length from the back", "0.45 to 0.55", "-", g(fm.crownShare));
  row("brow outside the chord, H", "0.06 or more", "-", g(fm.brow));
  row("snout proud of the skull's front, H", "0.16 or less", "-", g(fm.snout));
  row("muzzle front under the crown, H", "0.73 plus or minus 0.03", "-", g(fm.muzzleBelowCrown));
  row("rear-most point of the skull, z", "0 to -0.15", "-", g(fm.rearZ));
  L.push("");
  return L.join("\n");
}

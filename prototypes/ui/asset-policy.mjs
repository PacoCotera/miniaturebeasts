// The layer a picture shows on, by family (lvgl-switch.md §2.1; the art director's layer table, 2026-10-09). Every picture the host sends the face carries it as `policy`, with `status`:
//   "art"      palette-exact pictures: the face's own stand-ins and small marks; the check reads 0 pixels outside the palette on them
//   "painted"  the studio's masters and the pictures made from them: they leave the palette and show only on the painted pass
// The kin ring and the hatch are art while they are placeholders and painted once their signed master is placed (status "master"). One table, for the host (station/src) and the tests (face/tests/layers.test.mjs).
// An id outside every family is an error, never a guess: a new family is the art director's to place.
const ART = [/^emblem:/, /^page-mark-/, /^icon:/, /^grow:/, /^waiting:/, /^beam:/, /^glint/, /^star/, /^mark-(species|asleep|line-seed|can-grow|waiting|breed|first|line-only|only)/, /^place:[a-z]+:16$/, /^find-[a-z]+-16x16$/, /^cell-outline/, /^frame-cap-(confirm-16|confirm-16-dim|back-16)(\.|$)/, /^home-(crate|rack-pod|shield|sitting|bed-mark)-/, /^home-lamp-(sprout|sky|hairline|amber)-12x12(:\d+x\d+)?$/, /^heart-full-24$/, /^notch-skill-16x24$/, /^mark-out-with-companion-64x96$/, /^spread-progress-(full|empty)-8x8$/, /^leaf-(empty|full)-(8x12|16x20)(:\d+x\d+)?$/];
const PAINTED = [
  /^pod[:-]/, /^figure:/, /^mibi-halo/, /^crop:/, /^trait[:-]/, /^plate-/, /^rail-tab-fill-/, /^mark-clan-/, /^mark-seed/, /^place:[a-z]+:(64|112|48)$/, /^room-/, /^ring-(arc-)?collection-/, /^placepanel:/, /^panel-/, /^well/, /^pane/, /^page-pane/,
  /^stamp:/, /^frame-(room|companion|sun|lamp|top-bar|bottom-line)/, /^face-/, /^find-/, /^ring-kin-/, /^ring-hatch-/,
  /^home-(glass|bay|well|chamber|cradle|journal)/, /^idle-vivarium/, /^home-bed-(dawn|day|dusk|night)-192x56$/, /^bud-shape-S\d{2}-112x112(:\d+x\d+)?$/, /^dome-(back|front|inside-(standby|ready))-304x272(:\d+x\d+)?$/, /^nest(-front)?-208x48(:\d+x\d+)?$/, /^base-336x96(:\d+x\d+)?$/,
];
const MOVES_WITH_MASTER = [/^kinring:/, /^hatch:/, /^mibi:/, /^crate-(sealed|opening|open|sitting)-\d/, /^cargo-(well|bay-shut)-\d/, /^icon-(pod|shield)-\d/, /^founder:/, /^create-(chamber|dome)-/, /^roll-/, /^bud-small-/, /^leaf-small-/, /^bud-(early|late|ready|ready-front|crack-[12])-128x160$/];   // a resident's stand-in is art until its painting lands; Home's bed is a PH plate until its master; Cargo's crates, rack well, shut-bay lid and report icons are PH plates until theirs; Create's founder stand-in is art until its painting lands, and its work tray, small chamber, roll pictures, busy bud and small leaves are PH plates until theirs
export function policyOf(id, status = "placeholder") {
  if (MOVES_WITH_MASTER.some((re) => re.test(id))) return status === "master" ? "painted" : "art";
  if (ART.some((re) => re.test(id))) return "art";
  if (PAINTED.some((re) => re.test(id))) return "painted";
  throw new Error(`asset ${id} is in no layer family (ui/asset-policy.mjs): the art director places a new family`);
}
export const FAMILIES = { ART, PAINTED, MOVES_WITH_MASTER };

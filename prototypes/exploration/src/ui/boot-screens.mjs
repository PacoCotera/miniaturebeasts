// The screens outside the game (UI): the wait while the land is made or comes in, a load that failed, a save kept as stored, and the release's one-time notice.
// Each draws only from its arguments: an empty top bar over the plain ground, its lines centred, and a bottom line that carries only ✓'s word.
// The pixel core and the bottom line are still the page's: it hands them in once as `env` (R, text, viewBg, drawLine and the palette C).
import { PIPS } from "../logic/waitpips.mjs";
import { textW } from "../render/font.mjs";
import { breakLines, buildTag } from "../../../play/src/breakline.mjs";
import { RESET_TEXT, KEPT_TEXT, LOAD_FAILED } from "../data/boot-words.mjs";

export function makeBootScreens(env) {
  const { R, text, viewBg, drawLine, C } = env;
  const ground = () => { R(0, 0, 450, 32, C.ink); R(0, 31, 450, 1, C.night); viewBg(); };
  const okLine = ok => drawLine({ ok, ctx: '', back: '' });

  function drawNotice() {
    ground();
    RESET_TEXT.lines.forEach((l, i) => text(l, 225, 279 + i * 24, C.bone, 2, 'center'));
    okLine(RESET_TEXT.button);
  }
  // The wait: its line, and ten pips (14 × 8, 4 apart, centred 32 under the line's centre), `lit` of them mint and the rest ink with a 2 px slate edge.
  function drawWait(line, lit) {
    ground();
    text(line, 225, 289, C.bone, 2, 'center');
    const w = 14, h = 8, gap = 4, x0 = Math.round(225 - (PIPS * w + (PIPS - 1) * gap) / 2), y0 = 289 + 32 - h / 2;
    for (let i = 0; i < PIPS; i++) { const x = x0 + i * (w + gap); if (i < lit) R(x, y0, w, h, C.mint); else { R(x, y0, w, h, C.slate); R(x + 2, y0 + 2, w - 4, h - 4, C.ink); } }
    okLine('');
  }
  // A save kept as stored. `broken`: it cannot be shown, and the line carries the build; `armed`: the first ✓ towards a new world was pressed; `dx`: the refused press's shake.
  function drawKept({ broken, armed, dx, build }) {
    ground();
    text(broken ? KEPT_TEXT.broken : KEPT_TEXT.newer, 225 + dx, 289, C.bone, 2, 'center');
    if (armed) text(KEPT_TEXT.armed, 225 + dx, 311, C.amber, 2, 'center');
    if (broken) text(buildTag(build), 225, 333, C.bone, 1, 'center');
    okLine(broken ? (armed ? KEPT_TEXT.confirm : KEPT_TEXT.start) : KEPT_TEXT.reload);
  }
  // A load that failed: nothing is drawn in old art. The detail (the part, why, the build) wraps at words into two lines, its error text cut from the middle and "build <sha>" whole at the end.
  // Returns the detail lines as drawn.
  function drawLoadFailed({ lead, why, build }) {
    ground();
    text(LOAD_FAILED.line, 225, 289, C.bone, 2, 'center');
    const { lines } = breakLines({ lead, why, build, measure: str => textW(str, 1), maxW: 420, maxLines: 2 });
    lines.forEach((l, i) => text(l, 225, 313 + i * 10, C.bone, 1, 'center'));
    okLine(LOAD_FAILED.button);
    return lines;
  }
  return { drawNotice, drawWait, drawKept, drawLoadFailed };
}

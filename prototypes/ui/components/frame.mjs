// The frame every Station screen shares: the top bar, the bottom line and the message plate, from the frame spec
// (specs/station/frame.json). A screen gives the frame its title, its bottom line, the message to show and its
// focal box; the frame returns the nodes that go after the screen's own (the plate covers the stage).
// props: { title, turn, turnFlash, materials, flash, companion, line, message, focal }
import { topBar } from "./topBar.mjs";
import { bottomLine } from "./bottomLine.mjs";
import { messagePlate } from "./messagePlate.mjs";

export function frame(ctx, props) {
  return [...topBar(ctx, props), ...bottomLine(ctx, props.line || {}), ...messagePlate(ctx, { text: props.message, focal: props.focal })];
}
export { topBar, bottomLine, messagePlate };
export { panel, hairline } from "./panel.mjs";
export { focusRing } from "./focusRing.mjs";
export { stampLabel, stampCell } from "./stampLabel.mjs";
export { chapterRail } from "./chapterRail.mjs";
export { chapterPage } from "./chapterPage.mjs";
export { textRun, runWidth, wrap, clip, iconAsset } from "./text.mjs";
export { list } from "./list.mjs";
export { specimen, ribbon } from "./specimen.mjs";
export { module } from "./module.mjs";
export { livingWindow } from "./livingWindow.mjs";
export { card } from "./card.mjs";

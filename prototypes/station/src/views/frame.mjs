// The frame's view: the props of the top bar, the bottom line and the message plate from plain facts of the state and the presentation, with nothing
// drawn and no clock of its own. m: { screen (the room's key), title (its one word), step (the presenter's output), companion: { docked, withMibi },
// line (the screen's bottom line), need (the default notice), message (visible text or ""), focal (the screen's focal box) }
export function frameView(m) {
  const line = { ...m.line }; if (line.need == null) line.need = m.need || null;
  return { screen: m.screen, title: m.title, turn: m.step.turn, turnFlash: m.step.turnFlash, materials: m.step.materials, flash: m.step.flash, companion: { docked: !!m.companion.docked, withMibi: !!m.companion.withMibi }, line, message: m.message || "", focal: m.focal || null };
}

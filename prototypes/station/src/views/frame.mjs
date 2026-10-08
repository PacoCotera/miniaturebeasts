// The frame's view: the props of the top bar, the bottom line and the message plate from plain facts of the state and the
// presentation, with nothing drawn and no clock of its own. m: { title, step (the presenter's output), companion: { text, docked },
// line (the screen's bottom line), need (the default need text), message (visible text or ""), focal (the screen's focal box) }
export function frameView(m) {
  const line = { ...m.line }; if (line.need == null) line.need = m.need || null;
  return { title: m.title, turn: m.step.turn, turnFlash: m.step.turnFlash, materials: m.step.materials, flash: m.step.flash, companion: { text: m.companion.text, lamp: m.companion.docked ? "on" : "off" }, line, message: m.message || "", focal: m.focal || null };
}

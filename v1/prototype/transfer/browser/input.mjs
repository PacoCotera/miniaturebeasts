// Raw physical tokens stay separate from semantic presentation state.
export function createInputGate() {
  let requested = 0;
  let ready = null;
  let suspended = false;
  const held = new Set();
  const interrupted = new Set();
  return {
    request(frame) { requested = frame; ready = null; },
    ready(frame) { if (frame === requested) ready = frame; },
    isReady() { return !suspended && ready === requested; },
    down(token, { repeat = false, keyboard = false, back = false } = {}) {
      if (keyboard && !repeat && interrupted.has(token)) {
        interrupted.delete(token);
        held.delete(token); // Fresh press after an outside/lost keyup.
      }
      if (repeat || held.has(token)) return false;
      held.add(token);
      return !suspended && (back || ready === requested);
    },
    up(token) { held.delete(token); interrupted.delete(token); },
    suspend() {
      suspended = true;
      for (const token of held) {
        if (token.startsWith('pointer:')) held.delete(token);
        else interrupted.add(token);
      }
    },
    resume() { suspended = false; },
    snapshot() { return { requested, ready, suspended, held: [...held] }; },
  };
}

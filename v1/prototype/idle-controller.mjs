// Unsaved review demo only: automatic entry is opt-in, never game progression.
// The DOM adapter owns cancellation/focus; this controller owns timer/input state.
export function createIdleController({
  schedule = setTimeout,
  cancel = clearTimeout,
  onChange = () => {},
  hidden = false,
  focused = true,
  interval = 12000,
  inactivityDelay = 30000,
  sceneCount = 3,
} = {}) {
  let running = false;
  let automaticEnabled = false;
  let index = 0;
  let timer = null;
  let timerGeneration = 0;
  let wakePointer = null;
  const wakeKeys = new Set();
  const pressedKeys = new Set();
  const pressedPointers = new Set();

  function snapshot() {
    return { running, index, hidden, focused, automaticEnabled };
  }

  function scheduleNext() {
    if (timer !== null) cancel(timer);
    timer = null;
    const generation = ++timerGeneration;
    if (hidden || !focused) return;
    if (!running && (!automaticEnabled || pressedKeys.size || pressedPointers.size)) return;
    timer = schedule(() => {
      if (generation !== timerGeneration || hidden || !focused) return;
      timer = null;
      if (running) {
        index = (index + 1) % sceneCount;
        scheduleNext();
        onChange(snapshot());
      } else {
        setRunning(true);
      }
    }, running ? interval : inactivityDelay);
  }

  function setRunning(value) {
    if (running === value) return;
    running = value;
    if (running) index = 0;
    scheduleNext();
    onChange(snapshot());
  }

  function activity() {
    if (!running) scheduleNext();
  }

  function clearGestures() {
    wakeKeys.clear();
    pressedKeys.clear();
    pressedPointers.clear();
    wakePointer = null;
  }

  return {
    snapshot,
    activity,

    setAutomatic(enabled) {
      if (automaticEnabled === enabled) return;
      automaticEnabled = enabled;
      if (!running) scheduleNext();
      onChange(snapshot());
    },

    enter() {
      setRunning(true);
    },

    exit() {
      setRunning(false);
    },

    toggle() {
      setRunning(!running);
    },

    setHidden(value) {
      if (hidden === value) return;
      hidden = value;
      if (hidden) clearGestures();
      scheduleNext();
      onChange(snapshot());
    },

    setFocused(value) {
      if (focused === value) return;
      focused = value;
      if (!focused) clearGestures();
      scheduleNext();
      onChange(snapshot());
    },

    keyDown({ key, code = key, onToggle = false }) {
      pressedKeys.add(code);
      activity();
      if (wakeKeys.has(code)) return true;
      const toggleActivation = onToggle && (key === 'Enter' || key === ' ');
      if (!running || toggleActivation) return false;
      wakeKeys.add(code);
      setRunning(false);
      return true;
    },

    keyUp({ key, code = key }) {
      pressedKeys.delete(code);
      activity();
      return wakeKeys.delete(code);
    },

    pointerDown({ pointerId, onToggle = false }) {
      pressedPointers.add(pointerId);
      activity();
      wakePointer = null;
      if (!running || onToggle) return false;
      wakePointer = pointerId;
      setRunning(false);
      return true;
    },

    pointerCancel({ pointerId }) {
      pressedPointers.delete(pointerId);
      if (wakePointer === pointerId) wakePointer = null;
      activity();
    },

    pointerUp({ pointerId }) {
      pressedPointers.delete(pointerId);
      activity();
    },

    click({ pointerId, pointerOrigin }) {
      if (!pointerOrigin && wakeKeys.size > 0) return true;
      if (!pointerOrigin || wakePointer === null) return false;
      // MouseEvent fallback lacks pointerId; its positive detail still identifies
      // a pointer click, unlike keyboard button activation (detail zero).
      if (pointerId !== undefined && pointerId !== wakePointer) return false;
      wakePointer = null;
      return true;
    },
  };
}

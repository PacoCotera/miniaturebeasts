let sandbox;
let replacingSandbox = false;
const stopDeviceTransports = [];
const refreshDeviceFrames = new Map();
let acceptancePaintPending = false;

function stopSandboxTransports() {
  replacingSandbox = true;
  for (const stop of stopDeviceTransports) stop();
}

function reconnectSandbox() {
  if (replacingSandbox) return;
  stopSandboxTransports();
  const label = document.querySelector('#sandbox-status');
  if (label) label.textContent = 'Sandbox changed. Reconnecting all three devices…';
  window.location.reload();
}

function acceptSandbox(value) {
  if (replacingSandbox) return false;
  if (value === undefined || value === null) return true; // Legacy transport fixture.
  if (sandbox === undefined) sandbox = value;
  if (sandbox !== value) {
    reconnectSandbox();
    return false;
  }
  return true;
}

async function connectDevice(deviceId, controls) {
  const buttons = controls.map(name => document.querySelector(`#${deviceId}-${name}`));
  // Fixed physical-actuator transport only. Page/focus decisions and pixels live in C.
  const image = document.querySelector(`#${deviceId}-frame`);
  const status = document.querySelector(`#${deviceId}-status`);
  let revision = 0;
  let visibleRevision = 0;
  let drawGeneration = 0;
  let currentBlob;
  let requestedRevision = 0;
  let commands = Promise.resolve();
  let transportGeneration = 0;
  let gestureGeneration = 0;
  let inputBlocked = false;
  let inputStartedAt = 0;
  let inputStartRevision = 0;
  let inputResultRevision = 0;
  let pendingCommands = 0;
  let pendingActivations = 0;
  let frameInFlight = false;
  let pollInFlight = false;
  let drawing = Promise.resolve();
  let acceptedHaulPainted;

  stopDeviceTransports.push(() => {
    inputBlocked = true;
    ++transportGeneration;
    ++gestureGeneration;
    ++drawGeneration;
    held.clear();
    inputStartedAt = 0;
    buttons.forEach(button => button.classList.remove('held'));
    status.textContent = 'Sandbox reconnecting; previous input discarded.';
  });

  async function stopAfterTransportFailure() {
    if (inputBlocked) return;
    inputBlocked = true;
    ++transportGeneration;
    ++drawGeneration;
    held.clear();
    inputStartedAt = 0;
    buttons.forEach(button => button.classList.remove('held'));
    status.textContent = 'Transport interrupted; activation stopped. Reload to reconnect with a fresh gesture.';
    // A down may have reached C even when its response was lost. Never send a queued up.
    try {
      const response = await fetch('/api/device-input', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'CritterLab' }, body: JSON.stringify({ device: deviceId, event: 'cancel', revision: visibleRevision, sandbox }) });
      if (!response.ok) return;
      await response.json();
    } catch {
      // Remain blocked even when native cancellation cannot be confirmed.
    }
  }

  function send(event, requestedFrame = visibleRevision) {
    if (inputBlocked) return;
    const generation = transportGeneration;
    const gesture = gestureGeneration;
    const requestedSandbox = sandbox;
    const activation = /-(down|up)$/.test(event);
    ++pendingCommands;
    if (activation) ++pendingActivations;
    commands = commands.then(async () => {
      if (inputBlocked || generation !== transportGeneration || (activation && gesture !== gestureGeneration)) return;
      const command = { device: deviceId, event, revision: requestedFrame, sandbox: requestedSandbox };
      // Reassert the actually painted frame atomically with the physical down.
      // Native semantic bounds still reject obsolete frames; up stays separate.
      if (event.endsWith('-down')) command.ready = true;
      const response = await fetch('/api/device-input', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'CritterLab' }, body: JSON.stringify(command) });
      if (response.status === 409) { reconnectSandbox(); return; }
      if (!response.ok) throw new Error('Native input transport unavailable.');
      const state = await response.json();
      const directionDown = deviceId === 'companion' && /^(up|down|left|right)-down$/.test(event) &&
                            state.page === 'probe' && state.field;
      if ((directionDown || event.endsWith('-up')) && inputStartedAt) {
        inputResultRevision = state.revision;
        if (inputResultRevision === inputStartRevision) inputStartedAt = 0;
      }
      if (generation === transportGeneration && !inputBlocked) await receive(state);
    }).catch(() => generation === transportGeneration ? stopAfterTransportFailure() : undefined)
      .finally(() => {
        --pendingCommands;
        if (activation) --pendingActivations;
      });
  }

  async function receive(state) {
    // A background status response can arrive after a newer input response.
    if (!acceptSandbox(state.sandbox) || inputBlocked || state.revision < revision) return;
    // In this single-host presenter acceptance clears native Companion cargo.
    // Paint that authoritative view before exposing increased Lab stock.
    if (deviceId === 'lab' && state.phase >= 4 && state.haul &&
        acceptedHaulPainted !== state.haul) {
      acceptancePaintPending = true;
      try {
        const refreshCompanion = refreshDeviceFrames.get('companion');
        if (!refreshCompanion) throw new Error('Companion transport not connected.');
        await refreshCompanion();
        acceptedHaulPainted = state.haul;
      } finally { acceptancePaintPending = false; }
      if (inputBlocked || state.revision < revision) return;
    }
    revision = state.revision;
    (deviceId === 'lab' ? ['research', 'critters', 'library', 'habitat'] : []).forEach((name, index) => {
      document.querySelector(`#${deviceId}-${name}`).setAttribute('aria-pressed', String(name === 'critters' ? state.page === 'home' : state.workspace === index));
    });
    status.textContent = `${state.focus} · ${state.transfer}`;
    const link = document.querySelector(`#${deviceId}-link`);
    if (link) link.checked = state.online;
    if (!frameInFlight && visibleRevision !== revision && requestedRevision !== revision) drawing = draw(revision);
  }

  async function draw(frame) {
    frameInFlight = true;
    requestedRevision = frame;
    const generation = ++drawGeneration;
    const requestedSandbox = sandbox;
    let url;
    try {
      const query = requestedSandbox === undefined ? '' : `&sandbox=${requestedSandbox}`;
      const response = await fetch(`/api/devices/${deviceId}/frame?revision=${frame}${query}`);
      if (response.status === 409) {
        requestedRevision = 0; // The next status can retry even if its revision is unchanged.
        return;
      }
      if (!response.ok) throw new Error('Native frame unavailable.');
      if (!acceptSandbox(response.headers?.get('X-Critter-Sandbox'))) return;
      url = URL.createObjectURL(await response.blob());
      const decoded = new Image();
      decoded.src = url;
      await decoded.decode();
      if (generation !== drawGeneration || frame !== revision) return;
      image.src = url;
      await image.decode();
      if (generation !== drawGeneration || frame !== revision) return;
      const previous = currentBlob;
      currentBlob = url;
      url = undefined;
      if (previous) URL.revokeObjectURL(previous);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => {
        if (generation === drawGeneration && frame === revision && !document.hidden) {
          visibleRevision = frame;
          image.setAttribute('data-visible-revision', String(frame));
          if (inputStartedAt && inputResultRevision && frame >= inputResultRevision) {
            image.setAttribute('data-input-to-paint-ms', String(Math.round(performance.now() - inputStartedAt)));
            inputStartedAt = 0;
          }
          send('ready', frame);
        }
        resolve();
      })));
    } catch {
      if (generation === drawGeneration) await stopAfterTransportFailure();
    } finally {
      if (url) URL.revokeObjectURL(url);
      frameInFlight = false;
      // Replace obsolete view work with only the latest native revision.
      if (!inputBlocked && frame !== revision && visibleRevision !== revision) drawing = draw(revision);
    }
  }

  refreshDeviceFrames.set(deviceId, async () => {
    for (let attempt = 0; attempt < 5 && !inputBlocked; ++attempt) {
      const response = await fetch(`/api/devices/${deviceId}/status`);
      if (!response.ok) throw new Error('Native acceptance refresh unavailable.');
      await receive(await response.json());
      await drawing;
      if (visibleRevision && visibleRevision === revision) return;
    }
    throw new Error('Accepted Companion frame not painted.');
  });

  const held = new Map();
  for (const name of controls) {
    const button = document.querySelector(`#${deviceId}-${name}`);
    button.addEventListener('pointerdown', event => {
      if (inputBlocked || event.button !== 0 || held.has(name)) return;
      event.preventDefault();
      if (held.size) {
        ++gestureGeneration;
        for (const gesture of held.values()) gesture.cancelled = true;
        held.set(name, { pointer: event.pointerId, frame: visibleRevision, cancelled: true });
        button.setPointerCapture(event.pointerId);
        buttons.forEach(control => control.classList.remove('held'));
        send('cancel');
        return;
      }
      if (pendingActivations || !visibleRevision || acceptancePaintPending) {
        // Bound action backlog. C decides whether the painted interaction still
        // means the same thing while time-only pixels are being refreshed.
        held.set(name, { pointer: event.pointerId, frame: visibleRevision, cancelled: true });
        button.setPointerCapture(event.pointerId);
        status.textContent = 'Input not applied while updating. Press again after the screen is ready.';
        return;
      }
      held.set(name, { pointer: event.pointerId, frame: visibleRevision });
      const direction = deviceId === 'companion' && ['up', 'down', 'left', 'right'].includes(name);
      if (direction) {
        inputStartedAt = performance.now();
        inputStartRevision = visibleRevision;
        inputResultRevision = 0;
      }
      button.setPointerCapture(event.pointerId);
      button.classList.add('held');
      send(`${name}-down`, visibleRevision);
    });
    button.addEventListener('pointerup', event => {
      const gesture = held.get(name);
      if (gesture?.pointer !== event.pointerId) return;
      held.delete(name);
      button.classList.remove('held');
      const bounds = button.getBoundingClientRect();
      const inside = event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
      if (!gesture.cancelled) {
        if (inside && !(deviceId === 'companion' && ['up', 'down', 'left', 'right'].includes(name))) {
          inputStartedAt = performance.now();
          inputStartRevision = gesture.frame;
          inputResultRevision = 0;
        }
        else if (!inside) ++gestureGeneration;
        send(inside ? `${name}-up` : 'cancel', gesture.frame);
      }
    });
    for (const type of ['pointercancel', 'lostpointercapture']) button.addEventListener(type, () => {
      if (held.delete(name)) {
        ++gestureGeneration;
        for (const gesture of held.values()) gesture.cancelled = true;
        buttons.forEach(control => control.classList.remove('held'));
        send('cancel');
      }
    });
    button.addEventListener('keydown', event => event.preventDefault());
  }

  function suspend() {
    ++gestureGeneration;
    inputStartedAt = 0;
    held.clear();
    buttons.forEach(button => button.classList.remove('held'));
    send('suspend');
  }
  function resume() { if (!document.hidden) send('resume'); }
  window.addEventListener('blur', suspend);
  window.addEventListener('focus', resume);
  document.addEventListener('visibilitychange', () => document.hidden ? suspend() : resume());
  try {
    const response = await fetch(`/api/devices/${deviceId}/status`);
    if (!response.ok) throw new Error('Native C process unavailable.');
    await receive(await response.json());
    if (!document.hidden) send('resume');
  } catch { await stopAfterTransportFailure(); }



  // Poll native time-driven state; timing and gameplay stay in C.
  async function pollStatus() {
    if (inputBlocked || document.hidden || held.size || pendingCommands || frameInFlight || pollInFlight) return;
    pollInFlight = true;
    try {
      const response = await fetch(`/api/devices/${deviceId}/status`);
      if (!response.ok) throw new Error('Native device unavailable');
      await receive(await response.json());
    } catch { await stopAfterTransportFailure(); }
    finally { pollInFlight = false; }
  }
  const pollTimer = setInterval(pollStatus, 1000);

  // Node transport tests should not be held open by the browser polling timer.
  pollTimer.unref?.();
}

const profiles = {
  lab: ['up','down','left','right','research','critters','library','habitat','confirm','back'],
  companion: ['up','down','left','right','confirm','back'],
  dock: ['up','down','confirm','research','critters']
};
await Promise.all(Object.entries(profiles).map(([device, buttons]) => connectDevice(device, buttons)));
for (const device of ['companion','dock']) {
  document.querySelector(`#${device}-link`).addEventListener('change', async event => {
    const label = document.querySelector('#link-status');
    if (replacingSandbox) return;
    try {
      const response = await fetch('/api/link', {method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'CritterLab'},body:JSON.stringify({device,online:event.target.checked,sandbox})});
      if (response.status === 409) { reconnectSandbox(); return; }
      if (!response.ok) throw new Error();
      const state = await response.json();
      if (!acceptSandbox(state.sandbox)) return;
      event.target.checked = state.online;
      label.textContent = `${device}: ${state.online ? 'link available' : 'link interrupted'} (simulated).`;
    } catch { label.textContent = 'Simulation link control unavailable. Reload to verify state.'; }
  });
}
document.querySelector('#reset-sandbox')?.addEventListener('click', async () => {
  if (replacingSandbox || sandbox === undefined) return;
  if (!window.confirm('Reset Station, Companion and Dock to a fresh game? Current progress will be preserved in a server backup.')) return;
  const button = document.querySelector('#reset-sandbox');
  const label = document.querySelector('#sandbox-status');
  button.disabled = true;
  stopSandboxTransports();
  label.textContent = 'Resetting all three devices…';
  try {
    const response = await fetch('/api/reset', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'CritterLab' },
      body: JSON.stringify({ confirm: true, sandbox }) });
    if (!response.ok) throw new Error();
    const result = await response.json();
    label.textContent = `Sandbox reset. Previous progress preserved in ${result.backup}. Reconnecting…`;
    window.location.reload();
  } catch {
    label.textContent = 'Reset could not be confirmed. Saved progress is retained; reload to verify the sandbox before playing.';
  }
});
async function showRelease() {
  const label = document.querySelector('#release');
  try {
    const response = await fetch('/api/release', { cache: 'no-store' });
    if (!response.ok) return;
    const release = await response.json();
    if (!/^[0-9a-f]{40}$/.test(release.commit || '') || !release.deployed_at) return;
    const timestamp = new Date(release.deployed_at);
    if (!Number.isFinite(timestamp.getTime())) return;
    const formatted = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Mexico_City', day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).format(timestamp);
    label.textContent = `Release ${release.commit.slice(0, 7)} | ${formatted} Mexico City`;
  } catch {
    // Missing metadata retains the honest development label.
  }
}
showRelease();

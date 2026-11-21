// One request helper for every load the page makes at start: a failed or non-ok request is tried again (twice, after a short pause); the last failure names the file and the status.
// `env` is for tests: { fetch, pause, Image }.
export const RETRIES = 2, PAUSE_MS = 400;
const fileOf = u => { const s = String(u).split('?')[0]; return s.slice(s.lastIndexOf('/') + 1) || s; };
const pauseFor = ms => new Promise(r => setTimeout(r, ms));

export async function fetchOk(url, env = {}) {
  const f = env.fetch || ((u, o) => fetch(u, o)), pause = env.pause || pauseFor;
  let why = '';
  for (let i = 0; i <= RETRIES; i++) {
    if (i) await pause(PAUSE_MS * i);
    try {
      const res = await f(url);
      if (res && res.ok) return res;
      why = (res ? res.status : 'no answer') + ' ' + fileOf(url);
    } catch (e) { why = (e && e.message ? e.message : 'failed') + ' ' + fileOf(url); }
  }
  const err = new Error(why); err.file = fileOf(url); throw err;
}

// An image the same way: the picture loads, or after two more tries the error names the file.
export async function loadImg(src, env = {}) {
  const Img = env.Image || Image, pause = env.pause || pauseFor;
  for (let i = 0; i <= RETRIES; i++) {
    if (i) await pause(PAUSE_MS * i);
    const im = await new Promise(res => { const m = new Img(); m.onload = () => res(m); m.onerror = () => res(null); m.src = src; });
    if (im) return im;
  }
  const err = new Error('missing ' + fileOf(src)); err.file = fileOf(src); throw err;
}

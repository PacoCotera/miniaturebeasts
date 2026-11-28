// One request helper for every load the page makes at start: a failed or non-ok request is tried again (twice, after a short pause); the last failure names the file and the status.
// `env` is for tests: { fetch, pause, Image }.
const RETRIES = 2, PAUSE_MS = 400;
const fileOf = u => { const s = String(u).split('?')[0]; return s.slice(s.lastIndexOf('/') + 1) || s; };
const pauseFor = ms => new Promise(r => setTimeout(r, ms));

// `once` gives the loaded thing or throws why not; the error after the last try is that reason and the file's name (err.file).
async function retried(url, pause = pauseFor, once) {
  let why;
  for (let i = 0; i <= RETRIES; i++) {
    if (i) await pause(PAUSE_MS * i);
    try { return await once(); } catch (e) { why = e.message; }
  }
  const file = fileOf(url), err = new Error(why + ' ' + file); err.file = file; throw err;
}
export const fetchOk = (url, env = {}) => retried(url, env.pause, async () => { const res = await (env.fetch || fetch)(url); if (res.ok) return res; throw new Error(res.status); });
export const loadImg = (src, env = {}) => retried(src, env.pause, () => new Promise((ok, no) => { const m = new (env.Image || Image)(); m.onload = () => ok(m); m.onerror = () => no(new Error('missing')); m.src = src; }));

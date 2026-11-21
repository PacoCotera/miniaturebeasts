// What the player can read off the screen, as text (the playtest plan: observe, assisted mode), and what visibly changed since the last press (raw mode's only report besides the
// picture). Read from what the face drew (its test-mode log: every string with its region, size and place; the regions' rectangles) and the props it drew from (the screen's name,
// the focus, the residents as drawn): never the rules' state. A name is given only when the screen shows it; a number only when it is written on the screen.
const NUM = /(?:\d+[:.,]\d+|\d+)(?:\s*%)?/g;

// the words as drawn, top to bottom then left to right: { region, text, px, x, y }
export function wordsOf(log) {
  return (log?.type ?? []).filter((t) => t.text && t.text.trim()).map((t) => ({ region: t.region, text: t.text, px: t.px, x: t.x, y: t.cap })).sort((a, b) => a.y - b.y || a.x - b.x);
}
const byRegion = (words) => { const o = {}; for (const w of words) (o[w.region] ??= []).push(w.text); return o; };
// the focus: the ring's target id, its group, and the words of the region it sits on (the target's region, else its group's)
function focusOf(props, regions) {
  const cur = props?.focus?.cur; if (cur == null) return null;
  const t = props.focus.targets?.find((x) => x.id === cur), group = t?.group ?? String(cur).split(".")[0];
  const words = regions[cur] ?? regions[group] ?? regions[group + "s"] ?? null;
  return { id: cur, group, words: words ? words.join(" ") : null };
}
// the residents drawn on the screen: their stage and what each is doing (the figure it is drawn as), and the name only when it is written
function mibisOf(props, text) {
  const rs = Array.isArray(props?.regions?.residents) ? props.regions.residents : [];
  return rs.map((r) => { const name = r.name && text.includes(r.name) ? r.name : null; return { ...(name ? { name } : {}), stage: r.stage ?? null, doing: r.figure ?? r.pose ?? r.state ?? null }; });
}

export function observe(session) {
  const props = session.props(), log = session.log(), words = wordsOf(log), regions = byRegion(words), text = words.map((w) => w.text).join(" · ");
  const numbers = words.flatMap((w) => (w.text.match(NUM) ?? []).map((n) => ({ region: w.region, n, in: w.text })));
  return {
    screen: props?.idle ? "idle" : props?.screen ?? null, title: regions.title?.[0] ?? regions.bar?.[0] ?? null, state: props?.state ?? null, overlay: props?.overlay?.id ?? null,
    words: words.map(({ region, text }) => ({ region, text })), focus: focusOf(props, regions), numbers, mibis: mibisOf(props, text),
    events: session.events.slice(-5),
  };
}

// what visibly changed between two observations, in words: the screen, the focus, each region's words; "nothing changed" when the picture is the same
export function diff(a, b, sameHash) {
  if (sameHash) return ["nothing changed"];
  const out = [];
  if (!a) return ["the screen appeared: " + (b.screen ?? "?")];
  if (a.screen !== b.screen || a.state !== b.state) out.push(`the screen changed from ${a.screen}${a.state ? " (" + a.state + ")" : ""} to ${b.screen}${b.state ? " (" + b.state + ")" : ""}`);
  if (a.overlay !== b.overlay) out.push(b.overlay ? `${b.overlay} opened over the screen` : `${a.overlay} closed`);
  const fa = a.focus?.words ?? a.focus?.id, fb = b.focus?.words ?? b.focus?.id;
  if (a.focus?.id !== b.focus?.id) out.push(`the focus moved from ${fa ?? "nothing"} to ${fb ?? "nothing"}`);
  const ra = byRegion(a.words), rb = byRegion(b.words);
  if (a.screen !== b.screen) { out.push(`it reads: ${b.words.map((w) => w.text).join(" \u00b7 ")}`); return out; }   // a new screen: its words, not a list of what went
  for (const r of new Set([...Object.keys(ra), ...Object.keys(rb)])) {
    const wa = (ra[r] ?? []).join(" "), wb = (rb[r] ?? []).join(" ");
    if (wa !== wb) out.push(!wa ? `${r} now reads "${wb}"` : !wb ? `${r} ("${wa}") is gone` : `${r} changed from "${wa}" to "${wb}"`);
  }
  return out.length ? out : ["the picture changed, the words did not"];
}

// the session's observe API: observeAssisted() (the screen as text), changed() (since the last press), and the recent events (the message plate's words and screen changes)
export function attachObserve(session) {
  session.events = [];
  let last = observe(session), lastHash = session.hash(), lastMsg = "";
  const press = session.press;
  let changes = ["nothing pressed yet"];
  session.press = (key) => {
    const r = press(key), now = observe(session), msg = session.game.FX.msg || "";
    if (msg && msg !== lastMsg) session.events.push(msg);
    lastMsg = msg;
    if (now.screen !== last.screen) session.events.push(`${now.title ?? now.screen} opened`);
    now.events = session.events.slice(-5);
    changes = diff(last, now, r.hash === lastHash);
    last = now; lastHash = r.hash;
    return { ...r, changed: changes, events: session.events.slice(-5) };
  };
  session.observeAssisted = () => observe(session);
  session.changed = () => changes;
}

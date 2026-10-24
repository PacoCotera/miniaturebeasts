// The picture requests the props builders make: a builder collects its requests in one array and each request is a plain object the host reads. Pure.

// req(requests, once = false): the collector for one builder. req(r) pushes the request r onto `requests` and returns r.id.
// With `once`, a request whose id is already in `requests` is not pushed again; the id is returned either way.
export const req = (requests, once = false) => (r) => { if (!once || !requests.some((x) => x.id === r.id)) requests.push(r); return r.id; };

// slot(req, until): the maker of signed-master requests for one builder. slot(id, size, until2) requests { kind: "slot", id, master: id, size, until } through `req` and returns the id;
// `until` (what the picture waits for) is the builder's default and until2, when given, replaces it for that call.
export const slot = (req, until) => (id, size, until2) => req({ kind: "slot", id, master: id, size, until: until2 || until });

// ph(req, until): the maker of placeholder requests for one builder. ph(id, size, hollow = false) requests { kind: "ph", id, size, hollow, until } through `req` and returns the id.
export const ph = (req, until) => (id, size, hollow = false) => req({ kind: "ph", id, size, hollow, until });

// plateDevice(w, h, until = "the device plate (fix 2: placed 1:1)"): the request for the device plate of w x h placed 1:1, { kind: "slot", id: "plate-device-WxH", master: the same, size: [w, h], until }.
// Returns the request; the caller passes it to its req. `until` is the caller's own wording of what the picture waits for, when it has one.
export const plateDevice = (w, h, until = "the device plate (fix 2: placed 1:1)") => ({ kind: "slot", id: `plate-device-${w}x${h}`, master: `plate-device-${w}x${h}`, size: [w, h], until });

// slotAt(req, master, rect, until): the request for a signed master placed at a rect of the spec, requested through `req` and returned as its id: { kind: "slot", id: "<master>:<w>x<h>", master, size: rect.slice(2), until }.
export const slotAt = (req, master, rect, until) => { const size = rect.slice(2); return req({ kind: "slot", id: `${master}:${size.join("x")}`, master, size, until }); };

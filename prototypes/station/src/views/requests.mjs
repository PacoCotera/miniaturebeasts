// The picture requests the props builders make: a builder collects its requests in one array and each request is a plain object the host reads. Pure.

// req(requests): the collector for one builder. req(r) pushes the request r onto `requests` and returns r.id.
export const req = (requests) => (r) => { requests.push(r); return r.id; };

// slot(req, until): the maker of signed-master requests for one builder. slot(id, size, until2) requests { kind: "slot", id, master: id, size, until } through `req` and returns the id;
// `until` (what the picture waits for) is the builder's default and until2, when given, replaces it for that call.
export const slot = (req, until) => (id, size, until2) => req({ kind: "slot", id, master: id, size, until: until2 || until });

// ph(req, until): the maker of placeholder requests for one builder. ph(id, size, hollow = false) requests { kind: "ph", id, size, hollow, until } through `req` and returns the id.
export const ph = (req, until) => (id, size, hollow = false) => req({ kind: "ph", id, size, hollow, until });

// plateDevice(w, h): the request for the device plate of w x h placed 1:1, { kind: "slot", id: "plate-device-WxH", master: the same, size: [w, h], until }. Returns the request; the caller passes it to its req.
export const plateDevice = (w, h) => ({ kind: "slot", id: `plate-device-${w}x${h}`, master: `plate-device-${w}x${h}`, size: [w, h], until: "the device plate (fix 2: placed 1:1)" });

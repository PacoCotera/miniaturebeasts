// The places worker (src/realm-worker.mjs) run in a node worker thread, as a browser runs it: the test's stand-in Worker starts this file, which gives the module the `self` it expects.
// Messages cross by structured clone both ways (node's own), so what a browser could not clone fails here too.
import { parentPort } from "node:worker_threads";

globalThis.self = {
  postMessage: (m, transfer) => parentPort.postMessage(m, transfer),
  set onmessage(fn) { parentPort.on("message", (data) => fn({ data })); },
};
await import("../src/realm-worker.mjs");

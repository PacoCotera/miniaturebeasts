// The service stops promptly when asked (every release restarts it), even with a dock stream open: before, server.close() waited for
// the stream forever and systemd killed the process after ~90 s, so the dock answered 502 through every release.
//   node --test prototypes/caddy/tests/stop.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const port = 20000 + Math.floor(Math.random() * 20000);

test("SIGTERM with a dock stream open: the process exits within the grace, not systemd's timeout", async () => {
  const child = spawn(process.execPath, [path.join(here, "..", "server.mjs")], {
    env: { ...process.env, CADDY_PORT: String(port), CADDY_DATA: mkdtempSync(path.join(tmpdir(), "mb-caddy-stop-")), CADDY_PAINTER: "off" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await new Promise((resolve, reject) => {
      child.stdout.on("data", (b) => { if (String(b).includes("mb-caddy on")) resolve(); });
      child.on("exit", (c) => reject(new Error("the service exited before listening: " + c)));
    });
    // a live stream, held open
    const opened = await new Promise((resolve, reject) => {
      const req = http.get({ host: "127.0.0.1", port, path: "/dock/events?world=stoptest" }, (res) => { res.once("data", () => resolve(res)); });
      req.on("error", reject);
    });
    assert.equal(opened.statusCode, 200);
    opened.on("error", () => {});
    const t0 = Date.now();
    const exited = new Promise((resolve) => child.on("exit", (code) => resolve(code)));
    child.kill("SIGTERM");
    const code = await Promise.race([exited, new Promise((r) => setTimeout(() => r("hung"), 4000))]);
    assert.notEqual(code, "hung", "still running 4 s after SIGTERM");
    assert.equal(code, 0);
    assert.ok(Date.now() - t0 < 4000);
  } finally { if (child.exitCode == null) child.kill("SIGKILL"); }
});

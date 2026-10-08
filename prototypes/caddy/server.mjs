#!/usr/bin/env node
// The Caddy service on the VM (unit mb-caddy): node prototypes/caddy/server.mjs
//   CADDY_PORT (8787)  CADDY_DATA (/srv/miniaturebeasts/caddy-data)  CADDY_PAINTER mock|real|off (mock)
//   CADDY_CEILING_USD (5)  CADDY_GROW_CAP (10)  CADDY_MOCK_DELAY seconds (20)  GEMINI_API_KEY (the real painter's key, never in the repository)
// The web server proxies /caddy-api/ to it on localhost (ops/sandbox/install.sh).
import { createServer } from "node:http";
import { createApp, loadFrames } from "./app.mjs";

loadFrames();
const env = process.env;
const app = createApp({ dataDir: env.CADDY_DATA, painter: env.CADDY_PAINTER || "mock", ceilingUSD: +(env.CADDY_CEILING_USD || 5), growCap: +(env.CADDY_GROW_CAP || 10), mockDelay: +(env.CADDY_MOCK_DELAY || 20), python: env.CADDY_PYTHON || "python3" });
const port = +(env.CADDY_PORT || 8787);
const server = createServer((req, res) => { app.handle(req, res); });
server.listen(port, "127.0.0.1", () => { console.log(`mb-caddy on 127.0.0.1:${port} · painter ${app.status().painter} · ceiling $${app.cfg.ceilingUSD} a day · data ${app.dataDir}`); });
app.start();
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { app.stop(); server.close(() => process.exit(0)); });

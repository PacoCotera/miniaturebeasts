import { createServer, request as upstreamRequest } from "node:http";
import { readFile, realpath, stat, lstat } from "node:fs/promises";
import { resolve, relative, isAbsolute, extname } from "node:path";
import { fileURLToPath } from "node:url";

const websiteRoot = fileURLToPath(new URL("../../website/dist/", import.meta.url));
const benchPort = 4381;
const nativePort = 4190;
const maximumBenchBody = 65536;
const maximumNativeHtml = 262144;
const upstreamTimeoutMs = 30000;
const websitePolicy = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
const benchPolicy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
const hopHeaders = new Set(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade"]);
const contentTypes = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".json": "application/json; charset=utf-8",
};

function forwardingHeaders(headers) {
  const excluded = new Set(hopHeaders);
  for (const name of String(headers.connection ?? "").split(",")) excluded.add(name.trim().toLowerCase());
  return Object.fromEntries(Object.entries(headers).filter(([name]) => !excluded.has(name.toLowerCase())));
}

function reply(response, status, message) {
  if (response.destroyed) return;
  if (response.headersSent) return response.destroy();
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff", "Content-Security-Policy": websitePolicy,
  });
  response.end(JSON.stringify({ error: message }));
}

function validateExternalRequest(request, allowedHosts) {
  const host = request.headers.host;
  const scheme = request.headers["x-forwarded-proto"] ?? "http";
  if (typeof host !== "string" || !allowedHosts.includes(host) ||
      !["http", "https"].includes(scheme)) throw new Error("Allowed platform Host and scheme required");
  const origin = request.headers.origin;
  // An absent Origin is normal for document loads. Mutations require it.
  if (origin !== undefined && origin !== `${scheme}://${host}`) throw new Error("Same-origin request required");
  if (!["GET", "HEAD"].includes(request.method) && origin === undefined) throw new Error("Mutation Origin required");
}

async function benchBody(request, maximum = maximumBenchBody) {
  const declared = request.headers["content-length"];
  if (declared !== undefined && (!/^\d+$/.test(declared) || Number(declared) > maximum)) {
    request.resume();
    throw Object.assign(new Error("Workbench request exceeds its route body limit"), { status: 413 });
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > maximum) {
      request.resume();
      throw Object.assign(new Error("Workbench request exceeds its route body limit"), { status: 413 });
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function rewriteNativeHtml(body) {
  const html = body.toString("utf8");
  const stylesheet = 'href="/style.css"';
  const script = 'src="/app.js"';
  if (html.split(stylesheet).length !== 2 || html.split(script).length !== 2) {
    throw new Error("Native asset references differ from the declared mount contract");
  }
  return Buffer.from(html.replace(stylesheet, 'href="/sandbox/style.css"').replace(script, 'src="/sandbox/app.js"'));
}

function proxy(request, response, path, destination, body = null) {
  const headers = forwardingHeaders(request.headers);
  const nativeHtmlPath = destination === "native" && ["/", "/index.html"].includes(path.split("?")[0]);
  if (destination === "bench") {
    headers.host = `127.0.0.1:${benchPort}`;
    if (headers.origin !== undefined) headers.origin = `http://127.0.0.1:${benchPort}`;
    headers["content-length"] = String(body.length);
    delete headers["x-forwarded-host"];
    delete headers["x-forwarded-proto"];
  } else {
    headers.host = request.headers.host;
    if (request.headers.origin !== undefined) headers.origin = request.headers.origin;
    if (request.headers["x-forwarded-proto"] !== undefined) headers["x-forwarded-proto"] = request.headers["x-forwarded-proto"];
    if (request.headers.authorization !== undefined) headers.authorization = request.headers.authorization;
  }
  // Native receives the original Host, Origin, scheme and Authorization.
  if (nativeHtmlPath) headers["accept-encoding"] = "identity";
  const upstream = upstreamRequest({ hostname: "127.0.0.1", port: destination === "bench" ? benchPort : nativePort,
    method: request.method, path, headers }, (incoming) => {
    const outgoing = forwardingHeaders(incoming.headers);
    if (destination === "bench") outgoing["content-security-policy"] = benchPolicy;
    const nativeHtml = nativeHtmlPath &&
      incoming.statusCode === 200 && String(incoming.headers["content-type"]).startsWith("text/html");
    if (!nativeHtml) {
      response.writeHead(incoming.statusCode, outgoing);
      incoming.on("error", () => response.destroy());
      incoming.pipe(response);
      return;
    }
    let size = 0;
    const chunks = [];
    incoming.on("data", (chunk) => {
      size += chunk.length;
      if (size > maximumNativeHtml) upstream.destroy(new Error("Native HTML exceeds mount limit"));
      else chunks.push(chunk);
    });
    incoming.on("error", () => reply(response, 502, "Native document unavailable"));
    incoming.on("end", () => {
      if (response.destroyed || response.writableEnded) return;
      try {
        const rewritten = rewriteNativeHtml(Buffer.concat(chunks));
        outgoing["content-length"] = String(rewritten.length);
        delete outgoing.etag;
        response.writeHead(incoming.statusCode, outgoing);
        response.end(rewritten);
      } catch {
        reply(response, 502, "Native document mount contract changed");
      }
    });
  });
  const deadline = setTimeout(() => upstream.destroy(new Error("Upstream deadline exceeded")), upstreamTimeoutMs);
  upstream.on("close", () => clearTimeout(deadline));
  upstream.on("error", () => reply(response, 502, `${destination === "bench" ? "Genome workbench" : "Simulator"} unavailable`));
  response.on("close", () => { if (!response.writableEnded) upstream.destroy(); });
  request.on("aborted", () => upstream.destroy());
  if (body !== null) upstream.end(body);
  else request.pipe(upstream);
}

function contained(root, filename) {
  const path = relative(root, filename);
  return path !== ".." && !path.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) && !isAbsolute(path);
}

async function website(request, response, pathname) {
  if (!["GET", "HEAD"].includes(request.method)) return reply(response, 405, "Static documents support GET and HEAD only");
  try {
    if ((await lstat(websiteRoot)).isSymbolicLink()) throw new Error("Website root cannot be a symlink");
    const root = await realpath(websiteRoot);
    const filename = resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
    if (!contained(root, filename)) return reply(response, 404, "Not found");
    const actual = await realpath(filename);
    if (!contained(root, actual)) return reply(response, 404, "Not found");
    const information = await stat(actual);
    if (!information.isFile()) return reply(response, 404, "Not found");
    const bytes = request.method === "HEAD" ? null : await readFile(actual);
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(actual).toLowerCase()] ?? "application/octet-stream",
      "Content-Length": information.size, "Content-Security-Policy": websitePolicy,
      "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin",
      "Cache-Control": "no-cache",
    });
    response.end(bytes);
  } catch {
    reply(response, 404, "Not found");
  }
}

export function makePlatformServer(environment = process.env) {
  const port = Number(environment.PORT ?? 4180);
  const platformHost = environment.CRITTER_PLATFORM_HOST ?? "miniaturebeasts.com";
  const legacyHost = environment.CRITTER_PLATFORM_LEGACY_HOST;
  if (!Number.isInteger(port) || port < 1 || port > 65535 || !/^[a-z0-9.-]+$/.test(platformHost) ||
      (legacyHost !== undefined && !/^[a-z0-9.-]+$/.test(legacyHost))) {
    throw new Error("Invalid platform port or hostname");
  }
  const allowedHosts = [platformHost, `127.0.0.1:${port}`, `localhost:${port}`];
  if (legacyHost !== undefined) allowedHosts.push(legacyHost);
  const release = {
    schemaVersion: "platform-release/1", revision: environment.CRITTER_PLATFORM_REVISION ?? "unrecorded",
    activatedAt: environment.CRITTER_PLATFORM_ACTIVATED_AT ?? null,
    website: "/", genome: "/genome/", sandbox: "/sandbox/",
  };
  const server = createServer(async (request, response) => {
    try {
      validateExternalRequest(request, allowedHosts);
    } catch (error) {
      request.resume();
      return reply(response, 403, error.message);
    }
    try {
      if (!request.url.startsWith("/") || request.url.startsWith("//")) return reply(response, 400, "Invalid path");
      const queryStart = request.url.indexOf("?");
      const pathname = queryStart === -1 ? request.url : request.url.slice(0, queryStart);
      const query = queryStart === -1 ? "" : request.url.slice(queryStart);
      const decoded = decodeURIComponent(pathname);
      if (decoded.includes("\\") || decoded.includes("\0") || decoded.split("/").some((part) => part === "." || part === "..")) {
        return reply(response, 400, "Invalid path");
      }
      if (["/genome", "/sandbox"].includes(pathname)) {
        response.writeHead(308, { Location: `${pathname}/${query}`, "Cache-Control": "no-store" });
        return response.end();
      }
      if (pathname === "/api/platform-release" && ["GET", "HEAD"].includes(request.method)) {
        response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
        return response.end(request.method === "HEAD" ? undefined : JSON.stringify(release));
      }
      if (pathname.startsWith("/genome/")) {
        const renderingUpload = request.method === "POST" && ["/genome/api/rendering/jobs", "/genome/api/rendering/recovery"].includes(pathname);
        const body = await benchBody(request, renderingUpload ? 2 * 1024 * 1024 : maximumBenchBody);
        return proxy(request, response, pathname.slice("/genome".length) + query, "bench", body);
      }
      if (pathname.startsWith("/sandbox/")) return proxy(request, response, pathname.slice("/sandbox".length) + query, "native");
      if (pathname.startsWith("/api/")) return proxy(request, response, pathname + query, "native");
      return await website(request, response, decoded);
    } catch (error) {
      reply(response, error.status ?? 400, error.status ? error.message : "Invalid platform request");
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.timeout = 35000;
  server.keepAliveTimeout = 5000;
  return { server, port };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { server, port } = makePlatformServer();
  server.listen(port, "127.0.0.1", () => console.log(`Beecho Lab platform: http://127.0.0.1:${port}`));
}

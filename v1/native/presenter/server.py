"""Presentation transport with optional authentication. Game decisions and pixels come from C."""
from datetime import datetime
import base64
import binascii
import gzip
import hmac
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parent
BUTTONS = {'up', 'down', 'left', 'right', 'research', 'critters', 'library', 'habitat', 'confirm', 'back'}
EVENTS = {f'{button}-{edge}' for button in BUTTONS for edge in ('down', 'up')} | {'cancel', 'suspend', 'resume', 'ready'}


class StaleSandbox(RuntimeError):
    """The request belongs to a sandbox that has already been replaced."""


class NativeProcess:
    """One selected native process; serialized status/input and binary frame reads."""
    def __init__(self, executable, timeout=10, kit=False):
        self.executable = str(executable)
        self.kit = kit
        self.environment = os.environ.copy()
        configured = self.environment.get("BEECHO_V1_SAVE")
        self.save_path = Path(configured if configured is not None else
                              self.environment.get("CRITTER_DEMO_SAVE", "./beecho") + ".beecho-v1").absolute()
        self.sandbox = uuid.uuid4().hex
        self.reset_count = 0
        self.lock = threading.RLock()
        self.timeout = timeout
        self.unavailable = False
        self.process = self.start()

    def start(self):
        if not hasattr(self, "process"):
            return subprocess.Popen([self.executable, "kit-serve" if self.kit else "serve"],
                                    stdin=subprocess.PIPE, stdout=subprocess.PIPE)
        return subprocess.Popen([self.executable, "kit-serve" if self.kit else "serve"],
                                stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                env=self.environment)

    def check_sandbox(self, sandbox):
        # Pre-reset legacy callers remain compatible; after reset every mutation
        # must identify its world, even if a new game's revision repeats an old one.
        if sandbox != self.sandbox and (sandbox is not None or self.reset_count):
            raise StaleSandbox("Sandbox changed; discard pending input")

    def guarded_command(self, lines, sandbox=None, frame=False):
        if not self.lock.acquire(timeout=self.timeout):
            raise RuntimeError("Native transport busy or unavailable")
        try:
            self.check_sandbox(sandbox)
            return self.command_sequence(lines) if len(lines) > 1 else self.command(lines[0], frame)
        finally:
            self.lock.release()

    def reset(self, sandbox):
        """Replace only this configured host game's persistence, retaining backup."""
        if not self.lock.acquire(timeout=self.timeout):
            raise RuntimeError("Native transport busy or unavailable")
        try:
            self.check_sandbox(sandbox)
            if not self.kit:
                raise RuntimeError("Sandbox reset requires three-device mode")
            backup = self.save_path.parent / (self.save_path.name + ".reset-" + uuid.uuid4().hex)
            # Preflight every fixed path before stopping native. Lock files remain
            # at their original paths so another process cannot bypass their inode.
            paths = [Path(str(self.save_path) + suffix) for suffix in
                     ("", ".tmp", ".kit", ".kit.tmp", ".kit.required", ".kit.required.tmp")]
            for path in paths:
                if path.is_symlink() or (path.exists() and not path.is_file()):
                    raise RuntimeError("Sandbox persistence must be regular files")
            backup.mkdir(mode=0o700)
            moved = []
            fresh_started = False
            self.close()
            self.unavailable = True
            # Invalidate all clients even on a failed reset; old native holds died.
            self.sandbox = uuid.uuid4().hex
            self.reset_count += 1
            try:
                for path in paths:
                    if path.exists():
                        path.rename(backup / path.name)
                        moved.append(path)
                fresh_started = True
                self.process = self.start()
                self.unavailable = False
                states = self.check_devices()
                return {"sandbox": self.sandbox, "backup": backup.name, "devices": states}
            except (OSError, RuntimeError):
                self.close()
                self.unavailable = True
                try:
                    # Retain any failed new-world writes too; never destroy files
                    # to hide a failed startup or overwrite the old backup.
                    for path in paths:
                        if fresh_started and path.exists():
                            path.rename(backup / (path.name + ".failed-new"))
                    for path in moved:
                        (backup / path.name).replace(path)
                    self.process = self.start()
                    self.unavailable = False
                    self.check_devices()
                except (OSError, RuntimeError):
                    self.unavailable = True
                raise RuntimeError("Sandbox reset failed; saved world retained for recovery")
        finally:
            self.lock.release()

    def check_devices(self):
        states = [self.command(f"device {device} status")[0] for device in range(3)]
        if any("error" in state or state.get("failed") or
               state.get("transfer") == "Storage unavailable" for state in states):
            raise RuntimeError("Native sandbox storage unavailable")
        return states

    def command(self, line, frame=False):
        if not self.lock.acquire(timeout=self.timeout):
            raise RuntimeError("Native transport busy or unavailable")
        finished = threading.Event()

        def expire():
            if not finished.is_set():
                self.unavailable = True
                self.process.kill()

        deadline = threading.Timer(self.timeout, expire)
        try:
            if self.unavailable:
                raise RuntimeError("Native process unavailable")
            deadline.start()
            self.process.stdin.write((line + "\n").encode("ascii"))
            self.process.stdin.flush()
            header = self.process.stdout.readline()
            if not header:
                raise RuntimeError("Native process unavailable")
            try:
                result = json.loads(header)
            except (ValueError, UnicodeError) as error:
                raise RuntimeError("Invalid native response") from error
            if not isinstance(result, dict):
                raise RuntimeError("Invalid native response")
            result["sandbox"] = self.sandbox
            if not frame or "error" in result:
                return result, None
            parts = line.split()
            dimensions = {"0": (1024, 600), "1": (450, 600), "2": (792, 272)}
            width, height = dimensions.get(parts[1], (1024, 600)) if parts[0] == "device" else (1024, 600)
            expected = 54 + ((width * 3 + 3) & ~3) * height
            if result.get("bytes") != expected:
                raise RuntimeError("Unexpected native frame length")
            pixels = bytearray()
            while len(pixels) < result["bytes"]:
                chunk = self.process.stdout.read(result["bytes"] - len(pixels))
                if not chunk:
                    raise RuntimeError("Native frame interrupted")
                pixels.extend(chunk)
            return result, bytes(pixels)
        except (OSError, RuntimeError):
            self.unavailable = True
            self.process.kill()
            raise
        finally:
            finished.set()
            deadline.cancel()
            if deadline.ident is not None:
                deadline.join()
            self.lock.release()

    def close(self):
        with self.lock:
            self.process.stdin.close()
            try:
                self.process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=2)
            close_output = getattr(self.process.stdout, "close", None)
            if close_output:
                close_output()

    def command_sequence(self, lines):
        """A painted READY/down prefix cannot interleave with another client."""
        if not self.lock.acquire(timeout=self.timeout):
            raise RuntimeError("Native transport busy or unavailable")
        try:
            for line in lines:
                result, _ = self.command(line)
                if "error" in result:
                    break
            return result, None
        finally:
            self.lock.release()


def load_release(path):
    """Read deployment metadata once; no runtime environment or game state."""
    try:
        metadata = json.loads(path.read_text(encoding="utf-8"))
        commit = metadata["commit"]
        committed_at = metadata["committed_at"]
        deployed_at = metadata["deployed_at"]
        if not isinstance(commit, str) or not re.fullmatch(r"[0-9a-f]{40}", commit):
            raise ValueError()
        if not isinstance(committed_at, str):
            raise ValueError()
        committed = datetime.fromisoformat(committed_at.replace("Z", "+00:00"))
        if committed.tzinfo is None:
            raise ValueError()
        if deployed_at is not None:
            if not isinstance(deployed_at, str):
                raise ValueError()
            deployed = datetime.fromisoformat(deployed_at.replace("Z", "+00:00"))
            if deployed.tzinfo is None:
                raise ValueError()
            deployed_at = deployed.isoformat()
        result = {"commit": commit, "committed_at": committed.isoformat(),
                  "deployed_at": deployed_at}
        if "subject" in metadata:
            subject = metadata["subject"]
            if (not isinstance(subject, str) or not 1 <= len(subject) <= 200
                    or not subject.strip() or any(ord(character) < 32 or ord(character) == 127
                                                 or character in "\u0085\u2028\u2029" for character in subject)):
                raise ValueError()
            result["subject"] = subject
        return result
    except (OSError, ValueError, KeyError, TypeError, UnicodeError):
        return {"commit": None, "committed_at": None, "deployed_at": None}


class Handler(BaseHTTPRequestHandler):
    server_version = "CritterPresentation/1"
    protocol_version = "HTTP/1.1"

    def setup(self):
        super().setup()
        self.connection.settimeout(10)
        self.connection.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)

    def accepts_gzip(self):
        """Explicit gzip preference overrides a wildcard, including q=0."""
        preferences = {}
        for entry in self.headers.get("Accept-Encoding", "").split(","):
            parts = entry.strip().lower().split(";")
            quality = 1.0
            for parameter in parts[1:]:
                if parameter.strip().startswith("q="):
                    try:
                        quality = float(parameter.strip()[2:])
                    except ValueError:
                        quality = 0.0
            preferences[parts[0].strip()] = quality if 0 <= quality <= 1 else 0.0
        return preferences.get("gzip", preferences.get("*", 0)) > 0

    def log_message(self, *args):
        pass  # Never record authorization, query strings or request bodies.

    def reply(self, code, body, content_type="application/json", sandbox=None):
        if isinstance(body, dict):
            body = json.dumps(body).encode()
        encoded = False
        if content_type == "image/bmp" and self.accepts_gzip():
            # Native command/pipe locking has ended before compression or network I/O.
            compressed = gzip.compress(body, compresslevel=1, mtime=0)
            if len(compressed) < len(body):
                body = compressed
                encoded = True
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        if sandbox is not None:
            self.send_header("X-Critter-Sandbox", sandbox)
        if content_type == "image/bmp":
            self.send_header("Vary", "Accept-Encoding")
        if encoded:
            self.send_header("Content-Encoding", "gzip")
        if self.close_connection:
            self.send_header("Connection", "close")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'self'; img-src 'self' blob:; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'")
        if code == 401:
            self.send_header("WWW-Authenticate", 'Basic realm="Critter Lab", charset="UTF-8"')
        self.end_headers()
        self.wfile.write(body)

    def authorized(self):
        if not self.server.password:
            return True
        try:
            scheme, value = self.headers.get("Authorization", "").split(" ", 1)
            supplied = base64.b64decode(value, validate=True)
            expected = ("lab:" + self.server.password).encode()
            valid = scheme.lower() == "basic" and hmac.compare_digest(supplied, expected)
        except (ValueError, binascii.Error):
            valid = False
        if not valid:
            self.reply(401, {"error": "Authentication required"})
        return valid

    def native_command(self, lines, sandbox=None, frame=False):
        if hasattr(self.server.native, "guarded_command"):
            return self.server.native.guarded_command(lines, sandbox, frame)
        # Small existing HTTP fixtures expose only the original native interface.
        return (self.server.native.command_sequence(lines) if len(lines) > 1 else
                self.server.native.command(lines[0], frame))

    def do_GET(self):
        if not self.authorized():
            return
        url = urlsplit(self.path)
        try:
            if url.path in {"/", "/index.html", "/style.css", "/app.js"} and not url.query:
                name = "index.html" if url.path == "/" else url.path[1:]
                mime = {"index.html": "text/html; charset=utf-8", "style.css": "text/css", "app.js": "text/javascript"}[name]
                self.reply(200, (ROOT / name).read_bytes(), mime)
            elif url.path == "/api/release" and not url.query:
                self.reply(200, self.server.release)
            elif url.path.startswith("/api/devices/"):
                parts = url.path.split("/")
                devices = {"lab": "0", "companion": "1", "dock": "2"}
                if len(parts) != 5 or parts[3] not in devices or parts[4] not in {"status", "frame"}:
                    raise ValueError()
                prefix = "device " + devices[parts[3]]
                if parts[4] == "status" and url.query:
                    raise ValueError()
                if parts[4] == "status":
                    result, _ = self.server.native.command(prefix + " status")
                    self.reply(200, result)
                else:
                    query = parse_qs(url.query, strict_parsing=True)
                    if set(query) not in ({"revision"}, {"revision", "sandbox"}) or any(len(value) != 1 for value in query.values()):
                        raise ValueError()
                    revision = query["revision"][0]
                    if not re.fullmatch(r"[0-9]{1,10}", revision) or not 0 < int(revision) <= 4294967295:
                        raise ValueError()
                    result, pixels = self.native_command([prefix + " frame " + revision], query.get("sandbox", [None])[0], frame=True)
                    self.reply(409 if pixels is None else 200, result if pixels is None else pixels, "application/json" if pixels is None else "image/bmp", result.get("sandbox"))
            elif url.path == "/api/status" and not url.query:
                result, _ = self.server.native.command("status")
                self.reply(200, result)
            elif url.path == "/api/frame":
                query = parse_qs(url.query, strict_parsing=True)
                if set(query) not in ({"revision"}, {"revision", "sandbox"}) or any(len(v) != 1 for v in query.values()):
                    raise ValueError()
                revision = query["revision"][0]
                if not re.fullmatch(r"[0-9]{1,10}", revision) or not 0 < int(revision) <= 4294967295:
                    raise ValueError()
                result, pixels = self.native_command(["frame " + revision], query.get("sandbox", [None])[0], frame=True)
                self.reply(409 if pixels is None else 200, result if pixels is None else pixels, "application/json" if pixels is None else "image/bmp", result.get("sandbox"))
            else:
                self.reply(404, {"error": "Unknown route"})
        except StaleSandbox:
            self.reply(409, {"error": "Sandbox changed; discard pending input"})
        except ValueError:
            self.reply(400, {"error": "Invalid frame query"})
        except (OSError, RuntimeError):
            self.reply(503, {"error": "Unable to load native screen"})

    def do_POST(self):
        # A rejected unread body must never become a request on a reused socket.
        requested_close = self.close_connection
        self.close_connection = True
        if not self.authorized():
            return
        # The local TLS proxy supplies X-Forwarded-Proto. Never use a forwarded
        # host to broaden the origin allowlist, and never enable CORS.
        try:
            origin = urlsplit(self.headers.get("Origin", ""))
        except ValueError:
            self.reply(403, {"error": "Invalid origin"})
            return
        scheme = self.headers.get("X-Forwarded-Proto", "http")
        if (self.path not in {"/api/input", "/api/device-input", "/api/link", "/api/reset"} or scheme not in {"http", "https"}
                or origin.scheme != scheme
                or origin.netloc != self.headers.get("Host") or origin.path
                or origin.query or origin.fragment
                or self.headers.get("X-Requested-With") != "CritterLab"
                or self.headers.get_content_type() != "application/json"):
            self.reply(403, {"error": "Same-origin command required"})
            return
        try:
            lengths = self.headers.get_all("Content-Length", [])
            if len(lengths) != 1 or self.headers.get("Transfer-Encoding"):
                raise ValueError()
            size = int(lengths[0])
            if not 1 <= size <= 1024:
                raise ValueError()
            body = self.rfile.read(size)
            if len(body) != size:
                raise ValueError()
            command = json.loads(body)
            self.close_connection = requested_close
            if not isinstance(command, dict):
                raise ValueError()
            sandbox = command.pop("sandbox", None)
            if sandbox is not None and (not isinstance(sandbox, str) or not re.fullmatch(r"[0-9a-f]{32}", sandbox)):
                raise ValueError()
            if self.path == "/api/reset":
                if command != {"confirm": True} or type(command["confirm"]) is not bool or sandbox is None:
                    raise ValueError()
                self.reply(200, self.server.native.reset(sandbox))
                return
            devices = {"lab": "0", "companion": "1", "dock": "2"}
            if self.path == "/api/link":
                device, online = command.get("device"), command.get("online")
                if set(command) != {"device", "online"} or device not in {"companion", "dock"} or type(online) is not bool:
                    raise ValueError()
                result, _ = self.native_command([f"device {devices[device]} link {int(online)}"], sandbox)
                self.reply(400 if "error" in result else 200, result)
                return
            name, revision = command.get("event"), command.get("revision")
            expected_keys = {"event", "revision"}
            device = command.get("device")
            if self.path == "/api/device-input":
                expected_keys.add("device")
                if device not in devices:
                    raise ValueError()
                allowed_buttons = BUTTONS if device == "lab" else ({"up", "down", "left", "right", "back", "confirm"} if device == "companion" else {"up", "down", "confirm", "research", "critters"})
                allowed = {f"{button}-{edge}" for button in allowed_buttons for edge in ("down", "up")} | {"cancel", "suspend", "resume", "ready"}
                if name not in allowed:
                    raise ValueError()
            painted_ready = "ready" in command
            if painted_ready:
                expected_keys.add("ready")
                if command["ready"] is not True or not isinstance(name, str) or not name.endswith("-down"):
                    raise ValueError()
            if set(command) != expected_keys or not isinstance(name, str) or name not in EVENTS:
                raise ValueError()
            if type(revision) is not int or not 0 <= revision <= 4294967295:
                raise ValueError()
            line = (f"device {devices[device]} " if self.path == "/api/device-input" else "") + f"{name} {revision}"
            if painted_ready:
                prefix = (f"device {devices[device]} " if self.path == "/api/device-input" else "") + f"ready {revision}"
                result, _ = self.native_command([prefix, line], sandbox)
            else:
                result, _ = self.native_command([line], sandbox)
            self.reply(400 if "error" in result else 200, result)
        except StaleSandbox:
            self.reply(409, {"error": "Sandbox changed; discard pending input"})
        except (ValueError, UnicodeError):
            self.reply(400, {"error": "Invalid command body"})
        except (OSError, RuntimeError):
            self.reply(503, {"error": "Sandbox reset failed; saved world retained for recovery"} if self.path == "/api/reset" else {"error": "Native transport interrupted; activation stopped"})


def main():
    password = os.environ.get("CRITTER_DEMO_PASSWORD", "")
    server = ThreadingHTTPServer((os.environ.get("CRITTER_DEMO_BIND", "127.0.0.1"),
                                  int(os.environ.get("CRITTER_DEMO_PORT", "4180"))), Handler)
    server.release = load_release(ROOT / "release.json")
    server.password = password
    server.binary = str(Path(os.environ["CRITTER_DEMO_BINARY"]).resolve(strict=True))
    server.native = NativeProcess(server.binary, kit=True)
    access = "authentication required" if password else "anonymous shared staging access"
    print(f"Critter native presenter listening; {access}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        server.native.close()


if __name__ == "__main__":
    main()




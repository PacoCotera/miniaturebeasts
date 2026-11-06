#!/usr/bin/env python3
"""mb-login: the studio's login. Standard library only, Python 3.12.

Listens on 127.0.0.1:8791 behind the web server. The web server asks GET /check (forward_auth) before it
passes any /studio request on; /studio/login and /studio/logout come here directly.
State: sessions in $MB_LOGIN_STATE/sessions.json (mode 600, only the SHA-256 of each cookie value),
users in the file named by $MB_LOGIN_USERS (lines "user:scrypt$n$r$p$salt$hash", base64; written by mb-studio-passwd).
A session carries a fingerprint of its user's hash line, so a changed password ends every session of that user.
"""
import base64, hashlib, hmac, html, ipaddress, json, os, re, secrets, sys, threading, time
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, urlsplit

CFG = dict(
    host=os.environ.get("MB_LOGIN_HOST", "127.0.0.1"),
    port=int(os.environ.get("MB_LOGIN_PORT", "8791")),
    users=os.environ.get("MB_LOGIN_USERS", ""),   # the unit sets it (install.sh)
    state=os.environ.get("MB_LOGIN_STATE", "/var/lib/mb-login"),
    origin=os.environ.get("MB_LOGIN_ORIGIN", "https://miniaturebeasts.com"),
)
COOKIE = "mb_studio"
SESSION_SECONDS = 30 * 86400          # sliding: every use pushes the end out again
SAVE_EVERY = 3600                     # a use is written to disk at most this often per session
WINDOW, LOCK, FORGET = 15 * 60, 15 * 60, 24 * 3600   # 5 failures in WINDOW lock the address for LOCK, doubling; forgotten after FORGET
MAX_FAILS = 5
BRAKE_FAILS, BRAKE_WINDOW, BRAKE_GAP = 30, 3600, 60   # over 30 failures an hour from anywhere: one try a minute for everyone
JSON_PATHS = ("/studio/api", "/studio/events", "/studio/cas")   # answered 401 JSON, not a redirect
now = time.time                       # tests replace it
lock = threading.RLock()
hashing = threading.BoundedSemaphore(2)   # scrypt costs 32 MB and ~0.1 s: never more than two at once


def log(msg):
    print(msg, flush=True)


def scrypt(password, salt, n=2**15, r=8, p=1):
    return hashlib.scrypt(password.encode(), salt=salt, n=n, r=r, p=p, maxmem=2**27, dklen=32)


def make_hash(password, n=2**15, r=8, p=1):
    salt = secrets.token_bytes(16)
    b = lambda x: base64.b64encode(x).decode()
    return f"scrypt${n}${r}${p}${b(salt)}${b(scrypt(password, salt, n, r, p))}"


def check_hash(password, stored):
    try:
        _, n, r, p, salt, want = stored.split("$")
        got = scrypt(password, base64.b64decode(salt), int(n), int(r), int(p))
        return hmac.compare_digest(got, base64.b64decode(want))
    except Exception:
        return False


DUMMY = make_hash("not a password", 2**15)   # unknown users cost the same time as known ones


class Users:
    """The users file, re-read when it changes."""
    def __init__(self, path):
        self.path, self.stamp, self.table = path, None, {}

    def get(self, name):
        try:
            st = os.stat(self.path)
            key = (st.st_mtime_ns, st.st_size, st.st_ino)
            if key != self.stamp:
                table = {}
                for line in Path(self.path).read_text("utf-8").splitlines():
                    line = line.strip()
                    if line and not line.startswith("#") and ":" in line:
                        u, h = line.split(":", 1)
                        table[u.strip().lower()] = h.strip()
                self.table, self.stamp = table, key
        except OSError:
            self.table, self.stamp = {}, None
        return self.table.get((name or "").lower())


def fingerprint(stored):
    return hashlib.sha256(stored.encode()).hexdigest()[:24]


class Sessions:
    def __init__(self, directory):
        self.path = os.path.join(directory, "sessions.json")
        os.makedirs(directory, mode=0o700, exist_ok=True)
        self.table, self.saved = {}, 0
        try:
            self.table = json.loads(Path(self.path).read_text())
        except (OSError, ValueError):
            pass

    def save(self):
        tmp = self.path + ".tmp"
        fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w") as f:
            json.dump(self.table, f)
        os.replace(tmp, self.path)
        self.saved = now()

    @staticmethod
    def key(token):
        return hashlib.sha256(token.encode()).hexdigest()

    def start(self, user, fp):
        token = secrets.token_urlsafe(32)
        with lock:
            t = now()
            self.table = {k: v for k, v in self.table.items() if v["end"] > t}
            self.table[self.key(token)] = dict(user=user, fp=fp, end=t + SESSION_SECONDS, saved=t)
            self.save()
        return token

    def user_of(self, token, users):
        if not token:
            return None
        with lock:
            k, t = self.key(token), now()
            s = self.table.get(k)
            if not s:
                return None
            stored = users.get(s["user"])
            if s["end"] <= t or stored is None or not hmac.compare_digest(fingerprint(stored), s["fp"]):
                self.table.pop(k, None)
                self.save()
                return None
            s["end"] = t + SESSION_SECONDS
            if t - s["saved"] > SAVE_EVERY:
                s["saved"] = t
                self.save()
            return s["user"]

    def end(self, token):
        with lock:
            if self.table.pop(self.key(token), None):
                self.save()


def address_key(ip):
    """What a lockout holds: an IPv4 address, or the /64 of an IPv6 one (one line of a home or a phone network has a whole /64)."""
    a = ipaddress.ip_address(ip)
    if a.version == 6 and a.ipv4_mapped:
        return str(a.ipv4_mapped)
    return str(ipaddress.ip_network(f"{a}/64", strict=False)) if a.version == 6 else str(a)


class Guard:
    """Per-address lockout and the global brake. In memory.
    A try counts as a failure from the moment it is let in (a good password takes it back), so tries sent at the same time
    cannot all pass the check before the first of them has failed."""
    def __init__(self):
        self.addr, self.fails, self.brake_last, self.braked = {}, [], 0, False

    def admit(self, ip):
        """0 and a stamp when this try may go on (it is counted already), or the seconds to wait and None."""
        with lock:
            wait = self.blocked(ip)
            if wait:
                return wait, None
            return 0, self.fail(ip)

    def blocked(self, ip):
        """Seconds to wait before this address may try, or 0."""
        with lock:
            t = now()
            a = self.addr.get(address_key(ip))
            if a and a["until"] > t:
                return int(a["until"] - t) + 1
            self.fails = [x for x in self.fails if x > t - BRAKE_WINDOW]
            if len(self.fails) > BRAKE_FAILS:
                if not self.braked:
                    self.braked = True
                    log(f"brake on: {len(self.fails)} failures in the last hour; one try a minute for everyone")
                wait = self.brake_last + BRAKE_GAP - t
                if wait > 0:
                    return int(wait) + 1
                self.brake_last = t
            elif self.braked:
                self.braked = False
                log("brake off")
            return 0

    def fail(self, ip):
        with lock:
            t, key = now(), address_key(ip)
            self.fails.append(t)
            a = self.addr.setdefault(key, dict(times=[], level=0, until=0, last=0))
            if t - a["last"] > FORGET:
                a["level"] = 0
            a["last"] = t
            a["times"] = [x for x in a["times"] if x > t - WINDOW] + [t]
            if len(a["times"]) >= MAX_FAILS:
                secs = LOCK * 2 ** a["level"]
                a.update(until=t + secs, times=[], level=a["level"] + 1)
                log(f"lockout addr={key} seconds={secs}")
            for k in [k for k, v in self.addr.items() if v["until"] < t and v["last"] < t - FORGET]:
                del self.addr[k]
            return t

    def ok(self, ip, stamp):
        with lock:
            self.addr.pop(address_key(ip), None)
            if stamp in self.fails:
                self.fails.remove(stamp)


def safe_next(value):
    """Only a path of this site under /studio; anything else becomes /studio."""
    v = value or ""
    if not re.fullmatch(r"[\x21-\x7e]{1,2000}", v) or "\\" in v or ".." in v or "%2e" in v.lower() or "%0" in v.lower():
        return "/studio"
    u = urlsplit(v)
    if u.scheme or u.netloc or not (u.path == "/studio" or u.path.startswith("/studio/")) or u.path.startswith("//"):
        return "/studio"
    if u.path in ("/studio/login", "/studio/logout"):
        return "/studio"
    return v


PAGE = """<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>studio</title><style>
:root{color-scheme:dark;--bg:#1d232b;--panel:#23292f;--raised:#2b3038;--line:#343a42;--text:#f1ebdf;--text2:#b4b1c6;--primary:#f2671b;--on:#1a1725;--fail:#ff6b63}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--text);font:16px/1.4 system-ui,sans-serif}
main{width:min(22rem,calc(100vw - 32px));padding:28px;background:var(--panel);border:1px solid var(--line);border-radius:12px}
h1{margin:0 0 20px;font-size:1.25rem;font-weight:600}label{display:block;margin:14px 0 6px;color:var(--text2);font-size:.875rem}
input{width:100%;padding:10px 12px;background:var(--raised);color:var(--text);border:1px solid var(--line);border-radius:8px;font:inherit}
input:focus{outline:2px solid var(--primary);outline-offset:1px}button{margin-top:22px;width:100%;padding:11px;background:var(--primary);color:var(--on);border:0;border-radius:8px;font:inherit;font-weight:600;cursor:pointer}
.note{margin:16px 0 0;color:var(--fail);font-size:.875rem}
</style></head><body><main><h1>studio</h1><form method="post" action="/studio/login">
<input type="hidden" name="next" value="@NEXT@"><label for="u">user</label><input id="u" name="user" autocomplete="username" autocapitalize="none" required autofocus>
<label for="p">password</label><input id="p" name="password" type="password" autocomplete="current-password" required><button>sign in</button></form>@NOTE@</main></body></html>"""


class Handler(BaseHTTPRequestHandler):
    server_version = "mb-login"
    timeout = 10
    protocol_version = "HTTP/1.1"

    def log_message(self, *a):
        pass

    def ip(self):
        raw = self.headers.get("Cf-Connecting-IP", "").strip()
        try:
            return str(ipaddress.ip_address(raw))
        except ValueError:
            return self.client_address[0]

    def send(self, code, body=b"", ctype="text/html; charset=utf-8", headers=()):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        self.send_header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'")
        if code >= 400 or self.unread():   # a body left unread must not be taken for the next request: do not reuse the connection
            self.close_connection = True
            self.send_header("Connection", "close")
        for k, v in headers:
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def unread(self):
        """True when the request carries a body this handler has not read (a GET with one, or any chunked body)."""
        if getattr(self, "body_read", False):
            return False
        return bool(self.headers.get("Transfer-Encoding")) or self.headers.get("Content-Length", "0").strip() not in ("", "0")

    def page(self, code, nxt, note="", headers=()):
        n = f'<p class="note">{html.escape(note)}</p>' if note else ""
        self.send(code, PAGE.replace("@NEXT@", html.escape(nxt, quote=True)).replace("@NOTE@", n).encode(), headers=headers)

    def token(self):
        try:
            c = SimpleCookie(self.headers.get("Cookie", ""))
            return c[COOKIE].value if COOKIE in c else ""
        except Exception:
            return ""

    def cookie(self, value, age):
        return ("Set-Cookie", f"{COOKIE}={value}; Path=/studio; Max-Age={age}; HttpOnly; Secure; SameSite=Strict")

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        u = urlsplit(self.path)
        if u.path == "/check":
            return self.check()
        if u.path == "/studio/login":
            nxt = safe_next((parse_qs(u.query).get("next") or [""])[0])
            if self.server.sessions.user_of(self.token(), self.server.users):
                return self.send(303, headers=[("Location", nxt)])
            return self.page(200, nxt)
        self.send(404, b"not found", "text/plain")

    def check(self):
        user = self.server.sessions.user_of(self.token(), self.server.users)
        if user:
            return self.send(200, b"ok", "text/plain", [("X-Studio-User", user)])
        uri = self.headers.get("X-Forwarded-Uri", "/studio")
        if urlsplit(uri).path.startswith(JSON_PATHS):
            body = json.dumps(dict(error="sign in", login="/studio/login")).encode()
            return self.send(401, body, "application/json")
        self.send(302, headers=[("Location", "/studio/login?next=" + quote(safe_next(uri), safe=""))])

    def form(self):
        if self.headers.get("Origin") != CFG["origin"]:
            self.send(403, b"forbidden", "text/plain")
            return None
        if self.headers.get("Transfer-Encoding"):   # only a counted body; anything else would be read as the next request
            self.send(411, b"length required", "text/plain")
            return None
        try:
            n = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            n = -1
        if not 0 <= n <= 4096:
            self.send(413, b"too large", "text/plain")
            return None
        data = self.rfile.read(n)
        self.body_read = True
        return {k: v[0] for k, v in parse_qs(data.decode("utf-8", "replace"), keep_blank_values=True).items()}

    def do_POST(self):
        path = urlsplit(self.path).path
        if path not in ("/studio/login", "/studio/logout"):
            return self.send(404, b"not found", "text/plain")
        f = self.form()
        if f is None:
            return
        if path == "/studio/logout":
            self.server.sessions.end(self.token())
            return self.send(303, headers=[("Location", "/studio/login"), self.cookie("", 0)])
        ip, nxt = self.ip(), safe_next(f.get("next"))
        g = self.server.guard
        wait, stamp = g.admit(ip)
        if wait:
            log(f"refused addr={ip} wait={wait}")
            return self.page(429, nxt, f"Too many tries. Try again in {max(1, wait // 60)} min.", [("Retry-After", str(wait))])
        name, password = f.get("user", ""), f.get("password", "")
        stored = self.server.users.get(name)
        with hashing:
            good = check_hash(password, stored or DUMMY) and stored is not None
        if good:
            g.ok(ip, stamp)
            self.server.sessions.end(self.token())   # a session that came with the form ends: every login gets a new one
            token = self.server.sessions.start(name.lower(), fingerprint(stored))
            log(f"login user={name.lower()} addr={ip}")
            return self.send(303, headers=[("Location", nxt), self.cookie(token, SESSION_SECONDS)])
        log(f"failure user={name.lower() if stored else '(unknown)'} addr={ip}")
        self.page(401, nxt, "That user and password do not match.")


class Server(ThreadingHTTPServer):
    daemon_threads = True
    request_queue_size = 128

    def __init__(self, addr=None):
        super().__init__(addr or (CFG["host"], CFG["port"]), Handler)
        self.users, self.sessions, self.guard = Users(CFG["users"]), Sessions(CFG["state"]), Guard()


if __name__ == "__main__":
    if not CFG["users"]:
        sys.exit("mb-login: MB_LOGIN_USERS (the users file) is not set")
    s = Server()
    log(f"mb-login listening on {CFG['host']}:{CFG['port']}")
    try:
        s.serve_forever()
    except KeyboardInterrupt:
        pass

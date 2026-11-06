"""The shipped Caddyfile, run by the real Caddy in front of a stand-in login and a stand-in studio: what reaches the studio, with which headers.
Skipped without `caddy` on the path. Run: python3 -m unittest discover -s ops/sandbox/tests -v (CI installs Caddy from Caddy's own apt repository;
on the web server it runs against the installed Caddy on free local ports, with its admin endpoint off, and touches nothing of the live one)."""
import http.client, os, shutil, socket, subprocess, tempfile, threading, time, unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

REAL = Path(__file__).resolve().parent.parent / "Caddyfile"
SPOOF = {"X-Studio-User": "mallory", "Cf-Connecting-IP": "192.0.2.66", "X-Forwarded-For": "192.0.2.66"}


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class Recorder(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *a):
        pass

    def answer(self, code, headers=(), body=b"ok"):
        self.send_response(code)
        for k, v in headers:
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def handle_any(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n:
            self.rfile.read(n)
        self.server.hits.append((self.command, self.path, self.headers))
        self.server.reply(self)

    do_GET = do_POST = do_PATCH = do_PUT = do_DELETE = do_OPTIONS = do_HEAD = handle_any


def login_reply(h):
    if h.path.split("?")[0] == "/check":
        if "mb_studio=good" in [c.strip() for c in (h.headers.get("Cookie") or "").split(";")]:
            return h.answer(200, [("X-Studio-User", "paco")])
        return h.answer(302, [("Location", "/studio/login"), ("Cache-Control", "no-store")], b"")
    h.answer(200, [("Cache-Control", "no-store")], b"login")


def studio_reply(h):
    p = h.path
    if "/assets/" in p:
        return h.answer(200, [("Cache-Control", "private, max-age=31536000, immutable")])
    if "/page" in p:
        return h.answer(200, [("Cache-Control", "no-cache")])
    if "/public" in p:
        return h.answer(200, [("Cache-Control", "max-age=3600")])
    if "/cookie" in p:
        return h.answer(200, [("Set-Cookie", "mb_studio=planted; Path=/")])
    h.answer(200)


@unittest.skipUnless(shutil.which("caddy"), "no caddy on the path")
class Routes(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dir = Path(tempfile.mkdtemp())
        servers = []
        for reply in (login_reply, studio_reply):
            s = ThreadingHTTPServer(("127.0.0.1", 0), Recorder)
            s.hits, s.reply, s.daemon_threads = [], reply, True
            threading.Thread(target=s.serve_forever, daemon=True).start()
            servers.append(s)
        cls.login, cls.studio = servers
        (cls.dir / "root" / "current").mkdir(parents=True)
        (cls.dir / "root" / "current" / "build.json").write_text("{}")
        (cls.dir / "root" / "current" / "index.html").write_text("<p>site</p>")
        cls.port = free_port()
        text = REAL.read_text()
        assert text.count(":80 {") == 1 and "127.0.0.1:8791" in text
        text = "{\n\tadmin off\n}\n" + text.replace(":80 {", f":{cls.port} {{").replace("127.0.0.1:8791", f"127.0.0.1:{cls.login.server_address[1]}")
        (cls.dir / "Caddyfile").write_text(text)
        env = dict(os.environ, MB_ROOT=str(cls.dir / "root"), MB_STUDIO=f"127.0.0.1:{cls.studio.server_address[1]}",
                   HOME=str(cls.dir), XDG_CONFIG_HOME=str(cls.dir / "config"), XDG_DATA_HOME=str(cls.dir / "data"))
        cls.log = open(cls.dir / "caddy.log", "w")
        cls.caddy = subprocess.Popen(["caddy", "run", "--config", str(cls.dir / "Caddyfile"), "--adapter", "caddyfile"],
                                     env=env, stdout=cls.log, stderr=subprocess.STDOUT)
        for _ in range(100):
            try:
                socket.create_connection(("127.0.0.1", cls.port), timeout=0.2).close()
                break
            except OSError:
                if cls.caddy.poll() is not None:
                    break
                time.sleep(0.1)
        if cls.caddy.poll() is not None:
            cls.tearDownClass()
            raise RuntimeError("caddy did not start:\n" + (cls.dir / "caddy.log").read_text())

    @classmethod
    def tearDownClass(cls):
        cls.caddy.terminate()
        try:
            cls.caddy.wait(10)
        except subprocess.TimeoutExpired:
            cls.caddy.kill()
        cls.log.close()
        for s in (cls.login, cls.studio):
            s.shutdown(); s.server_close()
        shutil.rmtree(cls.dir, True)

    def setUp(self):
        self.login.hits.clear(); self.studio.hits.clear()

    def req(self, path, method="GET", headers=None, body=None):
        c = http.client.HTTPConnection("127.0.0.1", self.port, timeout=10)
        c.putrequest(method, path, skip_accept_encoding=True)
        for k, v in (headers or {}).items():
            c.putheader(k, v)
        if body is not None:
            c.putheader("Content-Length", str(len(body)))
        c.endheaders(body)
        r = c.getresponse(); r.read(); c.close()
        return r

    TRICKS = ["/studio", "/studio/", "/studio/x", "/studio/api/species", "/studio/events", "/studio/cas/ab.png", "/studio/assets/app.js",
              "/STUDIO/x", "/Studio/Api/species", "//studio/x", "/studio//x", "///studio/api/x", "/x/../studio/x", "/studio/./x",
              "/studio/%2e%2e/studio/x", "/studio%2fx", "/studio%2Fapi%2Fspecies", "/%73tudio/x", "/studio/login/../x",
              "/studio/login%2f..%2fx", "/studio/logout/../x", "/studio/logout/", "/studio/x?/studio/login", "/studio/x#/studio/login",
              "/studio/%00", "/studio/x;/studio/login"]

    def test_without_a_session_nothing_reaches_the_studio(self):
        for path in self.TRICKS:
            for method in ("GET", "HEAD", "POST", "PATCH", "OPTIONS"):
                for cookie in (None, "mb_studio=bad", "mb_studio=good-not"):
                    h = dict(SPOOF)
                    for name in ("x-studio-user", "X-STUDIO-USER"):
                        h[name] = "mallory"
                    if cookie:
                        h["Cookie"] = cookie
                    self.req(path, method, h, b"{}" if method in ("POST", "PATCH") else None)
                    self.assertEqual(self.studio.hits, [], (path, method, cookie))

    def test_the_login_routes_go_to_the_login_only(self):
        for path in ("/studio/login", "/studio/login?next=/studio/x", "/studio/loginx", "/STUDIO/LOGIN", "/studio/logout"):
            self.req(path, "GET", SPOOF)
            self.req(path, "POST", dict(SPOOF, Origin="https://miniaturebeasts.com"), b"user=a&password=b")
        self.assertEqual(self.studio.hits, [])
        self.assertTrue(any(p.startswith("/studio/login") for _, p, _ in self.login.hits))
        self.assertFalse(any(p == "/check" for _, p, _ in self.login.hits))

    def test_with_a_session_the_studio_sees_one_user_and_no_cookie(self):
        for path in ("/studio/x", "/STUDIO/x", "//studio/api/x"):
            self.studio.hits.clear()
            r = self.req(path, "GET", dict(SPOOF, Cookie="mb_studio=good; other=1", **{"x-studio-user": "mallory"}))
            self.assertEqual(r.status, 200, path)
            self.assertEqual(len(self.studio.hits), 1, path)
            h = self.studio.hits[0][2]
            self.assertEqual(h.get_all("X-Studio-User"), ["paco"], path)
            self.assertIsNone(h.get("Cookie"), path)
        check = [h for _, p, h in self.login.hits if p == "/check"][-1]
        self.assertIn("mb_studio=good", check.get("Cookie"))          # the login still sees it

    def test_no_studio_answer_may_be_kept_by_a_shared_cache(self):
        want = {"/studio/assets/app.js": "private, max-age=31536000, immutable", "/studio/page": "private, no-cache",
                "/studio/api/x.png": "private, no-cache", "/studio/public.css": "private, max-age=3600", "/studio/cookie.js": "private, no-cache"}
        for path, value in want.items():
            r = self.req(path, "GET", {"Cookie": "mb_studio=good"})
            self.assertEqual((r.status, r.headers.get_all("Cache-Control")), (200, [value]), path)
            self.assertIsNone(r.getheader("Set-Cookie"), path)
            self.assertEqual(r.getheader("X-Robots-Tag"), "noindex", path)
        r = self.req("/studio/assets/app.js", "GET")                  # the login's refusal keeps its own no-store
        self.assertEqual((r.status, r.headers.get_all("Cache-Control")), (302, ["no-store"]))

    def test_the_site_stays_static(self):
        r = self.req("/build.json")
        self.assertEqual((r.status, r.getheader("Cache-Control")), (200, "no-store"))
        self.assertEqual(self.req("/studiox", "GET", SPOOF).status, 404)
        self.assertEqual(self.req("/studio.html", "GET", SPOOF).status, 404)
        self.assertEqual(self.studio.hits, [])


if __name__ == "__main__":
    unittest.main()

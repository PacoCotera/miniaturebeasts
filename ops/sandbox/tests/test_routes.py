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
        return h.answer(302, [("Location", "/admin/login"), ("Cache-Control", "no-store")], b"")
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
        game = cls.dir / "root" / "current" / "play"
        (game / "ui" / "assets" / "masters").mkdir(parents=True)
        (game / "ui" / "assets" / "masters" / "m.png").write_text("png")
        (game / "other.html").write_text("<p>other</p>")
        (game / "species" / "frames" / "language").mkdir(parents=True)
        (game / "species" / "frames" / "language" / "index.json").write_text("{}")
        (game / "assets").mkdir()
        (game / "assets" / "app-0a1b2c3d.js").write_text("//js")
        for d, t in (("test", "test-secret"), ("caddy", "caddy-secret"), ("station", "station-page"), ("exploration", "companion-page"), (".", "play-page")):
            (game / d).mkdir(parents=True, exist_ok=True)
            (game / d / "index.html").write_text(t)
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

    TRICKS = ["/studio", "/studio/", "/studio/x", "/studio/api/species", "/studio/events", "/studio/cas/ab.png", "/studio/assets/app.js", "/studio/team", "/studio/team.json",
              "/STUDIO/x", "/Studio/Api/species", "//studio/x", "/studio//x", "///studio/api/x", "/x/../studio/x", "/studio/./x",
              "/studio/%2e%2e/studio/x", "/studio%2fx", "/studio%2Fapi%2Fspecies", "/%73tudio/x", "/studio/login/../x",
              "/studio/login%2f..%2fx", "/studio/logout/../x", "/studio/logout/", "/studio/x?/studio/login", "/studio/x#/studio/login",
              "/studio/%00", "/studio/x;/studio/login",
              "/admin", "/admin/", "/admin/x", "/admin/team", "/admin/team/", "/admin/team/x", "/admin/team.json", "/admin/team-coord.json", "/admin/team-doc/rules/1",
              "/ADMIN/TEAM", "/Admin/Team.json", "//admin/team", "/admin//team", "/x/../admin/team", "/admin/./team", "/admin/team/%2e%2e/team", "/admin%2fteam", "/%61dmin/team",
              "/admin/login/../team", "/admin/login%2f..%2fteam", "/admin/logout/../team", "/admin/team?/admin/login", "/admin/team;/admin/login", "/admin/team%00", "/admin/workbench/x", "/admin/notes",
              "/admin/book", "/admin/book/", "/admin/book/book.css", "/admin/book/summary.json", "/admin/bugs", "/admin/bugs/summary.json", "/ADMIN/BOOK", "/admin/book/../book"]

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
        for path in ("/admin/login", "/admin/login?next=/admin/x", "/admin/loginx", "/ADMIN/LOGIN", "/admin/logout"):
            self.req(path, "GET", SPOOF)
            self.req(path, "POST", dict(SPOOF, Origin="https://miniaturebeasts.com"), b"user=a&password=b")
        self.assertEqual(self.studio.hits, [])
        self.assertTrue(any(p.startswith("/admin/login") for _, p, _ in self.login.hits))
        self.assertFalse(any(p == "/check" for _, p, _ in self.login.hits))

    def test_with_a_session_the_studio_sees_one_user_and_no_cookie_and_its_own_prefix(self):
        for path, upstream in (("/admin/team", "/studio/team"), ("/ADMIN/team", "/studio/team"), ("//admin/team.json", "/studio/team.json"),
                               ("/admin/team-doc/rules/1?x=1", "/studio/team-doc/rules/1?x=1")):
            self.studio.hits.clear()
            r = self.req(path, "GET", dict(SPOOF, Cookie="mb_studio=good; other=1", **{"x-studio-user": "mallory"}))
            self.assertEqual(r.status, 200, path)
            self.assertEqual(len(self.studio.hits), 1, path)
            self.assertEqual(self.studio.hits[0][1], upstream, path)
            h = self.studio.hits[0][2]
            self.assertEqual(h.get_all("X-Studio-User"), ["paco"], path)
            self.assertIsNone(h.get("Cookie"), path)
        check = [h for _, p, h in self.login.hits if p == "/check"][-1]
        self.assertIn("mb_studio=good", check.get("Cookie"))          # the login still sees it

    def test_no_studio_answer_may_be_kept_by_a_shared_cache(self):
        want = {"/admin/team/assets/app.js": "private, max-age=31536000, immutable", "/admin/team/page": "private, no-cache",
                "/admin/team/api/x.png": "private, no-cache", "/admin/team/public.css": "private, max-age=3600", "/admin/team/cookie.js": "private, no-cache"}
        for path, value in want.items():
            r = self.req(path, "GET", {"Cookie": "mb_studio=good"})
            self.assertEqual((r.status, r.headers.get_all("Cache-Control")), (200, [value]), path)
            self.assertIsNone(r.getheader("Set-Cookie"), path)
            self.assertEqual(r.getheader("X-Robots-Tag"), "noindex", path)
        r = self.req("/admin/team/assets/app.js", "GET")              # the login's refusal keeps its own no-store
        self.assertEqual((r.status, r.headers.get_all("Cache-Control")), (302, ["no-store"]))

    def test_the_site_stays_static(self):
        r = self.req("/build.json")
        self.assertEqual((r.status, r.getheader("Cache-Control")), (200, "no-store"))
        for p in ("/studiox", "/studio.html", "/adminx", "/admin.html"):
            self.assertEqual(self.req(p, "GET", SPOOF).status, 404, p)
        self.assertEqual(self.studio.hits, [])

    def where(self, path, cookie=None):
        r = self.req(path, "GET", {"Cookie": cookie} if cookie else None)
        return r.status, r.getheader("Location")

    def test_nothing_is_at_the_old_addresses_and_the_team_tools_are_not_public(self):
        for p in ("/sandbox", "/sandbox/", "/sandbox/play/", "/sandbox/station/", "/sandbox/station/?embed&test", "/sandbox/workbench/", "/sandbox/test/",
                  "/studio", "/studio/", "/studio/x", "/studio/api/species", "/STUDIO/x", "/studio/team", "/studio/team/",
                  "/play/test/", "/play/test", "/play/caddy/index.html", "/play//test/", "/play/./test/", "/play/x/../test/"):
            self.assertEqual(self.where(p), (404, None), p)
            self.assertEqual(self.where(p, "mb_studio=good"), (404, None), p)
        self.assertEqual(self.where("/play"), (301, "/play/"))
        self.assertEqual(self.where("/play/station"), (301, "/play/station/"))
        for p in ("/play/", "/play/station/", "/play/other.html", "/play/assets/app-0a1b2c3d.js"):
            self.assertEqual(self.where(p)[0], 200, p)
        # the species frames are game data the Station loads: public
        self.assertEqual(self.where("/play/species/frames/language/index.json")[0], 200)
        self.assertEqual(self.where("/admin/test"), (302, "/admin/test/"))

    def test_the_old_field_test_page_is_gone_and_the_companion_frame_stays(self):
        # owner 11-18: "don't keep old stale URLs that nobody uses, just delete it": no redirect, not found
        for p in ("/play/exploration/", "/play/exploration", "/play/exploration/index.html", "/PLAY/Exploration/", "/play/exploration/?"):
            self.assertEqual(self.where(p), (404, None), p)
        for p in ("/play/exploration/?embed", "/play/exploration/?embed&seed=7", "/play/exploration/?observer", "/play/exploration/?test", "/play/exploration/index.html?embed"):
            self.assertEqual(self.where(p), (200, None), p)

    def test_the_admin_paths_need_the_login_and_the_index_is_the_team_page_for_now(self):
        good = "mb_studio=good"
        for p in ("/admin", "/admin/", "/admin/x", "/admin/team", "/admin/test/", "/admin/notes"):
            self.assertEqual(self.where(p), (302, "/admin/login"), p)
        for p in ("/admin", "/admin/"):
            self.assertEqual(self.where(p, good), (302, "/admin/team"), p)
        self.assertEqual(self.where("/admin/nothing-here", good)[0], 404)
        self.assertEqual(self.where("/admin/team", good)[0], 200)

    def test_the_book_page_and_the_two_index_summaries_need_the_login(self):
        for p in ("/admin/book", "/admin/book/", "/admin/book/book.css", "/admin/book/summary.json", "/admin/bugs", "/admin/bugs/summary.json"):
            self.assertEqual(self.where(p), (302, "/admin/login"), p)

    def test_the_test_page_is_only_for_a_session_and_the_workbench_is_gone(self):
        r = self.req("/admin/test/", "GET", {"Cookie": "mb_studio=good"})
        self.assertEqual((r.status, r.getheader("Cache-Control"), r.getheader("X-Robots-Tag")), (200, "private, no-cache", "noindex"))
        self.assertEqual(self.where("/admin/workbench/", "mb_studio=good")[0], 404)
        self.assertEqual(self.where("/admin/workbench", "mb_studio=good")[0], 404)
        self.assertEqual(self.studio.hits, [])
        for secret, paths in ((b"test-secret", ("/play/test/", "/play/test/index.html", "/play/Test/", "/admin/test/", "/admin/test/../test/", "/%61dmin/test/")),):
            for path in paths:
                c = http.client.HTTPConnection("127.0.0.1", self.port, timeout=10)
                c.request("GET", path); r = c.getresponse(); body = r.read(); c.close()
                self.assertNotIn(secret, body, path)

    def test_a_hashed_file_is_kept_a_year_and_every_other_play_path_is_not(self):
        # the real server's answers: the generic /play/* no-cache must not win over a hashed master's immutable (it did, by header order)
        cc = lambda p: (lambda r: (r.status, r.headers.get_all("Cache-Control")))(self.req(p))
        self.assertEqual(cc("/play/ui/assets/masters/m.png?v=0123456789ab"), (200, ["public, max-age=31536000, immutable"]))
        self.assertEqual(cc("/play/ui/assets/masters/m.png"), (200, ["no-cache"]), "no hash in the name: not kept")
        self.assertEqual(cc("/play/assets/app-0a1b2c3d.js"), (200, ["public, max-age=31536000, immutable"]))
        self.assertEqual(cc("/play/other.html?v=0123456789ab"), (200, ["no-cache"]), "a version on another path is not a master")
        self.assertEqual(cc("/play/other.html"), (200, ["no-cache"]))
        self.assertEqual(cc("/play/"), (200, ["no-cache"]))


class CaddyfileText(unittest.TestCase):
    """Runs without Caddy, and only reads the text: the order the cache headers are written in matters (Caddy runs `header` blocks outside a `route` in its own order),
    so the hashed master's line must sit in the same `route` as /play/*'s no-cache, after it. The real answer is checked by Routes above, where Caddy is installed."""

    def test_the_hashed_header_follows_the_play_no_cache_in_one_route(self):
        text = REAL.read_text()
        a, b = text.index('header /play/* Cache-Control "no-cache"'), text.index("header @hashed Cache-Control")
        self.assertLess(a, b)
        route = text.rindex("route {", 0, a)
        self.assertGreater(route, text.index("handle {"), "the file's own route, not the studio's")
        self.assertNotIn("\n\t}\n", text[route:b].replace("\n\t\t}\n", ""), "the route is not closed between the two lines")


if __name__ == "__main__":
    unittest.main()

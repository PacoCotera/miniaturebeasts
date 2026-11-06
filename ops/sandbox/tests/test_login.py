"""Tests of mb-login and mb-studio-passwd. Run: python3 -m unittest discover -s ops/sandbox/tests -v"""
from pathlib import Path
import http.client, importlib.machinery, importlib.util, io, os, shutil, socket, stat, sys, tempfile, threading, time, unittest
from contextlib import redirect_stdout
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
LOGIN_DIR = os.path.join(HERE, "..", "login")
sys.path.insert(0, LOGIN_DIR)
import mb_login as L

loader = importlib.machinery.SourceFileLoader("mb_studio_passwd", os.path.join(LOGIN_DIR, "mb-studio-passwd"))
spec = importlib.util.spec_from_loader("mb_studio_passwd", loader)
P = importlib.util.module_from_spec(spec)
loader.exec_module(P)

ORIGIN = "https://miniaturebeasts.com"
PASSWORD = "correct horse battery"
CHEAP = dict(n=2**10)   # the hash records its own cost; tests use a cheap one


class Clock:
    def __init__(self):
        self.t = 1_800_000_000.0

    def __call__(self):
        return self.t


class Base(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.users_path = os.path.join(self.dir, "studio-users")
        self.write_users(PASSWORD)
        self.clock = Clock()
        self.out = io.StringIO()
        patches = [mock.patch.object(L, "now", self.clock), mock.patch.object(L, "log", lambda m: print(m, file=self.out))]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)
        self.addCleanup(shutil.rmtree, self.dir, True)
        self.servers = []
        self.start()

    def write_users(self, password):
        Path(self.users_path).write_text("paco:" + L.make_hash(password, **CHEAP) + "\n")

    def start(self):
        for s in self.servers:
            s.shutdown(); s.server_close()
        L.CFG.update(users=self.users_path, state=os.path.join(self.dir, "state"))
        srv = L.Server(("127.0.0.1", 0))
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        self.servers = [srv]
        self.addCleanup(lambda: (srv.shutdown(), srv.server_close()))
        self.port = srv.server_address[1]

    def req(self, method, path, body=None, headers=None):
        c = http.client.HTTPConnection("127.0.0.1", self.port, timeout=10)
        h = dict(headers or {})
        if body is not None:
            body = "&".join(f"{k}={v}" for k, v in body.items()).encode()
            h["Content-Type"] = "application/x-www-form-urlencoded"
        c.request(method, path, body=body, headers=h)
        r = c.getresponse(); data = r.read(); c.close()
        return r, data

    def login(self, user="paco", password=PASSWORD, ip="198.51.100.7", origin=ORIGIN, nxt=None):
        h = {"Cf-Connecting-IP": ip}
        if origin:
            h["Origin"] = origin
        b = dict(user=user, password=password)
        if nxt is not None:
            b["next"] = nxt
        return self.req("POST", "/studio/login", b, h)

    def cookie_of(self, r):
        return r.getheader("Set-Cookie").split(";")[0]

    def session(self):
        r, _ = self.login()
        self.assertEqual(r.status, 303)
        return self.cookie_of(r)

    def check(self, cookie=None, uri="/studio/S20/shape"):
        h = {"X-Forwarded-Uri": uri}
        if cookie:
            h["Cookie"] = cookie
        return self.req("GET", "/check", headers=h)


class Login(Base):
    def test_good_login_sets_a_strict_cookie_and_opens_check(self):
        r, _ = self.login()
        self.assertEqual(r.status, 303)
        self.assertEqual(r.getheader("Location"), "/studio")
        c = r.getheader("Set-Cookie")
        self.assertRegex(c, r"^mb_studio=[A-Za-z0-9_-]{40,}; ")
        for flag in ("Path=/studio", "HttpOnly", "Secure", "SameSite=Strict", "Max-Age=2592000"):
            self.assertIn(flag, c)
        r, _ = self.check(self.cookie_of(r))
        self.assertEqual((r.status, r.getheader("X-Studio-User")), (200, "paco"))

    def test_wrong_password_and_unknown_user_look_the_same(self):
        a, ba = self.login(password="nope")
        b, bb = self.login(user="nobody")
        self.assertEqual((a.status, b.status), (401, 401))
        self.assertEqual(ba, bb)
        self.assertIsNone(a.getheader("Set-Cookie"))

    def test_check_without_a_session(self):
        r, _ = self.check(uri="/studio/S20/shape?sel=tail")
        self.assertEqual(r.status, 302)
        self.assertEqual(r.getheader("Location"), "/studio/login?next=%2Fstudio%2FS20%2Fshape%3Fsel%3Dtail")
        for path in ("/studio/api/species", "/studio/events", "/studio/cas/ab.png"):
            r, body = self.check(uri=path)
            self.assertEqual(r.status, 401)
            self.assertEqual(r.getheader("Content-Type"), "application/json")
            self.assertNotIn(b"token", body)
        self.assertEqual(self.req("GET", "/check")[0].status, 302)

    def test_login_page_words(self):
        r, body = self.req("GET", "/studio/login")
        text = body.decode()
        self.assertEqual(r.status, 200)
        for word in (">user<", ">password<", ">sign in<"):
            self.assertIn(word, text)

    def test_origin_must_match_on_login_and_logout(self):
        for origin in (None, "https://evil.example", "http://miniaturebeasts.com", ORIGIN + ".evil.example"):
            r, _ = self.login(origin=origin)
            self.assertEqual(r.status, 403, origin)
            self.assertIsNone(r.getheader("Set-Cookie"))
            h = {"Cookie": self.session()}
            if origin:
                h["Origin"] = origin
            r, _ = self.req("POST", "/studio/logout", {}, h)
            self.assertEqual(r.status, 403, origin)
            self.assertEqual(self.check(h["Cookie"])[0].status, 200)

    def test_logout_ends_the_session(self):
        c = self.session()
        r, _ = self.req("POST", "/studio/logout", {}, {"Cookie": c, "Origin": ORIGIN})
        self.assertEqual(r.status, 303)
        self.assertIn("Max-Age=0", r.getheader("Set-Cookie"))
        self.assertEqual(self.check(c)[0].status, 302)

    def test_next_open_redirect_refused(self):
        bad = ["https://evil.example/studio", "//evil.example/studio", "/\\evil.example", "/other", "javascript:alert(1)", "/studio/../x",
               "/studio%2f..%2f", "/studiox", "/studio/%0d%0aSet-Cookie:x=1", "/studio/login", "http://x", "studio", "/studio\r\nX: y", " /studio"]
        for n in bad:
            self.assertEqual(L.safe_next(n), "/studio", n)
        for n in bad[:8]:
            r, _ = self.login(nxt=n.replace("\\", "%5C").replace(" ", "%20"))
            self.assertEqual(r.getheader("Location"), "/studio", n)
        r, _ = self.login(nxt="%2Fstudio%2FS20%2Fshape%3Fsel%3Dtail")
        self.assertEqual(r.getheader("Location"), "/studio/S20/shape?sel=tail")
        r, _ = self.check(uri="//evil.example/studio")
        self.assertEqual(r.getheader("Location"), "/studio/login?next=%2Fstudio")

    def test_password_never_logged(self):
        probe = "zq-secret-Pw-1234567"
        self.login(password=probe); self.login(user=probe, password=probe); self.login()
        log = self.out.getvalue()
        self.assertNotIn(probe, log)
        self.assertNotIn(PASSWORD, log)
        self.assertIn("failure user=(unknown) addr=198.51.100.7", log)
        self.assertIn("login user=paco addr=198.51.100.7", log)

    def test_oversize_body_refused(self):
        r, _ = self.req("POST", "/studio/login", {"user": "a", "password": "x" * 5000}, {"Origin": ORIGIN})
        self.assertEqual(r.status, 413)


class Lockouts(Base):
    def fail(self, ip="203.0.113.5", n=1):
        return [self.login(password="wrong", ip=ip)[0].status for _ in range(n)]

    def test_five_failures_lock_the_address_and_it_doubles(self):
        self.assertEqual(self.fail(n=5), [401] * 5)
        self.assertIn("lockout addr=203.0.113.5 seconds=900", self.out.getvalue())
        r, _ = self.login(ip="203.0.113.5")           # the right password is refused while locked
        self.assertEqual(r.status, 429)
        self.assertTrue(0 < int(r.getheader("Retry-After")) <= 901)
        self.assertEqual(self.login(ip="203.0.113.6")[0].status, 303)   # another address is untouched
        self.clock.t += 901
        self.assertEqual(self.fail(n=5), [401] * 5)   # the second lock is twice as long
        self.assertIn("seconds=1800", self.out.getvalue())
        self.clock.t += 901
        self.assertEqual(self.login(ip="203.0.113.5")[0].status, 429)
        self.clock.t += 900
        self.assertEqual(self.login(ip="203.0.113.5")[0].status, 303)

    def test_failures_older_than_fifteen_minutes_do_not_add_up(self):
        for _ in range(4):
            self.fail()
        self.clock.t += 16 * 60
        self.assertEqual(self.fail(n=4), [401] * 4)
        self.assertEqual(self.login(ip="203.0.113.5")[0].status, 303)

    def test_cf_connecting_ip_is_the_address_and_junk_falls_back(self):
        self.fail(ip="203.0.113.5", n=5)
        self.assertEqual(self.login(ip="2001:db8::1")[0].status, 303)
        r, _ = self.req("POST", "/studio/login", dict(user="paco", password="wrong"), {"Origin": ORIGIN, "Cf-Connecting-IP": "not an ip"})
        self.assertEqual(r.status, 401)
        self.assertIn("addr=127.0.0.1", self.out.getvalue())

    def test_global_brake(self):
        for i in range(31):
            self.assertEqual(self.login(password="wrong", ip=f"192.0.2.{i + 1}")[0].status, 401)
        self.assertEqual(self.login(password="wrong", ip="192.0.2.100")[0].status, 401)   # the first try after the brake is allowed
        self.assertIn("brake on", self.out.getvalue())
        self.assertEqual(self.login(ip="192.0.2.101")[0].status, 429)                      # then one a minute, for everyone
        self.clock.t += 61
        self.assertEqual(self.login(ip="192.0.2.101")[0].status, 303)
        self.assertEqual(self.login(ip="192.0.2.102")[0].status, 429)
        self.clock.t += 3600
        self.assertEqual(self.login(ip="192.0.2.102")[0].status, 303)
        self.assertEqual(self.login(ip="192.0.2.103")[0].status, 303)
        self.assertIn("brake off", self.out.getvalue())


class Attacks(Base):
    """What an attacker on the internet can send through the tunnel."""
    def slow_hash(self, seconds=0.2):
        real = L.check_hash
        def slow(password, stored):
            time.sleep(seconds)
            return real(password, stored)
        p = mock.patch.object(L, "check_hash", slow); p.start(); self.addCleanup(p.stop)

    def burst(self, ips, password="wrong"):
        out = [None] * len(ips)
        def one(i):
            out[i] = self.login(password=password, ip=ips[i])[0].status
        ts = [threading.Thread(target=one, args=(i,)) for i in range(len(ips))]
        for t in ts: t.start()
        for t in ts: t.join()
        return out

    def test_concurrent_tries_from_one_address_stop_at_five(self):
        self.slow_hash()
        out = self.burst(["203.0.113.9"] * 20)
        self.assertEqual((out.count(401), out.count(429)), (5, 15), out)

    def test_concurrent_tries_from_many_addresses_stop_at_the_brake(self):
        self.slow_hash(0.1)
        out = self.burst([f"192.0.2.{i + 1}" for i in range(60)])
        self.assertEqual(out.count(None), 0, out)                 # every connection is taken (a deep enough listen queue)
        self.assertEqual(out.count(401), L.BRAKE_FAILS + 2, out)  # as one after another: 31, then the brake's first try
        self.assertEqual(out.count(429), 60 - L.BRAKE_FAILS - 2, out)

    def test_a_good_password_takes_its_try_back(self):
        for _ in range(4):
            self.login(password="wrong", ip="203.0.113.10")
        self.assertEqual(self.login(ip="203.0.113.10")[0].status, 303)
        self.assertEqual(self.login(ip="203.0.113.10")[0].status, 303)
        g = self.servers[0].guard
        self.assertEqual(len(g.fails), 4)        # the failures still count toward the brake, the good tries do not

    def test_one_ipv6_64_is_one_address(self):
        for i in range(5):
            self.assertEqual(self.login(password="wrong", ip=f"2001:db8:1:2::{i + 1:x}")[0].status, 401)
        self.assertEqual(self.login(ip="2001:db8:1:2:ffff::9")[0].status, 429)
        self.assertEqual(self.login(ip="2001:db8:1:3::1")[0].status, 303)
        self.assertIn("lockout addr=2001:db8:1:2::/64", self.out.getvalue())
        for i in range(5):
            self.login(password="wrong", ip="::ffff:198.51.100.20")
        self.assertEqual(self.login(ip="198.51.100.20")[0].status, 429)   # a mapped IPv4 address is that IPv4 address

    def raw(self, data):
        s = socket.create_connection(("127.0.0.1", self.port), timeout=3)
        s.sendall(data)
        got = b""
        try:
            while True:
                b = s.recv(65536)
                if not b:
                    break
                got += b
        except socket.timeout:
            got += b"<still open>"
        s.close()
        return got

    def test_a_body_left_unread_cannot_smuggle_a_request(self):
        inner = b"GET /check HTTP/1.1\r\nHost: x\r\nX-Forwarded-Uri: /studio/x\r\n\r\n"
        for head in (b"GET /studio/login HTTP/1.1\r\nHost: x\r\nContent-Length: %d\r\n\r\n" % len(inner),
                     b"GET /nothing HTTP/1.1\r\nHost: x\r\nContent-Length: %d\r\n\r\n" % len(inner)):
            got = self.raw(head + inner)
            self.assertEqual(got.count(b"HTTP/1.1 "), 1, got)
            self.assertNotIn(b"<still open>", got)

    def test_a_chunked_post_is_refused_and_closes(self):
        c = self.session()
        body = b"5\r\nuser=\r\n0\r\n\r\nGET /check HTTP/1.1\r\nHost: x\r\n\r\n"
        got = self.raw(b"POST /studio/logout HTTP/1.1\r\nHost: x\r\nOrigin: " + ORIGIN.encode() + b"\r\nCookie: " + c.encode()
                       + b"\r\nTransfer-Encoding: chunked\r\n\r\n" + body)
        self.assertTrue(got.startswith(b"HTTP/1.1 411"), got)
        self.assertEqual(got.count(b"HTTP/1.1 "), 1, got)
        self.assertEqual(self.check(c)[0].status, 200)           # nothing was done

    def test_a_login_ends_the_session_it_came_with(self):
        old = self.session()
        r, _ = self.req("POST", "/studio/login", dict(user="paco", password=PASSWORD), {"Origin": ORIGIN, "Cookie": old, "Cf-Connecting-IP": "198.51.100.7"})
        self.assertEqual(r.status, 303)
        self.assertNotEqual(self.cookie_of(r), old)
        self.assertEqual(self.check(old)[0].status, 302)
        self.assertEqual(self.check(self.cookie_of(r))[0].status, 200)

    def test_spoofed_headers_change_nothing(self):
        h = {"X-Studio-User": "paco", "X-Forwarded-For": "198.51.100.7", "X-Forwarded-Uri": "/studio/x"}
        self.assertEqual(self.req("GET", "/check", headers=h)[0].status, 302)
        r, _ = self.req("GET", "/studio/login", headers=h)
        self.assertIsNone(r.getheader("X-Studio-User"))
        for _ in range(5):
            self.req("POST", "/studio/login", dict(user="paco", password="wrong"), {"Origin": ORIGIN, "Cf-Connecting-IP": "203.0.113.30", "X-Forwarded-For": "192.0.2.1"})
        r, _ = self.req("POST", "/studio/login", dict(user="paco", password=PASSWORD), {"Origin": ORIGIN, "Cf-Connecting-IP": "203.0.113.30", "X-Forwarded-For": "192.0.2.2"})
        self.assertEqual(r.status, 429)                             # X-Forwarded-For is not the address

    def test_every_answer_is_no_store(self):
        c = self.session()
        answers = [self.check(), self.check(uri="/studio/api/x"), self.check(c), self.req("GET", "/studio/login"), self.req("GET", "/studio/login", headers={"Cookie": c}),
                   self.req("GET", "/nothing"), self.login(password="wrong"), self.login(origin="https://evil.example")]
        for _ in range(6):
            answers.append(self.login(password="wrong", ip="203.0.113.40"))
        for r, _ in answers:
            self.assertEqual(r.getheader("Cache-Control"), "no-store", r.status)
        self.assertEqual(answers[-1][0].status, 429)


class Sessions(Base):
    def test_sessions_survive_a_restart_and_are_stored_hashed(self):
        c = self.session()
        self.start()
        self.assertEqual(self.check(c)[0].status, 200)
        raw = Path(self.dir, "state", "sessions.json").read_text()
        self.assertNotIn(c.split("=")[1], raw)
        self.assertEqual(stat.S_IMODE(os.stat(os.path.join(self.dir, "state", "sessions.json")).st_mode), 0o600)
        self.assertEqual(stat.S_IMODE(os.stat(os.path.join(self.dir, "state")).st_mode), 0o700)

    def test_thirty_days_sliding(self):
        c = self.session()
        for _ in range(3):
            self.clock.t += 29 * 86400
            self.assertEqual(self.check(c)[0].status, 200)
        self.clock.t += 31 * 86400
        self.assertEqual(self.check(c)[0].status, 302)

    def test_sliding_survives_a_restart(self):
        c = self.session()
        self.clock.t += 29 * 86400
        self.check(c)
        self.start()
        self.clock.t += 29 * 86400
        self.assertEqual(self.check(c)[0].status, 200)

    def test_password_change_ends_sessions(self):
        c = self.session()
        self.write_users("a different long password")
        self.assertEqual(self.check(c)[0].status, 302)
        self.assertEqual(self.login()[0].status, 401)
        self.assertEqual(self.login(password="a different long password")[0].status, 303)

    def test_removing_the_user_ends_sessions(self):
        c = self.session()
        Path(self.users_path).write_text("")
        self.assertEqual(self.check(c)[0].status, 302)

    def test_garbage_cookie(self):
        self.assertEqual(self.check("mb_studio=;;==")[0].status, 302)
        self.assertEqual(self.check("mb_studio=" + "x" * 5000)[0].status, 302)


class Passwd(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.path = os.path.join(self.dir, "etc", "studio-users")
        self.addCleanup(shutil.rmtree, self.dir, True)

    def run_tool(self, argv, typed=None):
        out = io.StringIO()
        with mock.patch.object(P, "PATH", self.path), redirect_stdout(out):
            if typed is not None:
                with mock.patch("getpass.getpass", side_effect=typed):
                    P.main(argv)
            else:
                P.main(argv)
        return out.getvalue()

    def stored(self, user="paco"):
        return dict(l.split(":", 1) for l in Path(self.path).read_text().splitlines())[user]

    def test_typed_twice_and_checked_by_the_login(self):
        self.run_tool(["paco"], ["twelve chars ok", "twelve chars ok"])
        self.assertTrue(L.check_hash("twelve chars ok", self.stored()))
        self.assertFalse(L.check_hash("twelve chars no", self.stored()))
        self.assertEqual(stat.S_IMODE(os.stat(self.path).st_mode), 0o640)
        self.assertRegex(self.stored(), r"^scrypt\$32768\$8\$1\$")

    def test_short_or_mismatched_is_refused_and_changes_nothing(self):
        with self.assertRaises(SystemExit):
            self.run_tool(["paco"], ["short"])
        with self.assertRaises(SystemExit):
            self.run_tool(["paco"], ["twelve chars ok", "twelve chars OK"])
        self.assertFalse(os.path.exists(self.path))

    def test_generate_shows_five_words_once(self):
        out = self.run_tool(["paco", "--generate"])
        words = [l.strip() for l in out.splitlines() if l.startswith("    ")][0]
        self.assertEqual(len(words.split("-")), 5)
        self.assertTrue(all(w in P.WORDS for w in words.split("-")))
        self.assertTrue(L.check_hash(words, self.stored()))
        self.assertNotIn(words, Path(self.path).read_text())

    def test_other_users_are_kept_and_a_bad_name_refused(self):
        self.run_tool(["paco", "--generate"]); self.run_tool(["anna", "--generate"]); first = self.stored("paco")
        self.run_tool(["anna", "--generate"])
        self.assertEqual(self.stored("paco"), first)
        with self.assertRaises(SystemExit):
            self.run_tool(["../x", "--generate"])

    def test_changing_ends_sessions_in_a_running_login(self):
        users = os.path.join(self.dir, "u")
        with mock.patch.object(P, "PATH", users), redirect_stdout(io.StringIO()):
            P.write_user(users, "paco", L.make_hash("first password!", **CHEAP))
            t = Clock()
            with mock.patch.object(L, "now", t):
                us, ss = L.Users(users), L.Sessions(os.path.join(self.dir, "s"))
                tok = ss.start("paco", L.fingerprint(us.get("paco")))
                self.assertEqual(ss.user_of(tok, us), "paco")
                P.main.__globals__["write_user"](users, "paco", P.make_hash("second password!", n=2**10))
                self.assertIsNone(ss.user_of(tok, us))

    def test_the_wordlist(self):
        self.assertEqual((len(P.WORDS), len(set(P.WORDS))), (512, 512))


if __name__ == "__main__":
    unittest.main()

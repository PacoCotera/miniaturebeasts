"""The studio behind the site's proxy: a leading /studio is stripped (the same build works locally and under /studio/), an unknown /studio/api|cas|events|assets path is a 404 and never the app's page,
X-Studio-User counts only on a connection from the trusted proxy address (acting as that user with the owner's role), and /cas and /assets are private to the browser."""
import json, os, shutil, sys, threading, time, unittest, urllib.error, urllib.request
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from wb import server as SV, store as S

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(BODY, "wb", "static", "app")
SCRATCH = os.path.join(BODY, "scratch", "t_studio_site")
KEY = "ab" * 32


def call(url, method="GET", headers=None, body=None):
    req = urllib.request.Request(url, method=method, headers=headers or {}, data=None if body is None else json.dumps(body).encode())
    try:
        r = urllib.request.urlopen(req, timeout=5)
    except urllib.error.HTTPError as e:
        r = e
    return r.status, dict(r.headers), r.read()


def mk(name, trusted):
    home = os.path.join(SCRATCH, name)
    sp = os.path.join(home, "species")
    os.makedirs(sp)
    S.write_spec(os.path.join(sp, "S20.json"), S.read_spec(os.path.join(BODY, "species", "S20.json")))
    srv = SV.Server(os.path.join(home, "home"), [sp], proxy_workers=0, trusted_proxy=trusted)
    srv.start()
    srv.cas.put_bytes(KEY, "png", b"\x89PNG not really")
    return srv, f"http://127.0.0.1:{srv.port}"


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        cls.near, cls.near_url = mk("near", "127.0.0.1")        # the test client is the trusted proxy
        cls.far, cls.far_url = mk("far", "192.0.2.20")          # the test client is some other peer
        cls.none, cls.none_url = mk("none", None)               # no trusted proxy at all

    @classmethod
    def tearDownClass(cls):
        for s in (cls.near, cls.far, cls.none):
            s.stop()
        shutil.rmtree(SCRATCH, ignore_errors=True)

    # ---- the prefix
    def test_the_prefix_is_optional_on_api_pages_cas_and_assets(self):
        for pre in ("", "/studio"):
            status, h, body = call(self.none_url + pre + "/api/stats")
            self.assertEqual((status, h["Content-Type"]), (200, "application/json"), pre)
            self.assertIn("framework", json.loads(body))
            self.assertEqual(call(self.none_url + pre + "/api/species/S20")[0], 200, pre)
            self.assertEqual(call(self.none_url + pre + f"/cas/{KEY}.png")[0], 200, pre)
            js = next(a for a in os.listdir(os.path.join(APP, "assets")) if a.endswith(".js"))
            self.assertEqual(call(self.none_url + pre + f"/assets/{js}")[0], 200, pre)
        index = open(os.path.join(APP, "index.html"), "rb").read()
        for path in ("/studio", "/studio/", "/studio/S20/shape", "/studio/login"):
            status, h, body = call(self.none_url + path)
            self.assertEqual((status, body, h["Cache-Control"]), (200, index, "no-cache"), path)

    def test_an_unknown_prefixed_api_cas_events_or_assets_path_is_a_404_never_the_page(self):
        for path in ("/studio/api/nothing", "/studio/api/species/S20/nothing", f"/studio/cas/{'0' * 64}.png", "/studio/cas/zz", "/studio/events/x", "/studio/assets/nothing-1234.js", "/studio/assets/", "/api/nothing"):
            status, h, body = call(self.none_url + path)
            self.assertEqual(status, 404, path)
            self.assertNotIn(b"<html", body, path)

    def test_writes_and_jobs_take_the_prefix_too(self):
        tok = {"Authorization": "Bearer wb-local-maker"}
        self.assertEqual(call(self.none_url + "/studio/api/species/S20", "PATCH", tok, {"not": "a list"})[0], 400)
        self.assertEqual(call(self.none_url + "/studio/api/species/S20", "PATCH", {}, [])[0], 401)
        self.assertEqual(call(self.none_url + "/studio/api/nothing", "POST", tok, {})[0], 404)

    def test_events_stream_answers_under_the_prefix(self):
        for pre in ("", "/studio"):
            with urllib.request.urlopen(self.none_url + pre + "/events?species=S20", timeout=5) as r:
                self.assertEqual(r.headers["Content-Type"], "text/event-stream")
                self.assertEqual(r.readline(), b": connected\n")

    # ---- the cache header
    def test_cas_and_assets_are_private_immutable(self):
        js = next(a for a in os.listdir(os.path.join(APP, "assets")) if a.endswith(".js"))
        for path in (f"/cas/{KEY}.png", f"/studio/cas/{KEY}.png", f"/assets/{js}", f"/studio/assets/{js}"):
            h = call(self.none_url + path)[1]
            self.assertEqual(h["Cache-Control"], "private, max-age=31536000, immutable", path)

    # ---- the trusted proxy
    GATE = "/studio/api/species/S20/gate/tick"

    def test_the_header_from_the_trusted_address_acts_as_that_user_with_the_owner_role(self):
        # an owner passes the role check (a maker would be 403) and reaches the gate: this path is not a gate route, so 404
        self.assertEqual(call(self.near_url + self.GATE, "POST", {"X-Studio-User": "paco"}, {})[0], 404)

    def test_the_header_from_any_other_peer_is_ignored_and_needs_a_token(self):
        for url in (self.far_url, self.none_url):
            self.assertEqual(call(url + self.GATE, "POST", {"X-Studio-User": "paco"}, {})[0], 401)
            self.assertEqual(call(url + "/studio/api/species/S20", "PATCH", {"X-Studio-User": "paco"}, [])[0], 401)
            # a token still works from there, with its own role: a maker is refused at the gate
            self.assertEqual(call(url + self.GATE, "POST", {"X-Studio-User": "paco", "Authorization": "Bearer wb-local-maker"}, {})[0], 403)

    def test_no_header_from_the_trusted_address_falls_back_to_the_token(self):
        self.assertEqual(call(self.near_url + self.GATE, "POST", {}, {})[0], 401)
        self.assertEqual(call(self.near_url + self.GATE, "POST", {"Authorization": "Bearer wb-local-maker"}, {})[0], 403)

    def test_the_acting_name_is_the_header_with_the_owner_role(self):
        sp = self.near.species["S20"]
        old = sp.spec["parts"]["tail"]["joints"][3]["len"]
        ops = [{"op": "replace", "path": "/parts/tail/joints/3/len", "value": round(old + 0.01, 3)}]
        self.assertEqual(call(self.near_url + "/studio/api/species/S20", "PATCH", {"X-Studio-User": "paco"}, ops)[0], 200)
        e = [x for x in sp.history(50) if x["path"] == "/parts/tail/joints/3/len"][-1]
        self.assertEqual((e["actor"], e["role"], e["agent"], e["via"]), ("paco", "owner", False, "api"))


if __name__ == "__main__":
    unittest.main()

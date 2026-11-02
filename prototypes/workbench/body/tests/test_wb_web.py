"""Workbench chunk 3A: the studio app is served by the Python server. /assets/* are immutable, any page path answers index.html (never cached), the API and the cache keep their routes,
a strict Content-Security-Policy rides every page, and the committed bundle is not older than its source (build.json carries the source hash)."""
import hashlib, json, os, shutil, sys, unittest, urllib.error, urllib.request
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from wb import server as SV, store as S

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.join(BODY, "wb", "web")
APP = os.path.join(BODY, "wb", "static", "app")
SCRATCH = os.path.join(BODY, "scratch", "t_web")


def source_hash():
    """The same hash vite.config.ts writes into build.json: sha256 over '<posix path>\\0<bytes>\\0' for src/**, index.html, vite.config.ts, tsconfig.json, package.json, package-lock.json in sorted path order."""
    files = []
    for root, _, names in os.walk(os.path.join(WEB, "src")):
        files += [os.path.relpath(os.path.join(root, n), WEB).replace(os.sep, "/") for n in names]
    files += ["index.html", "vite.config.ts", "tsconfig.json", "package.json", "package-lock.json"]
    h = hashlib.sha256()
    for f in sorted(files):
        h.update(f.encode() + b"\0")
        with open(os.path.join(WEB, f), "rb") as fh:
            h.update(fh.read())
        h.update(b"\0")
    return h.hexdigest()


def get(url):
    try:
        r = urllib.request.urlopen(url)
    except urllib.error.HTTPError as e:
        r = e
    return r.status, dict(r.headers), r.read()


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        sp = os.path.join(SCRATCH, "species")
        os.makedirs(sp)
        S.write_spec(os.path.join(sp, "S20.json"), S.read_spec(os.path.join(BODY, "species", "S20.json")))
        cls.srv = SV.Server(os.path.join(SCRATCH, "home"), [sp], proxy_workers=0)
        cls.srv.start()
        cls.url = f"http://127.0.0.1:{cls.srv.port}"

    @classmethod
    def tearDownClass(cls):
        cls.srv.stop()
        shutil.rmtree(SCRATCH, ignore_errors=True)

    def test_the_committed_bundle_is_not_older_than_its_source(self):
        with open(os.path.join(APP, "build.json")) as fh:
            built = json.load(fh)
        self.assertEqual(built["source_hash"], source_hash(), "web/src changed since the last build: run `npm ci && npm run build` in body/wb/web and commit static/app")

    def test_pages_answer_index_html_and_are_never_cached(self):
        with open(os.path.join(APP, "index.html"), "rb") as fh:
            index = fh.read()
        for path in ("/", "/studio/S20/shape", "/studio/S20/shape?sel=tail&az=90", "/play/S20"):
            status, h, body = get(self.url + path)
            self.assertEqual(status, 200, path)
            self.assertEqual(body, index, path)
            self.assertEqual(h["Cache-Control"], "no-cache")
            self.assertIn("default-src 'self'", h["Content-Security-Policy"])
            self.assertNotIn("http", h["Content-Security-Policy"].replace("'self'", ""))

    def test_assets_are_immutable_and_a_missing_asset_is_a_404(self):
        assets = sorted(os.listdir(os.path.join(APP, "assets")))
        js = next(a for a in assets if a.endswith(".js"))
        status, h, body = get(f"{self.url}/assets/{js}")
        self.assertEqual((status, h["Content-Type"].split(";")[0]), (200, "text/javascript"))
        self.assertEqual(h["Cache-Control"], "public, max-age=31536000, immutable")
        self.assertEqual(get(f"{self.url}/assets/nothing-1234.js")[0], 404)
        self.assertEqual(get(f"{self.url}/assets/../index.html")[0] in (200, 404), True)

    def test_the_api_and_the_cache_keep_their_routes(self):
        status, h, body = get(self.url + "/api/species/S20")
        self.assertEqual((status, h["Content-Type"]), (200, "application/json"))
        d = json.loads(body)
        self.assertEqual(sorted(d), ["checks", "error", "file", "goldens", "hash", "history", "id", "lease", "path", "views"])
        self.assertEqual(len(d["views"]), 16)  # 4 modes x 4 angles at 304
        self.assertTrue(all(v["ready"] is False for v in d["views"]))
        self.assertEqual(get(self.url + "/api/nothing")[0], 404)
        self.assertEqual(get(self.url + "/cas/" + "0" * 64 + ".png")[0], 404)

    def test_no_cdn_in_the_page(self):
        with open(os.path.join(APP, "index.html")) as fh:
            index = fh.read()
        self.assertNotRegex(index, r"https?://")


if __name__ == "__main__":
    unittest.main()

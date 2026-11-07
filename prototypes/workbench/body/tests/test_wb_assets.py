"""Studio chunk R1, assets: the lossless WebP writer, /cas/<key>.webp made beside the PNG on the first ask, the precompressed .br/.gz siblings of the app, and the size budget (first load <= 400 KB gzipped).
The WebP bytes were checked against Chromium's decoder (every pixel and the alpha equal on a plush render and three screenshots); here the file's structure, size and determinism are held."""
import gzip, os, shutil, struct, sys, unittest, urllib.request
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from wb import budget, pngio, server as SV, store as S, webp

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(BODY, "wb", "static", "app")
SCRATCH = os.path.join(BODY, "scratch", "t_assets")
KEY = "ab" * 32


def picture():
    """A plush-like test picture: a flat transparent field, a soft disc, a few hard stripes."""
    h, w = 120, 150
    y, x = np.mgrid[0:h, 0:w]
    img = np.zeros((h, w, 4), np.uint8)
    d = np.hypot(x - 70, y - 60)
    inside = d < 40
    img[inside, 0] = (200 - d[inside]).astype(np.uint8)
    img[inside, 1] = (120 + d[inside] * 2).astype(np.uint8)
    img[inside, 2] = 90
    img[inside, 3] = 255
    img[100:104, :, :] = (10, 20, 30, 255)
    return img


def read(path):
    with open(path, "rb") as fh:
        return fh.read()


def get(url, enc=None):
    req = urllib.request.Request(url, headers={"Accept-Encoding": enc} if enc else {})
    try:
        r = urllib.request.urlopen(req)
    except urllib.error.HTTPError as e:
        r = e
    return r.status, dict(r.headers), r.read()


class Webp(unittest.TestCase):
    def test_a_riff_vp8l_file_of_the_right_size_that_is_smaller_than_the_raw_pixels(self):
        img = picture()
        data = webp.encode(img)
        self.assertEqual(data[:4], b"RIFF")
        self.assertEqual(struct.unpack("<I", data[4:8])[0], len(data) - 8)
        self.assertEqual(data[8:16], b"WEBPVP8L")
        self.assertEqual(data[20], 0x2F)
        bits = int.from_bytes(data[21:25], "little")
        self.assertEqual((bits & 0x3FFF) + 1, 150)
        self.assertEqual(((bits >> 14) & 0x3FFF) + 1, 120)
        self.assertEqual((bits >> 28) & 1, 1)               # the field is transparent: the alpha flag is set
        self.assertLess(len(data), img.size // 10)

    def test_the_same_pixels_give_the_same_bytes_and_alpha_is_flagged(self):
        img = picture()
        self.assertEqual(webp.encode(img), webp.encode(img.copy()))
        opaque = img.copy()
        opaque[..., 3] = 255
        self.assertEqual((int.from_bytes(webp.encode(opaque)[21:25], "little") >> 28) & 1, 0)
        self.assertEqual((int.from_bytes(webp.encode(img)[21:25], "little") >> 28) & 1, 1)

    def test_noise_and_one_colour_and_tiny_sizes_encode(self):
        rng = np.random.default_rng(3)
        for img in (rng.integers(0, 256, (37, 41, 4), dtype=np.uint8), np.full((9, 5, 4), 255, np.uint8), np.zeros((1, 1, 4), np.uint8), rng.integers(0, 256, (1, 300, 4), dtype=np.uint8)):
            data = webp.encode(img)
            self.assertEqual(data[8:12], b"WEBP")
            self.assertEqual(len(data) % 2, 0)


class Served(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        sp = os.path.join(SCRATCH, "species")
        os.makedirs(sp)
        S.write_spec(os.path.join(sp, "S20.json"), S.read_spec(os.path.join(BODY, "species", "S20.json")))
        cls.srv = SV.Server(os.path.join(SCRATCH, "home"), [sp], proxy_workers=0)
        t = cls.srv.cas.tmp("png")
        pngio.write(t, picture())
        cls.srv.cas.adopt(t, KEY, "png")
        cls.srv.start()
        cls.url = f"http://127.0.0.1:{cls.srv.port}"

    @classmethod
    def tearDownClass(cls):
        cls.srv.stop()
        shutil.rmtree(SCRATCH, ignore_errors=True)

    def test_cas_webp_is_made_beside_the_png_once_and_is_immutable(self):
        self.assertFalse(self.srv.cas.has(KEY, "webp"))
        status, h, body = get(f"{self.url}/cas/{KEY}.webp")
        self.assertEqual((status, h["Content-Type"], h["Cache-Control"]), (200, "image/webp", SV.IMMUTABLE))
        self.assertEqual(body[:4] + body[8:12], b"RIFFWEBP")
        self.assertTrue(self.srv.cas.has(KEY, "webp"))
        with open(self.srv.cas.path(KEY, "webp"), "rb") as fh:
            self.assertEqual(fh.read(), body)
        self.assertEqual(get(f"{self.url}/cas/{KEY}.webp")[2], body)
        self.assertEqual(get(f"{self.url}/cas/{KEY}.png")[1]["Content-Type"], "image/png")     # the PNG stays the record
        self.assertEqual(get(f"{self.url}/cas/{'cd' * 32}.webp")[0], 404)

    def test_the_app_is_sent_precompressed_when_the_browser_takes_it(self):
        assets = os.path.join(APP, "assets")
        js = next(a for a in sorted(os.listdir(assets)) if a.endswith(".js"))
        raw = read(os.path.join(assets, js))
        s, h, b = get(f"{self.url}/assets/{js}")
        self.assertEqual((s, b, h.get("Content-Encoding")), (200, raw, None))
        self.assertEqual(h["Vary"], "Accept-Encoding")
        s, h, b = get(f"{self.url}/assets/{js}", "gzip, deflate")
        self.assertEqual((s, h["Content-Encoding"], h["Cache-Control"], h["Content-Type"].split(";")[0]), (200, "gzip", SV.IMMUTABLE, "text/javascript"))
        self.assertEqual(gzip.decompress(b), raw)
        s, h, b = get(f"{self.url}/assets/{js}", "gzip, br")
        self.assertEqual(h["Content-Encoding"], "br")
        self.assertEqual(b, read(os.path.join(assets, js + ".br")))
        self.assertEqual(h["Content-Length"], str(len(b)))
        s, h, b = get(f"{self.url}/assets/{js}", "br;q=0, gzip")
        self.assertEqual(h["Content-Encoding"], "gzip")
        s, h, b = get(f"{self.url}/studio/S20/shape", "br")                                      # a page of the app: index.html, still never cached
        self.assertEqual((h["Content-Encoding"], h["Cache-Control"]), ("br", "no-cache"))

    def test_fonts_are_woff2_and_not_compressed_twice(self):
        fonts = [a for a in os.listdir(os.path.join(APP, "assets")) if a.endswith(".woff2")]
        self.assertEqual(len(fonts), 1)
        self.assertFalse(os.path.exists(os.path.join(APP, "assets", fonts[0] + ".br")))
        s, h, b = get(f"{self.url}/assets/{fonts[0]}", "br, gzip")
        self.assertEqual((s, h["Content-Type"], h.get("Content-Encoding")), (200, "font/woff2", None))
        self.assertFalse([a for a in os.listdir(os.path.join(APP, "assets")) if a.endswith(".ttf")])


class KeepAlive(unittest.TestCase):
    def test_a_kept_alive_connection_outlives_the_site_proxys_two_minute_upstream_keepalive(self):
        self.assertEqual(SV.make_handler(None).timeout, 180)


class Budget(unittest.TestCase):
    def test_every_text_file_of_the_app_has_both_precompressed_siblings(self):
        for root, _, names in os.walk(APP):
            for n in names:
                if n.endswith((".js", ".css", ".html")):
                    for ext in (".br", ".gz"):
                        self.assertTrue(os.path.exists(os.path.join(root, n + ext)), n + ext)
                    with open(os.path.join(root, n), "rb") as fh, open(os.path.join(root, n + ".gz"), "rb") as gz:
                        self.assertEqual(gzip.decompress(gz.read()), fh.read(), n)

    def test_first_load_is_at_most_400_kb_gzipped(self):
        rows = budget.first_load()
        total = sum(r[2] for r in rows)
        self.assertLessEqual(total, 400 * 1024, "\n".join(f"{w:8d} {n}" for n, _, w in rows))


if __name__ == "__main__":
    unittest.main()

"""Tests of deploy.sh against a local release server, a stand-in for Caddy (it refuses a Caddyfile that says INVALID) and a stand-in for systemctl.
With a real `caddy` on the path, the real Caddyfile is also validated. Run: python3 -m unittest discover -s ops/sandbox/tests -v"""
import hashlib, io, json, os, shutil, subprocess, tarfile, tempfile, threading, unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEPLOY = HERE.parent / "deploy.sh"
REAL = HERE.parent / "Caddyfile"
FAKE_CADDY = """#!/bin/sh
# stand-in: validate --config FILE --adapter caddyfile
echo "$@" >> "$FAKE_LOG.caddy"
grep -q INVALID "$3" && { echo "Error: adapting config: $3:1: unrecognized directive" >&2; exit 1; }
exit 0
"""
FAKE_SYSTEMCTL = """#!/bin/sh
echo "$@" >> "$FAKE_LOG"
[ "$1" = reload ] && [ -n "$FAKE_RELOAD_FAIL" ] && exit 1
exit 0
"""


def release_tar(caddyfile, login=None):
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as t:
        def add(name, data):
            i = tarfile.TarInfo(name); i.size = len(data); t.addfile(i, io.BytesIO(data))
        add("build.json", b"{}")
        add("index.html", b"<p>site</p>")
        if caddyfile is not None:
            add("ops/sandbox/Caddyfile", caddyfile.encode())
        if login is not None:
            add("ops/sandbox/login/mb_login.py", login.encode())
    return buf.getvalue()


class Hub(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        hub = self.server
        hub.hits.append(self.path)
        p = self.path.split("?")[0]
        if p == "/releases":
            body = json.dumps([hub.meta(t) for t in hub.releases]).encode()
        elif p.startswith("/releases/tags/") and p.rsplit("/", 1)[1] in hub.releases:
            body = json.dumps(hub.meta(p.rsplit("/", 1)[1])).encode()
        elif p.startswith("/dl/") and p[4:] in hub.files:
            body = hub.files[p[4:]]
        else:
            self.send_response(404); self.end_headers(); return
        self.send_response(200); self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body)


class Deploy(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.dir, True)
        self.root, self.etc = self.dir / "root", self.dir / "etc"
        self.etc.mkdir()
        self.caddyfile = self.etc / "Caddyfile"
        self.caddyfile.write_text("# installed before\n")
        self.log = self.dir / "calls.log"
        for name, text in (("caddy", FAKE_CADDY), ("systemctl", FAKE_SYSTEMCTL)):
            (self.dir / name).write_text(text); (self.dir / name).chmod(0o755)
        self.hub = ThreadingHTTPServer(("127.0.0.1", 0), Hub)
        self.hub.releases, self.hub.files, self.hub.hits, self.n = [], {}, [], 0
        self.hub.meta = self.meta
        threading.Thread(target=self.hub.serve_forever, daemon=True).start()
        self.addCleanup(lambda: (self.hub.shutdown(), self.hub.server_close()))
        self.base = f"http://127.0.0.1:{self.hub.server_address[1]}"
        self.root.mkdir()
        self.env = dict(os.environ, MB_ROOT=str(self.root), MB_API=self.base + "/releases", MB_CADDYFILE=str(self.caddyfile),
                        MB_CADDY=str(self.dir / "caddy"), MB_SYSTEMCTL=str(self.dir / "systemctl"), FAKE_LOG=str(self.log), MB_STUDIO="127.0.0.1:8790")
        self.env.pop("FAKE_RELOAD_FAIL", None)

    def meta(self, tag):
        i = self.hub.releases.index(tag)
        return dict(tag_name=tag, draft=False, created_at=f"2026-11-0{i + 1}T00:00:00Z", assets=[
            dict(name=f"{tag}.tar.gz", browser_download_url=f"{self.base}/dl/{tag}.tar.gz"),
            dict(name=f"{tag}.sha256", browser_download_url=f"{self.base}/dl/{tag}.sha256")])

    def publish(self, caddyfile=None, corrupt=False, tag=None, login=None):
        self.n += 1
        tag = tag or f"sandbox-{self.n:07x}"
        data = release_tar(caddyfile, login)
        self.hub.files[tag + ".tar.gz"] = data
        self.hub.files[tag + ".sha256"] = (("0" * 64) if corrupt else hashlib.sha256(data).hexdigest()).encode() + f"  {tag}.tar.gz\n".encode()
        self.hub.releases.append(tag)
        return tag

    def run_deploy(self, **env):
        return subprocess.run(["bash", str(DEPLOY)], env=dict(self.env, **env), capture_output=True, text=True, timeout=60)

    def current(self):
        return os.path.basename(os.path.realpath(self.root / "current")) if (self.root / "current").exists() else None

    def calls(self):
        return self.log.read_text().splitlines() if self.log.exists() else []

    def test_a_good_caddyfile_is_installed_and_reloaded_once(self):
        t1 = self.publish("# VALID one\n")
        r = self.run_deploy()
        self.assertEqual((r.returncode, self.current()), (0, t1), r.stderr)
        self.assertEqual(self.caddyfile.read_text(), "# VALID one\n")
        self.assertEqual((self.etc / "Caddyfile.prev").read_text(), "# installed before\n")
        self.assertEqual(self.calls().count("reload caddy"), 1)
        self.assertIn("restart mb-caddy", self.calls()); self.assertIn("restart mb-login", self.calls())
        self.assertIn("Caddyfile updated and reloaded", r.stdout)
        self.run_deploy()                                    # nothing new: nothing happens
        self.assertEqual(self.calls().count("reload caddy"), 1)
        t2 = self.publish("# VALID one\n")                   # new release, same Caddyfile: switch, no reload
        self.assertEqual(self.run_deploy().returncode, 0)
        self.assertEqual((self.current(), self.calls().count("reload caddy")), (t2, 1))

    def test_a_bad_caddyfile_keeps_the_current_release_and_file(self):
        t1 = self.publish("# VALID one\n"); self.run_deploy()
        before = self.calls().copy()
        bad = self.publish("# INVALID\n")
        r = self.run_deploy()
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("mb-sandbox-deploy: Caddyfile refused", r.stderr)
        self.assertIn("unrecognized directive", r.stderr)
        self.assertEqual((self.current(), self.caddyfile.read_text()), (t1, "# VALID one\n"))
        self.assertEqual(self.calls(), before)
        self.assertFalse((self.root / "releases" / bad).exists())
        hits = len(self.hub.hits)
        r = self.run_deploy()                                # said once: the same release is not fetched or reported again
        self.assertEqual((r.returncode, r.stderr, len(self.hub.hits) - hits), (0, "", 1))
        good = self.publish("# VALID two\n")
        self.assertEqual(self.run_deploy().returncode, 0)
        self.assertEqual((self.current(), self.caddyfile.read_text()), (good, "# VALID two\n"))

    def test_a_release_without_a_caddyfile_leaves_the_installed_one(self):
        t1 = self.publish()
        r = self.run_deploy()
        self.assertEqual((r.returncode, self.current()), (0, t1), r.stderr)
        self.assertEqual(self.caddyfile.read_text(), "# installed before\n")
        self.assertNotIn("reload caddy", self.calls())
        self.assertIn("restart mb-caddy", self.calls())

    def test_a_failed_reload_puts_the_old_file_back(self):
        t1 = self.publish(); self.run_deploy()
        self.publish("# VALID\n")
        r = self.run_deploy(FAKE_RELOAD_FAIL="1")
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("Caddyfile refused", r.stderr)
        self.assertEqual((self.current(), self.caddyfile.read_text()), (t1, "# installed before\n"))

    def test_a_bad_checksum_changes_nothing(self):
        t1 = self.publish(); self.run_deploy()
        self.publish("# VALID\n", corrupt=True)
        self.assertNotEqual(self.run_deploy().returncode, 0)
        self.assertEqual((self.current(), self.caddyfile.read_text()), (t1, "# installed before\n"))
        self.assertEqual([p.name for p in (self.root / "releases").iterdir()], [t1])

    def test_the_pin(self):
        t1 = self.publish("# VALID one\n"); self.run_deploy()
        t2 = self.publish("# VALID two\n"); self.run_deploy()
        self.assertEqual(self.current(), t2)
        (self.root / "pin").write_text(t1 + "\n")
        r = self.run_deploy(MB_API="http://127.0.0.1:9/none")   # a release on disk needs no network
        self.assertEqual((r.returncode, self.current()), (0, t1), r.stderr)
        self.assertEqual(self.caddyfile.read_text(), "# VALID one\n")     # the Caddyfile goes back with the release
        self.assertIn("(pinned)", r.stdout)
        self.publish("# VALID three\n")
        self.assertEqual(self.run_deploy().returncode, 0)                 # newer releases wait while pinned
        self.assertEqual(self.current(), t1)
        (self.root / "pin").unlink()
        self.run_deploy()
        self.assertEqual(self.current(), "sandbox-0000003")

    def test_a_pin_to_a_release_not_on_disk_is_fetched(self):
        t1 = self.publish(); t2 = self.publish(); self.run_deploy()
        self.assertFalse((self.root / "releases" / t1).exists())
        (self.root / "pin").write_text(t1)
        self.assertEqual(self.run_deploy().returncode, 0)
        self.assertEqual(self.current(), t1)

    def test_a_bad_pin_deploys_nothing(self):
        t1 = self.publish(); self.run_deploy(); self.publish()
        (self.root / "pin").write_text("latest; rm -rf /")
        r = self.run_deploy()
        self.assertNotEqual(r.returncode, 0)
        self.assertEqual(self.current(), t1)

    def test_five_releases_are_kept_and_the_pinned_one_is_never_pruned(self):
        tags = []
        for _ in range(7):
            tags.append(self.publish()); self.assertEqual(self.run_deploy().returncode, 0)
        kept = lambda: sorted(p.name for p in (self.root / "releases").iterdir())
        self.assertEqual(kept(), tags[2:])
        (self.root / "pin").write_text(tags[2]); self.run_deploy()
        self.assertEqual((self.current(), kept()), (tags[2], tags[2:]))
        tags.append(self.publish()); self.run_deploy()                    # pinned: the newest waits, nothing is pruned
        self.assertEqual(kept(), tags[2:7])
        (self.root / "pin").unlink(); self.run_deploy()
        self.assertEqual((self.current(), len(kept())), (tags[-1], 5))

    BAD_STUDIO = [None, "", "studio", "studio:", ":8790", "studio:0", "studio:65536", "studio:87a0", "a b:8790", "studio:8790/x",
                  "-studio:8790", "2001:db8::1:8790", "studio:8790\nX=1", "http://studio:8790"]

    def test_a_studio_address_that_is_not_host_port_is_refused_before_caddy(self):
        t1 = self.publish("# VALID one\n"); self.run_deploy()
        caddy_log = Path(str(self.log) + ".caddy"); caddy_log.unlink()
        t2 = self.publish("# VALID two\n")
        for bad in self.BAD_STUDIO:
            env = dict(self.env)
            if bad is None:
                env.pop("MB_STUDIO")
            else:
                env["MB_STUDIO"] = bad
            r = subprocess.run(["bash", str(DEPLOY)], env=env, capture_output=True, text=True, timeout=60)
            self.assertNotEqual(r.returncode, 0, bad)
            self.assertIn("Caddyfile refused: MB_STUDIO is not host:port", r.stderr, bad)
            self.assertEqual((self.current(), self.caddyfile.read_text()), (t1, "# VALID one\n"), bad)
            self.assertFalse(caddy_log.exists(), bad)                      # Caddy was never asked
        self.assertFalse((self.root / "refused").exists())                # the release is not to blame
        for good in ("studio:8790", "198.51.100.10:8790", "[2001:db8::1]:8790", "studio.lan:1", "127.0.0.1:65535"):
            self.assertEqual(subprocess.run(["bash", "-c", 'source <(sed -n "/^STUDIO_RE=/p;/^studio_ok()/p" "$1"); studio_ok "$2"', "x", str(DEPLOY), good]).returncode, 0, good)
        r = self.run_deploy()
        self.assertEqual((r.returncode, self.current()), (0, t2), r.stderr)

    def test_a_release_without_a_caddyfile_needs_no_studio_address(self):
        t1 = self.publish()
        env = dict(self.env); env.pop("MB_STUDIO")
        r = subprocess.run(["bash", str(DEPLOY)], env=env, capture_output=True, text=True, timeout=60)
        self.assertEqual((r.returncode, self.current()), (0, t1), r.stderr)

    def test_a_tag_that_is_not_a_release_is_refused(self):
        t1 = self.publish(); self.run_deploy()
        self.publish(tag="sandbox-1234567/../../x")
        r = self.run_deploy()
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("not sandbox-<sha>", r.stderr)
        self.assertEqual(self.current(), t1)
        self.assertEqual(sorted(p.name for p in (self.root / "releases").iterdir()), [t1])

    def test_the_release_is_unpacked_as_root_owns_it(self):
        shim = self.dir / "bin"; shim.mkdir()
        (shim / "tar").write_text('#!/bin/sh\necho "$@" >> "$FAKE_LOG"\nexec /usr/bin/env -u FAKE_LOG tar "$@"\n'.replace("/usr/bin/env -u FAKE_LOG tar", shutil.which("tar")))
        (shim / "tar").chmod(0o755)
        self.publish()
        r = self.run_deploy(PATH=f"{shim}:{os.environ['PATH']}")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertTrue(any("--no-same-owner" in c and "-xzf" in c for c in self.calls()), self.calls())

    def test_the_login_restarts_only_when_its_code_changed(self):
        self.publish(login="v1"); self.run_deploy()
        self.assertEqual(self.calls().count("restart mb-login"), 1)
        self.publish(login="v1"); self.run_deploy()
        self.assertEqual(self.calls().count("restart mb-login"), 1)        # same code: its lockouts stay
        self.assertEqual(self.calls().count("restart mb-caddy"), 2)
        self.publish(login="v2"); self.run_deploy()
        self.assertEqual(self.calls().count("restart mb-login"), 2)

    def test_a_stale_previous_file_is_never_put_back(self):
        self.caddyfile.unlink()
        (self.etc / "Caddyfile.prev").write_text("# stale, from long ago\n")
        self.publish("# VALID\n")
        r = self.run_deploy(FAKE_RELOAD_FAIL="1")
        self.assertNotEqual(r.returncode, 0)
        self.assertNotEqual(self.caddyfile.read_text(), "# stale, from long ago\n")


@unittest.skipUnless(shutil.which("caddy"), "no caddy on the path")
class RealCaddy(unittest.TestCase):
    def test_the_shipped_caddyfile_validates(self):
        env = dict(os.environ, MB_ROOT="/tmp/root", MB_STUDIO="127.0.0.1:8790")
        r = subprocess.run(["caddy", "validate", "--config", str(REAL), "--adapter", "caddyfile"], env=env, capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)



@unittest.skipUnless(shutil.which("caddy"), "no caddy on the path")
class DeployWithRealCaddy(Deploy):
    """The same deploy, the real caddy for the check: the shipped Caddyfile goes live, a broken one is refused."""
    def setUp(self):
        super().setUp()
        self.env.update(MB_CADDY=shutil.which("caddy"), MB_STUDIO="127.0.0.1:8790")

    def test_the_shipped_caddyfile_goes_live_and_a_broken_one_is_refused(self):
        t1 = self.publish(REAL.read_text())
        r = self.run_deploy()
        self.assertEqual((r.returncode, self.current()), (0, t1), r.stderr)
        self.publish(":80 {\n\tnot_a_directive\n}\n")
        r = self.run_deploy()
        self.assertIn("mb-sandbox-deploy: Caddyfile refused", r.stderr)
        self.assertEqual((self.current(), self.caddyfile.read_text()), (t1, REAL.read_text()))

    def test_a_missing_studio_address_is_refused(self):
        """Caddy accepts an empty MB_STUDIO (2.11 does); deploy.sh refuses it before asking Caddy."""
        t1 = self.publish(REAL.read_text()); self.run_deploy()
        self.publish(REAL.read_text() + "# changed\n")
        env = dict(self.env); env.pop("MB_STUDIO")
        r = subprocess.run(["bash", str(DEPLOY)], env=env, capture_output=True, text=True, timeout=60)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("Caddyfile refused: MB_STUDIO is not host:port", r.stderr)
        self.assertEqual((self.current(), self.caddyfile.read_text()), (t1, REAL.read_text()))

    # the stand-in's tests need its INVALID marker; they run once, against the stand-in
    for _name in [n for n in dir(Deploy) if n.startswith("test_")]:
        locals()[_name] = None


if __name__ == "__main__":
    unittest.main()

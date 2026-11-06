"""install.sh's own files come from beside it (a copy of ops/sandbox), and the login's start picks the release's login or the installed copy.
Nothing here needs root: install.sh is stopped at its first apt-get by a stand-in. Run: python3 -m unittest discover -s ops/sandbox/tests -v"""
import os, re, shutil, subprocess, tempfile, unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
FILES = ["install.sh", "deploy.sh", "Caddyfile", "login/mb_login.py", "login/mb-studio-passwd", "login/mb-login-run"]
STOP = "#!/bin/sh\necho \"$(basename \"$0\") $*\" >> \"$FAKE_LOG\"\necho \"stand-in: stopped at $(basename \"$0\")\" >&2\nexit 97\n"


class Install(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.dir, True)
        self.bin = self.dir / "bin"; self.bin.mkdir()
        for name in ("apt-get", "curl", "gpg", "systemctl", "useradd"):
            (self.bin / name).write_text(STOP); (self.bin / name).chmod(0o755)
        self.log = self.dir / "calls.log"

    def copy(self, skip=()):
        dst = self.dir / "copy"
        for f in FILES:
            if f not in skip:
                (dst / f).parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(HERE / f, dst / f)
        return dst

    def run_install(self, src, env_file=None):
        env = dict(os.environ, PATH=f"{self.bin}:{os.environ['PATH']}", FAKE_LOG=str(self.log), MB_ROOT=str(self.dir / "root"),
                   MB_ENV_FILE=env_file or str(self.dir / "etc" / "caddy.env"), MB_STUDIO="127.0.0.1:8790")
        return subprocess.run(["bash", str(src / "install.sh")], env=env, capture_output=True, text=True, timeout=30)

    def calls(self):
        return self.log.read_text().splitlines() if self.log.exists() else []

    def test_a_whole_copy_is_used_and_nothing_is_fetched(self):
        src = self.copy()
        r = self.run_install(src)
        self.assertIn(f"install.sh: files from {src}", r.stdout + r.stderr)
        self.assertEqual(self.calls()[0].split()[0], "apt-get", self.calls())      # it got as far as apt, with no fetch before it
        self.assertFalse(any(c.startswith("curl") for c in self.calls()))

    def test_a_partial_copy_is_refused_before_anything_changes(self):
        for missing in FILES[1:]:
            self.log.unlink(missing_ok=True)
            shutil.rmtree(self.dir / "copy", True)
            r = self.run_install(self.copy(skip=[missing]))
            self.assertNotEqual(r.returncode, 0)
            self.assertIn(f"{missing} is missing", r.stdout, missing)
            self.assertEqual(self.calls(), [], missing)

    def test_the_environment_file_needs_a_directory_of_its_own(self):
        for bad in ("/etc/caddy.env", "/caddy.env", "/srv/caddy.env"):
            r = self.run_install(self.copy(), env_file=bad)
            self.assertNotEqual(r.returncode, 0)
            self.assertIn("directory of its own", r.stdout, bad)
            self.assertEqual(self.calls(), [], bad)

    def test_a_studio_address_that_is_not_host_port_is_refused_before_anything_changes(self):
        for bad in ("studio", ":8790", "studio:0", "studio:70000", "a b:1", "studio:8790\nMB_ROOT=/"):
            self.log.unlink(missing_ok=True)
            env = dict(os.environ, PATH=f"{self.bin}:{os.environ['PATH']}", FAKE_LOG=str(self.log), MB_ROOT=str(self.dir / "root"),
                       MB_ENV_FILE=str(self.dir / "etc" / "caddy.env"), MB_STUDIO=bad)
            r = subprocess.run(["bash", str(self.copy() / "install.sh")], env=env, capture_output=True, text=True, timeout=30)
            self.assertNotEqual(r.returncode, 0, bad)
            self.assertIn("set MB_STUDIO to the studio's host:port", r.stdout, bad)
            self.assertEqual(self.calls(), [], bad)

    def test_only_the_piped_run_fetches_from_main(self):
        lines = [l for l in (HERE / "install.sh").read_text().splitlines() if "$RAW" in l and not l.lstrip().startswith("#")]
        self.assertEqual(lines, ['  for f in $FILES; do curl -fsSL "$RAW/$f" -o "$SRC/$f"; done'])
        files = re.search(r'^FILES="([^"]+)"', (HERE / "install.sh").read_text(), re.M).group(1).split()
        self.assertEqual(sorted(files), sorted(FILES[1:]))


class Launcher(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.dir, True)
        self.lib = self.dir / "lib"; self.lib.mkdir()
        shutil.copy2(HERE / "login" / "mb-login-run", self.lib / "run")
        (self.lib / "mb_login.py").write_text("print('the installed copy')\n")
        self.root = self.dir / "root"; (self.root / "releases" / "r1").mkdir(parents=True)
        os.symlink(self.root / "releases" / "r1", self.root / "current")

    def start(self):
        return subprocess.run([str(self.lib / "run")], env=dict(os.environ, MB_ROOT=str(self.root)), capture_output=True, text=True, timeout=10)

    def test_a_release_without_the_login_runs_the_installed_copy(self):
        self.assertEqual(self.start().stdout, "the installed copy\n")

    def test_a_release_with_the_login_runs_its_own(self):
        p = self.root / "releases" / "r1" / "ops" / "sandbox" / "login"; p.mkdir(parents=True)
        (p / "mb_login.py").write_text("print('the release')\n")
        self.assertEqual(self.start().stdout, "the release\n")

    def test_no_root_no_start(self):
        r = subprocess.run([str(self.lib / "run")], env={k: v for k, v in os.environ.items() if k != "MB_ROOT"}, capture_output=True, text=True)
        self.assertNotEqual(r.returncode, 0)


if __name__ == "__main__":
    unittest.main()

"""Focused checks for the bounded, deterministic staging archive."""
import gzip
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest
from unittest import mock

SPEC = importlib.util.spec_from_file_location(
    "package_staging", Path(__file__).parents[1] / "package_staging.py")
PACKAGE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PACKAGE)


class StagingPackage(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.binary = self.directory / "critter_lab"
        self.binary.write_bytes(b"tested-linux-executable")
        self.binary.chmod(0o755)
        committed = {f"presenter/{name}": PACKAGE.git_bytes(
            "show", f"HEAD:native/presenter/{name}") for name in
            ("app.js", "index.html", "server.py", "style.css")}
        patcher = mock.patch.object(PACKAGE, "presenter_files", return_value=committed)
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_create_is_deterministic_and_verifiable(self):
        first, second = self.directory / "first.tar.gz", self.directory / "second.tar.gz"
        PACKAGE.create(self.binary, first)
        PACKAGE.create(self.binary, second)
        self.assertEqual(first.read_bytes(), second.read_bytes())
        PACKAGE.verify(first, PACKAGE.git("rev-parse", "HEAD"))
        with tarfile.open(first) as archive:
            self.assertEqual([item.name for item in archive], [
                "critter-lab-staging/MANIFEST.txt", "critter-lab-staging/bin/critter_lab",
                "critter-lab-staging/presenter/app.js", "critter-lab-staging/presenter/index.html",
                "critter-lab-staging/presenter/release.json", "critter-lab-staging/presenter/server.py",
                "critter-lab-staging/presenter/style.css"])
            release = json.loads(archive.extractfile(
                "critter-lab-staging/presenter/release.json").read())
            self.assertIsNone(release["deployed_at"])
            self.assertIn("committed_at", release)

    def test_create_refuses_overwrite_and_revision_mismatch(self):
        output = self.directory / "bundle.tar.gz"
        PACKAGE.create(self.binary, output)
        with self.assertRaisesRegex(ValueError, "overwrite"):
            PACKAGE.create(self.binary, output)
        with self.assertRaisesRegex(ValueError, "expected revision"):
            PACKAGE.verify(output, "0" * 40)
        with mock.patch.dict(os.environ, {"GITHUB_SHA": "0" * 40}):
            with self.assertRaisesRegex(ValueError, "GITHUB_SHA"):
                PACKAGE.release_metadata()

    def test_publish_race_fails_closed(self):
        output = self.directory / "raced.tar.gz"
        def competing_link(source, destination):
            Path(destination).write_bytes(b"competitor")
            raise FileExistsError()
        with mock.patch.object(PACKAGE.os, "link", side_effect=competing_link):
            with self.assertRaisesRegex(ValueError, "overwrite"):
                PACKAGE.create(self.binary, output)
        self.assertEqual(output.read_bytes(), b"competitor")

    def test_provenance_rejects_index_and_worktree_changes(self):
        repository = self.directory / "repository"
        repository.mkdir()
        def git(*arguments):
            subprocess.run(["git", *arguments], cwd=repository, check=True,
                           capture_output=True)
        git("init", "-q")
        git("config", "user.name", "Packaging test")
        git("config", "user.email", "packaging@example.invalid")
        tracked = repository / "presenter.py"
        tracked.write_text("committed\n")
        git("add", "presenter.py")
        git("commit", "-qm", "fixture")

        for state in ("index", "worktree"):
            with self.subTest(state=state):
                tracked.write_text(f"dirty {state}\n")
                if state == "index":
                    git("add", "presenter.py")
                with self.assertRaisesRegex(ValueError, "differ from HEAD"):
                    PACKAGE.require_clean(repository, ["presenter.py"])
                git("reset", "--hard", "-q", "HEAD")

    def test_verify_rejects_a_claimed_deployment(self):
        output = self.directory / "deployed.tar.gz"
        PACKAGE.create(self.binary, output)
        with tarfile.open(output, "r:gz") as archive:
            files = {item.name.removeprefix(PACKAGE.ROOT_NAME + "/"):
                     archive.extractfile(item).read() for item in archive}
            mtime = archive.getmembers()[0].mtime
        release = json.loads(files["presenter/release.json"])
        release["deployed_at"] = "2026-09-27T10:00:00-06:00"
        files["presenter/release.json"] = (json.dumps(
            release, sort_keys=True, separators=(",", ":")) + "\n").encode()
        files["MANIFEST.txt"] = PACKAGE.manifest(
            {name: files[name] for name in PACKAGE.PAYLOAD}, release)
        with output.open("wb") as raw, gzip.GzipFile(
                filename="", fileobj=raw, mode="wb", mtime=0) as zipped:
            with tarfile.open(fileobj=zipped, mode="w", format=tarfile.PAX_FORMAT) as archive:
                for name in sorted(files):
                    info = tarfile.TarInfo(f"{PACKAGE.ROOT_NAME}/{name}")
                    info.size, info.mode, info.mtime = (len(files[name]),
                        PACKAGE.MODES.get(name, 0o644), mtime)
                    info.uid = info.gid = 0
                    info.uname = info.gname = ""
                    archive.addfile(info, io.BytesIO(files[name]))
        with self.assertRaisesRegex(ValueError, "must not claim deployment"):
            PACKAGE.verify(output)

    def test_verify_rejects_unexpected_member(self):
        output = self.directory / "bad.tar.gz"
        with output.open("wb") as raw, gzip.GzipFile(filename="", fileobj=raw, mode="wb", mtime=0) as zipped:
            with tarfile.open(fileobj=zipped, mode="w") as archive:
                info = tarfile.TarInfo("critter-lab-staging/state.txt")
                info.size = 5
                archive.addfile(info, io.BytesIO(b"state"))
        with self.assertRaisesRegex(ValueError, "unexpected"):
            PACKAGE.verify(output)

    def test_verify_rejects_non_normalized_gzip_header(self):
        output = self.directory / "bundle.tar.gz"
        PACKAGE.create(self.binary, output)
        contents = bytearray(output.read_bytes())
        contents[4] = 1  # A nonzero gzip MTIME is valid, but not canonical here.
        output.write_bytes(contents)
        with self.assertRaisesRegex(ValueError, "gzip wrapper"):
            PACKAGE.verify(output)


if __name__ == "__main__":
    unittest.main()

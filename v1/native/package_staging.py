#!/usr/bin/env python3
"""Create or verify the bounded Linux presenter staging bundle."""
import argparse
from datetime import datetime
import gzip
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import subprocess
import tarfile
import tempfile

ROOT_NAME = "critter-lab-staging"
ARCHIVE_LIMIT = 64 * 1024 * 1024
PAYLOAD = ("bin/critter_lab", "presenter/app.js", "presenter/index.html",
           "presenter/release.json", "presenter/server.py", "presenter/style.css")
MODES = {name: (0o755 if name == "bin/critter_lab" else 0o644) for name in PAYLOAD}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def bounded_tar(path):
    """Bound all expanded bytes, including hidden PAX/GNU extension records."""
    with Path(path).open('rb') as source:
        compressed = source.read(ARCHIVE_LIMIT + 1)
    if len(compressed) > ARCHIVE_LIMIT:
        raise ValueError('compressed archive exceeds bound')
    with gzip.GzipFile(fileobj=io.BytesIO(compressed)) as source:
        expanded = source.read(ARCHIVE_LIMIT + 1)
    if len(expanded) > ARCHIVE_LIMIT:
        raise ValueError('expanded archive exceeds bound')
    return tarfile.open(fileobj=io.BytesIO(expanded), mode='r:')


def git(*arguments):
    return subprocess.check_output(["git", *arguments], cwd=Path(__file__).parents[1],
                                   text=True).strip()


def git_bytes(*arguments):
    return subprocess.check_output(["git", *arguments], cwd=Path(__file__).parents[1])


def release_metadata():
    commit = git("rev-parse", "HEAD")
    expected = os.environ.get("GITHUB_SHA")
    if expected and expected != commit:
        raise ValueError("GITHUB_SHA does not match the checked-out revision")
    timestamp = git("show", "-s", "--format=%cI", "HEAD")
    subject = git("show", "-s", "--format=%s", "HEAD")
    return {"commit": commit, "subject": subject, "committed_at": timestamp,
            "deployed_at": None}


def require_clean(repository, paths):
    """Reject staged or unstaged differences from HEAD for the selected paths."""
    dirty = subprocess.run(["git", "diff", "--quiet", "HEAD", "--", *paths],
                           cwd=repository, check=False)
    if dirty.returncode:
        if dirty.returncode == 1:
            raise ValueError("tracked presenter inputs differ from HEAD")
        raise ValueError("unable to check presenter provenance")


def presenter_files():
    """Return committed presenter inputs, refusing a dirty tracked checkout."""
    repository = Path(__file__).parents[1]
    paths = [f"native/presenter/{name}" for name in
             ("app.js", "index.html", "server.py", "style.css")]
    require_clean(repository, paths)
    files = {}
    for name in ("app.js", "index.html", "server.py", "style.css"):
        path = f"native/presenter/{name}"
        committed = git_bytes("show", f"HEAD:{path}")
        candidate = repository / path
        try:
            current = candidate.read_bytes()
        except OSError as error:
            raise ValueError(f"tracked presenter input differs from HEAD: {path}") from error
        mode = git("ls-tree", "HEAD", path).split()[0]
        current_mode = "100755" if candidate.stat().st_mode & 0o111 else "100644"
        if current != committed or mode != current_mode:
            raise ValueError(f"tracked presenter input differs from HEAD: {path}")
        files[f"presenter/{name}"] = committed
    return files


def manifest(files, metadata):
    lines = ["critter-lab-staging-manifest 1", f"commit {metadata['commit']}",
             "platform linux-x86_64"]
    for name in sorted(files):
        lines.append(f"file {len(files[name])} {digest(files[name])} {name}")
    return ("\n".join(lines) + "\n").encode()


def create(binary, output):
    binary, output = Path(binary), Path(output)
    if output.exists():
        raise ValueError(f"refusing to overwrite {output}")
    data = binary.read_bytes()
    if not data or not os.access(binary, os.X_OK):
        raise ValueError("native binary must be nonempty and executable")
    metadata = release_metadata()
    files = {"bin/critter_lab": data}
    files.update(presenter_files())
    files["presenter/release.json"] = (json.dumps(metadata, sort_keys=True,
                                                   separators=(",", ":")) + "\n").encode()
    files["MANIFEST.txt"] = manifest(files, metadata)
    timestamp = int(git("show", "-s", "--format=%ct", "HEAD"))
    output.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{output.name}.", dir=output.parent)
    os.close(descriptor)
    temporary = Path(temporary_name)
    try:
        with temporary.open("wb") as raw, gzip.GzipFile(filename="", fileobj=raw, mode="wb", mtime=0) as zipped:
            with tarfile.open(fileobj=zipped, mode="w", format=tarfile.PAX_FORMAT) as archive:
                for name in sorted(files):
                    info = tarfile.TarInfo(f"{ROOT_NAME}/{name}")
                    info.size, info.mode, info.mtime = len(files[name]), MODES.get(name, 0o644), timestamp
                    info.uid = info.gid = 0
                    info.uname = info.gname = ""
                    archive.addfile(info, io.BytesIO(files[name]))
        verify(temporary, metadata["commit"])
        try:
            os.link(temporary, output)
        except FileExistsError:
            raise ValueError(f"refusing to overwrite {output}") from None
    finally:
        temporary.unlink(missing_ok=True)


def verify(archive_path, expected_commit=None):
    with Path(archive_path).open('rb') as source:
        header = source.read(10)
    # GzipFile at the default compression level produces XFL=2 and OS=255.
    # Requiring the entire fixed header also rejects all optional fields.
    if header != b"\x1f\x8b\x08\x00\x00\x00\x00\x00\x02\xff":
        raise ValueError("gzip wrapper is not normalized")
    seen = {}
    mtimes = set()
    member_names = []
    with bounded_tar(archive_path) as archive:
        for member in archive:
            path = PurePosixPath(member.name)
            if (member.name.startswith("/") or ".." in path.parts
                    or not path.parts or path.parts[0] != ROOT_NAME or not member.isfile()):
                raise ValueError(f"unsafe or unsupported archive member: {member.name}")
            name = path.relative_to(ROOT_NAME).as_posix()
            if name in seen:
                raise ValueError(f"duplicate archive member: {name}")
            if name not in set(PAYLOAD) | {"MANIFEST.txt"}:
                raise ValueError(f"unexpected archive member: {name}")
            if member.mode != MODES.get(name, 0o644):
                raise ValueError(f"wrong mode for {name}")
            if member.uid or member.gid or member.uname or member.gname:
                raise ValueError(f"non-normalized ownership for {name}")
            if member.pax_headers:
                raise ValueError(f"unexpected PAX metadata for {name}")
            mtimes.add(member.mtime)
            member_names.append(name)
            extracted = archive.extractfile(member)
            seen[name] = extracted.read() if extracted else b""
    required = set(PAYLOAD) | {"MANIFEST.txt"}
    if set(seen) != required:
        raise ValueError(f"missing archive members: {sorted(required - set(seen))}")
    if member_names != sorted(required):
        raise ValueError("archive members are not in canonical order")
    if not seen["bin/critter_lab"]:
        raise ValueError("native binary is empty")
    release = json.loads(seen["presenter/release.json"])
    subject = release.get("subject")
    if (set(release) != {"commit", "subject", "committed_at", "deployed_at"}
            or not isinstance(subject, str) or not 1 <= len(subject) <= 200
            or not subject.strip()
            or any(ord(character) < 32 or ord(character) == 127
                   or character in "\u0085\u2028\u2029" for character in subject)):
        raise ValueError("invalid release metadata")
    if release["deployed_at"] is not None:
        raise ValueError("staging bundle must not claim deployment")
    try:
        committed = datetime.fromisoformat(release["committed_at"].replace("Z", "+00:00"))
        if committed.tzinfo is None or len(mtimes) != 1 or int(committed.timestamp()) not in mtimes:
            raise ValueError()
    except (TypeError, ValueError):
        raise ValueError("invalid commit timestamp") from None
    commit = release.get("commit", "")
    if len(commit) != 40 or any(c not in "0123456789abcdef" for c in commit):
        raise ValueError("invalid release revision")
    if expected_commit and commit != expected_commit:
        raise ValueError("release revision does not match expected revision")
    expected = manifest({name: seen[name] for name in PAYLOAD}, release)
    if seen["MANIFEST.txt"] != expected:
        raise ValueError("manifest content, size, or checksum mismatch")


def main():
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest="command", required=True)
    create_parser = commands.add_parser("create")
    create_parser.add_argument("--binary", required=True)
    create_parser.add_argument("--output", required=True)
    verify_parser = commands.add_parser("verify")
    verify_parser.add_argument("archive")
    verify_parser.add_argument("--commit")
    arguments = parser.parse_args()
    if arguments.command == "create":
        create(arguments.binary, arguments.output)
    else:
        verify(arguments.archive, arguments.commit)


if __name__ == "__main__":
    main()

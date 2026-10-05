"""Manual native release retrieval and trusted admission helpers."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from datetime import datetime, timezone


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, url):
        return None


class GitHubClient:
    """Bounded HTTPS retrieval; credentials stay on the API origin."""
    def __init__(self, token, timeout=15, limit=64 * 1024 * 1024, public=False):
        if not public and (not isinstance(token, str) or not token.strip()):
            raise ValueError("authenticated GitHub token required")
        self.token, self.timeout, self.limit = ('' if public else (token or '').strip()), timeout, limit
        self.opener = urllib.request.build_opener(NoRedirect())

    def read(self, url, limit=None, accept='application/vnd.github+json'):
        limit = self.limit if limit is None else min(limit, self.limit)
        for redirect in range(5):
            parsed = urllib.parse.urlsplit(url)
            if parsed.scheme != "https" or parsed.username or parsed.password or parsed.fragment:
                raise ValueError("unsafe artifact URL")
            headers = {"Accept": accept, "User-Agent": "critter-lab-manual-updater"}
            if parsed.netloc == "api.github.com":
                if self.token:
                    headers["Authorization"] = "Bearer " + self.token
                headers["X-GitHub-Api-Version"] = "2022-11-28"
            request = urllib.request.Request(url, headers=headers)
            try:
                response = self.opener.open(request, timeout=self.timeout)
            except urllib.error.HTTPError as error:
                if error.code not in (301, 302, 303, 307, 308):
                    raise ValueError("GitHub retrieval failed") from None
                location = error.headers.get("Location")
                error.close()
                if not location:
                    raise ValueError("redirect lacks location")
                url = urllib.parse.urljoin(url, location)
                continue
            with response:
                length = response.headers.get("Content-Length")
                if length is not None and (not length.isdecimal() or int(length) > limit):
                    raise ValueError("response exceeds byte limit")
                data = response.read(limit + 1)
                if len(data) > limit:
                    raise ValueError("response exceeds byte limit")
                return data
        raise ValueError("too many artifact redirects")

    def metadata(self, path):
        try:
            value = json.loads(self.read("https://api.github.com/repos/" + REPOSITORY + path, 2_000_000))
        except (ValueError, UnicodeError):
            raise ValueError("invalid GitHub metadata") from None
        if not isinstance(value, dict):
            raise ValueError("GitHub metadata must be an object")
        return value


def instant(value):
    if not isinstance(value, str):
        raise ValueError("missing provenance timestamp")
    result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if result.tzinfo is None:
        raise ValueError("provenance timestamp needs timezone")
    return result

REPOSITORY = "PacoCotera/critter-lab"
WORKFLOW = ".github/workflows/native-build.yml"
SHA = re.compile(r"[0-9a-f]{40}\Z")
HASH = re.compile(r"[0-9a-f]{64}\Z")
PROMOTION_FIELDS = {
    "schema", "repository", "workflow", "sha", "run_id", "attempt",
    "artifact_id", "artifact_name", "archive_sha256", "bundle_sha256",
}


def validate_promotion(record):
    """Accept identities and digests only; no paths or execution settings."""
    if not isinstance(record, dict) or set(record) != PROMOTION_FIELDS:
        raise ValueError("promotion fields do not match schema")
    if type(record["schema"]) is not int or record["schema"] != 1:
        raise ValueError("unsupported promotion schema")
    if record["repository"] != REPOSITORY or record["workflow"] != WORKFLOW:
        raise ValueError("unexpected repository or workflow")
    for name in ("run_id", "attempt", "artifact_id"):
        if type(record[name]) is not int or record[name] <= 0:
            raise ValueError(f"invalid {name}")
    if not isinstance(record["sha"], str) or not SHA.fullmatch(record["sha"]):
        raise ValueError("full lowercase commit SHA required")
    for name in ("archive_sha256", "bundle_sha256"):
        if not isinstance(record[name], str) or not HASH.fullmatch(record[name]):
            raise ValueError(f"invalid {name}")
    if record["artifact_name"] != "native-lab-" + record["sha"]:
        raise ValueError("artifact name does not bind the selected SHA")
    return dict(record)


def verify_provenance(client, record):
    record = validate_promotion(record)
    run_path = f'/actions/runs/{record["run_id"]}'
    current = client.metadata(run_path)
    run = client.metadata(run_path + f'/attempts/{record["attempt"]}')
    artifact = client.metadata(f'/actions/artifacts/{record["artifact_id"]}')
    for value in (current, run):
        if (value.get('id') != record['run_id'] or value.get('run_attempt') != record['attempt']
                or value.get('event') != 'push' or value.get('head_branch') != 'main'
                or value.get('head_sha') != record['sha'] or value.get('path') != WORKFLOW
                or value.get('status') != 'completed' or value.get('conclusion') != 'success'
                or value.get('repository', {}).get('full_name') != REPOSITORY
                or value.get('head_repository', {}).get('full_name') != REPOSITORY):
            raise ValueError('run does not match trusted main promotion')
    binding = artifact.get('workflow_run', {})
    if (artifact.get('id') != record['artifact_id'] or artifact.get('name') != record['artifact_name']
            or artifact.get('expired') is not False
            or artifact.get('digest') != 'sha256:' + record['archive_sha256']
            or binding.get('id') != record['run_id'] or binding.get('head_sha') != record['sha']
            or binding.get('head_branch') != 'main'
            or binding.get('repository_id') != current['repository']['id']
            or binding.get('head_repository_id') != current['repository']['id']):
        raise ValueError('artifact does not match selected run')
    created = instant(artifact.get('created_at'))
    if not instant(run.get('run_started_at')) <= created <= instant(run.get('updated_at')):
        raise ValueError('artifact predates selected attempt')
    if instant(artifact.get('expires_at')) <= datetime.now(timezone.utc):
        raise ValueError('artifact expired')
    comparison = client.metadata('/compare/' + record['sha'] + '...main')
    if (comparison.get('status') not in ('ahead', 'identical')
            or comparison.get('merge_base_commit', {}).get('sha') != record['sha']):
        raise ValueError('promotion no longer belongs to trusted main')
    return artifact


def inner_bundle(archive, sha, limit=64 * 1024 * 1024):
    if len(archive) > limit:
        raise ValueError('archive exceeds limit')
    seen, selected, total = set(), None, 0
    with zipfile.ZipFile(io.BytesIO(archive)) as source:
        if len(source.infolist()) > 32:
            raise ValueError('too many ZIP members')
        for member in source.infolist():
            path = PurePosixPath(member.filename)
            mode = member.external_attr >> 16
            if (member.filename in seen or path.is_absolute() or '..' in path.parts
                    or '\\' in member.filename or member.is_dir()
                    or (mode & 0o170000) not in (0, 0o100000)):
                raise ValueError('unsafe ZIP member')
            seen.add(member.filename)
            total += member.file_size
            if total > limit or member.flag_bits & 1:
                raise ValueError('ZIP payload exceeds bounds')
            if path.name == f'critter-lab-staging-{sha}.tar.gz':
                if selected is not None:
                    raise ValueError('ambiguous staging bundle')
                selected = source.read(member)
    if selected is None:
        raise ValueError('staging bundle missing')
    return selected


def fetch(client, record, incoming):
    artifact = verify_provenance(client, record)
    data = client.read(f'https://api.github.com/repos/{REPOSITORY}/actions/artifacts/{record["artifact_id"]}/zip')
    if len(data) != artifact.get('size_in_bytes') or hashlib.sha256(data).hexdigest() != record['archive_sha256']:
        raise ValueError('artifact digest or size mismatch')
    bundle = inner_bundle(data, record['sha'])
    if hashlib.sha256(bundle).hexdigest() != record['bundle_sha256']:
        raise ValueError('inner bundle digest mismatch')
    incoming = Path(incoming)
    incoming.mkdir(parents=True, exist_ok=True)
    target = incoming / (record['sha'] + '.tar.gz')
    with target.open('xb') as output:
        output.write(bundle)
        output.flush()
        os.fsync(output.fileno())
    return target

"""Portable provenance and transport rejection checks; no real credentials."""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import io
import json
from pathlib import Path
import sys
import unittest
import urllib.error
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import updater

SHA = 'a' * 40
RECORD = dict(schema=1, repository=updater.REPOSITORY, workflow=updater.WORKFLOW,
              sha=SHA, run_id=10, attempt=2, artifact_id=20,
              artifact_name='native-lab-' + SHA, archive_sha256='b' * 64, bundle_sha256='c' * 64)


class Metadata:
    def __init__(self):
        now = datetime.now(timezone.utc)
        self.run = dict(id=10, run_attempt=2, event='push', head_branch='main', head_sha=SHA,
                        path=updater.WORKFLOW, status='completed', conclusion='success',
                        repository=dict(full_name=updater.REPOSITORY, id=1),
                        head_repository=dict(full_name=updater.REPOSITORY, id=1),
                        run_started_at=(now - timedelta(minutes=2)).isoformat(), updated_at=now.isoformat())
        self.artifact = dict(id=20, name='native-lab-' + SHA, expired=False,
                             digest='sha256:' + 'b' * 64, size_in_bytes=10,
                             created_at=(now - timedelta(minutes=1)).isoformat(),
                             expires_at=(now + timedelta(days=1)).isoformat(),
                             workflow_run=dict(id=10, head_sha=SHA, head_branch='main', repository_id=1, head_repository_id=1))
        self.comparison = dict(status='ahead', merge_base_commit=dict(sha=SHA))

    def metadata(self, path):
        if path.startswith('/compare/'):
            return self.comparison
        if path.startswith('/actions/artifacts/'):
            return self.artifact
        return self.run


class UpdaterChecks(unittest.TestCase):
    def test_valid_provenance_and_exact_schema(self):
        updater.verify_provenance(Metadata(), RECORD)
        for changes in ({'extra': 1}, {'attempt': True}, {'sha': 'A' * 40}, {'repository': 'fork/repo'}):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                updater.validate_promotion({**RECORD, **changes})

    def test_run_rejections(self):
        for key, value in [('event', 'pull_request'), ('event', 'workflow_dispatch'), ('head_branch', 'topic'),
                           ('head_sha', 'd' * 40), ('run_attempt', 1), ('path', 'other.yml'), ('conclusion', 'failure')]:
            client = Metadata()
            client.run[key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                updater.verify_provenance(client, RECORD)

    def test_artifact_rejections(self):
        for key, value in [('expired', True), ('id', 21), ('digest', 'sha256:' + 'd' * 64),
                           ('created_at', '2020-01-01T00:00:00Z'), ('expires_at', '2020-01-01T00:00:00Z')]:
            client = Metadata()
            client.artifact[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                updater.verify_provenance(client, RECORD)
        client = Metadata()
        client.artifact['workflow_run']['head_repository_id'] = 2
        with self.assertRaises(ValueError):
            updater.verify_provenance(client, RECORD)

    def test_rewritten_main_rejected(self):
        client = Metadata()
        client.comparison['merge_base_commit']['sha'] = 'd' * 40
        with self.assertRaises(ValueError):
            updater.verify_provenance(client, RECORD)

    def test_zip_selection_bounds_and_ambiguity(self):
        def archive(names):
            output = io.BytesIO()
            with zipfile.ZipFile(output, 'w') as target:
                for name in names:
                    target.writestr(name, b'bundle')
            return output.getvalue()
        name = f'critter-lab-staging-{SHA}.tar.gz'
        self.assertEqual(updater.inner_bundle(archive([name]), SHA), b'bundle')
        for names in ([name, '../escape'], [name, 'other/' + name], ['missing']):
            with self.subTest(names=names), self.assertRaises(ValueError):
                updater.inner_bundle(archive(names), SHA)
        with self.assertRaises(ValueError):
            updater.inner_bundle(archive([name]), SHA, 1)

    def test_redirect_does_not_forward_token(self):
        requests = []
        class Response(io.BytesIO):
            headers = {}
        class Opener:
            def open(self, request, timeout):
                requests.append(request)
                if len(requests) == 1:
                    raise urllib.error.HTTPError(request.full_url, 302, 'redirect',
                                                 {'Location': 'https://artifact.example/file'}, None)
                return Response(b'zip')
        client = updater.GitHubClient('TEST_ONLY_TOKEN')
        client.opener = Opener()
        self.assertEqual(client.read('https://api.github.com/artifact'), b'zip')
        self.assertIn('Authorization', requests[0].headers)
        self.assertNotIn('Authorization', requests[1].headers)
        with self.assertRaises(ValueError):
            client.read('http://artifact.example/file')


if __name__ == '__main__':
    unittest.main()

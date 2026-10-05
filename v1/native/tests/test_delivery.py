"""Signed queue and independently verified public release tests; fixture metadata only."""
import gzip
import hashlib
import hmac
from http.server import HTTPServer
import io
import json
import os
import socket
from pathlib import Path
import sys
import tarfile
import tempfile
import threading
import time
import unittest
import uuid
import urllib.request
import urllib.error

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import package_staging
import release_delivery
from test_updater import Metadata, SHA


def bundle_fixture():
    metadata = dict(commit=SHA, subject='Fixture', committed_at='2026-09-26T00:00:00+00:00', deployed_at=None)
    files = {name: b'fixture' for name in package_staging.PAYLOAD}
    files['presenter/release.json'] = json.dumps(metadata).encode()
    files['MANIFEST.txt'] = package_staging.manifest({name: files[name] for name in package_staging.PAYLOAD}, metadata)
    from datetime import datetime
    timestamp = int(datetime.fromisoformat(metadata['committed_at']).timestamp())
    output = io.BytesIO()
    with gzip.GzipFile(filename='', fileobj=output, mode='wb', mtime=0) as compressed:
        with tarfile.open(fileobj=compressed, mode='w', format=tarfile.PAX_FORMAT) as archive:
            for name in sorted(files):
                member = tarfile.TarInfo(package_staging.ROOT_NAME + '/' + name)
                member.size, member.mode, member.mtime = len(files[name]), package_staging.MODES.get(name, 0o644), timestamp
                archive.addfile(member, io.BytesIO(files[name]))
    return output.getvalue()


class ReleaseFixture(Metadata):
    def __init__(self):
        super().__init__()
        bundle = bundle_fixture()
        delivery = dict(schema=1, repository=release_delivery.REPOSITORY, sha=SHA,
                        workflow=release_delivery.WORKFLOW, run_id=10, attempt=2,
                        bundle=f'critter-lab-staging-{SHA}.tar.gz', bundle_sha256=hashlib.sha256(bundle).hexdigest(),
                        save_format='CRITTER_DEMO 1')
        self.data = {1: bundle, 2: json.dumps(delivery).encode()}
        self.release = dict(id=30, draft=False, tag_name='staging-' + SHA, assets=[
            dict(id=index, name=delivery['bundle'] if index == 1 else 'delivery.json',
                 size=len(data), state='uploaded', digest='sha256:' + hashlib.sha256(data).hexdigest())
            for index, data in self.data.items()])
        self.ref = dict(object=dict(type='commit', sha=SHA))
        self.direction = dict(status='ahead', merge_base_commit=dict(sha='0' * 40))

    def metadata(self, path):
        if path == '/releases/30':
            return self.release
        if path.startswith('/git/ref/'):
            return self.ref
        if path.startswith('/compare/') and not path.endswith('...main'):
            return self.direction
        return super().metadata(path)

    def read(self, url, limit, accept):
        return self.data[int(url.rsplit('/', 1)[1])]


class DeliveryChecks(unittest.TestCase):
    def test_verified_public_release(self):
        delivery, bundle = release_delivery.verified_release(ReleaseFixture(), 30, SHA)
        self.assertEqual(delivery['bundle_sha256'], hashlib.sha256(bundle).hexdigest())

    def test_wrong_tag_run_and_asset_rejected(self):
        client = ReleaseFixture()
        client.ref['object']['sha'] = 'd' * 40
        with self.assertRaises(ValueError):
            release_delivery.verified_release(client, 30, SHA)

    def test_automatic_direction_is_forward_only(self):
        accepted = '0' * 40
        release_delivery.verified_release(ReleaseFixture(), 30, SHA, accepted)
        for status, base in (('identical', accepted), ('behind', accepted), ('diverged', accepted), ('ahead', 'd' * 40)):
            client = ReleaseFixture()
            client.direction = dict(status=status, merge_base_commit=dict(sha=base))
            with self.subTest(status=status), self.assertRaises(ValueError):
                release_delivery.verified_release(client, 30, SHA, accepted)
        client = ReleaseFixture()
        client.run['event'] = 'pull_request'
        with self.assertRaises(ValueError):
            release_delivery.verified_release(client, 30, SHA)
        client = ReleaseFixture()
        client.data[1] += b'tampering'
        with self.assertRaises(ValueError):
            release_delivery.verified_release(client, 30, SHA)

    def test_hidden_expansion_bound_is_portable(self):
        previous = package_staging.ARCHIVE_LIMIT
        package_staging.ARCHIVE_LIMIT = 1024
        try:
            with tempfile.TemporaryDirectory() as temporary:
                path = Path(temporary) / 'expanded.gz'
                path.write_bytes(gzip.compress(b'\0' * 2048))
                with self.assertRaises(ValueError):
                    package_staging.bounded_tar(path)
        finally:
            package_staging.ARCHIVE_LIMIT = previous


if __name__ == '__main__':
    unittest.main()

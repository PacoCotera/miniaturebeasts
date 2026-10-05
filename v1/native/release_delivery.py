"""Public release verification for queued notifications; no service or save access."""
import hashlib
import json
from pathlib import Path
import re
import tempfile

import package_staging
from updater import GitHubClient, REPOSITORY, WORKFLOW, instant

FIELDS = {'schema', 'repository', 'sha', 'workflow', 'run_id', 'attempt', 'bundle', 'bundle_sha256', 'save_format'}


def asset_bytes(client, asset, limit):
    if (type(asset.get('id')) is not int or asset['id'] <= 0
            or type(asset.get('size')) is not int or not 0 < asset['size'] <= limit
            or asset.get('state') != 'uploaded'
            or not re.fullmatch('sha256:[0-9a-f]{64}', asset.get('digest', ''))):
        raise ValueError('unbounded or unhashed release asset')
    data = client.read(f'https://api.github.com/repos/{REPOSITORY}/releases/assets/{asset["id"]}',
                       limit, accept='application/octet-stream')
    if len(data) != asset['size'] or 'sha256:' + hashlib.sha256(data).hexdigest() != asset['digest']:
        raise ValueError('release asset digest mismatch')
    return data


def verified_release(client, release_id, sha, accepted=None):
    if type(release_id) is not int or release_id <= 0 or not re.fullmatch('[0-9a-f]{40}', sha):
        raise ValueError('invalid queued release identity')
    release = client.metadata(f'/releases/{release_id}')
    if release.get('id') != release_id or release.get('draft') is not False or release.get('tag_name') != 'staging-' + sha:
        raise ValueError('release identity mismatch')
    ref = client.metadata('/git/ref/tags/staging-' + sha)['object']
    for depth in range(5):
        if ref.get('type') == 'commit':
            break
        if ref.get('type') != 'tag' or not re.fullmatch('[0-9a-f]{40}', ref.get('sha', '')):
            raise ValueError('invalid release tag')
        ref = client.metadata('/git/tags/' + ref['sha'])['object']
    if ref.get('type') != 'commit' or ref.get('sha') != sha:
        raise ValueError('release tag points elsewhere')
    assets = release.get('assets', [])
    expected_bundle = f'critter-lab-staging-{sha}.tar.gz'
    if len(assets) != 2 or {item.get('name') for item in assets} != {'delivery.json', expected_bundle}:
        raise ValueError('incomplete or ambiguous release assets')
    indexed = {item['name']: item for item in assets}
    delivery = json.loads(asset_bytes(client, indexed['delivery.json'], 10000))
    if (set(delivery) != FIELDS or type(delivery['schema']) is not int or delivery['schema'] != 1
            or delivery['repository'] != REPOSITORY or delivery['workflow'] != WORKFLOW
            or delivery['sha'] != sha or delivery['bundle'] != expected_bundle
            or delivery['save_format'] != 'CRITTER_DEMO 1'
            or not re.fullmatch('[0-9a-f]{64}', delivery['bundle_sha256'])):
        raise ValueError('delivery metadata mismatch')
    for name in ('run_id', 'attempt'):
        if type(delivery[name]) is not int or delivery[name] <= 0:
            raise ValueError('invalid delivery run')
    run_path = f'/actions/runs/{delivery["run_id"]}'
    current = client.metadata(run_path)
    run = client.metadata(run_path + f'/attempts/{delivery["attempt"]}')
    for value in (current, run):
        if (value.get('id') != delivery['run_id'] or value.get('run_attempt') != delivery['attempt']
                or value.get('event') != 'push' or value.get('head_branch') != 'main'
                or value.get('head_sha') != sha or value.get('path') != WORKFLOW
                or value.get('status') != 'completed' or value.get('conclusion') != 'success'
                or value.get('repository', {}).get('full_name') != REPOSITORY
                or value.get('head_repository', {}).get('full_name') != REPOSITORY):
            raise ValueError('release run not yet successful trusted main')
    comparison = client.metadata('/compare/' + sha + '...main')
    if comparison.get('status') not in ('ahead', 'identical') or comparison.get('merge_base_commit', {}).get('sha') != sha:
        raise ValueError('release no longer belongs to main')
    if accepted is not None:
        if not re.fullmatch('[0-9a-f]{40}', accepted):
            raise ValueError('invalid accepted revision')
        direction = client.metadata('/compare/' + accepted + '...' + sha)
        if direction.get('status') != 'ahead' or direction.get('merge_base_commit', {}).get('sha') != accepted:
            raise ValueError('obsolete release; automatic downgrade rejected')
    data = asset_bytes(client, indexed[expected_bundle], 64 * 1024 * 1024)
    if hashlib.sha256(data).hexdigest() != delivery['bundle_sha256']:
        raise ValueError('delivery bundle digest mismatch')
    with tempfile.TemporaryDirectory() as temporary:
        path = Path(temporary) / 'bundle.tar.gz'
        path.write_bytes(data)
        package_staging.verify(path, sha)
    return delivery, data

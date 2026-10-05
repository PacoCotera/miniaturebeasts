// Inspect actual handoff files and one regeneration; this is not visual approval.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const sharp = require('sharp');

const root = __dirname;
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');

async function main() {
  const tracked = ['manifest.json', 'fixtures.json'];
  for (const directory of ['src', 'exports']) {
    for (const name of fs.readdirSync(path.join(root, directory)).sort()) {
      if (/\.(svg|png)$/.test(name)) tracked.push(`${directory}/${name}`);
    }
  }
  const before = new Map(tracked.map(file => [file, digest(file)]));
  execFileSync(process.execPath, [path.join(root, 'build.cjs')], { stdio: 'inherit' });
  for (const [file, hash] of before) assert.equal(digest(file), hash, `Regeneration changed ${file}`);

  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  const names = new Set();
  for (const asset of manifest.assets) {
    assert(!names.has(asset.name), `Duplicate asset ${asset.name}`);
    names.add(asset.name);
    assert.equal(digest(asset.source), asset.sha256, `${asset.name} source hash`);
    assert.equal(digest(asset.export), asset.exportSha256, `${asset.name} export hash`);
    const { data, info } = await sharp(path.join(root, asset.export)).raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, asset.width, `${asset.name} width`);
    assert.equal(info.height, asset.height, `${asset.name} height`);
    assert.equal(info.channels, 4, `${asset.name} must retain RGBA`);
    assert.equal(asset.drawScale, 1, `${asset.name} native draw scale`);
    let transparent = false;
    let opaque = false;
    let left = info.width;
    let top = info.height;
    let right = -1;
    let bottom = -1;
    for (let offset = 3; offset < data.length; offset += 4) {
      transparent ||= data[offset] === 0;
      opaque ||= data[offset] === 255;
      if (data[offset] >= 128) {
        const pixel = (offset - 3) / 4;
        const x = pixel % info.width;
        const y = Math.floor(pixel / info.width);
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
    assert(transparent && opaque, `${asset.name} must have real silhouette alpha and opaque artwork`);
    assert.deepEqual(asset.occupiedBoundsAtHalfAlpha,
      { x: left, y: top, width: right - left + 1, height: bottom - top + 1 },
      `${asset.name} painted bounds must describe actual pixels`);
  }
  const sourceCount = fs.readdirSync(path.join(root, 'src')).filter(file => file.endsWith('.svg')).length;
  assert.equal(names.size, sourceCount, 'Every master must be exported');
  const fixtures = JSON.parse(fs.readFileSync(path.join(root, manifest.fixtures.source), 'utf8'));
  assert.equal(digest(manifest.fixtures.source), manifest.fixtures.sha256, 'Fixture source hash');
  assert.deepEqual(fixtures.states.map(state => state.export), manifest.fixtures.exports);
  const proofs = [];
  for (const state of fixtures.states) {
    const file = `exports/${state.export}`;
    const proof = await sharp(path.join(root, file)).metadata();
    assert.deepEqual([proof.width, proof.height], [1024, 600], `${state.id} native panel dimensions`);
    if (state.provenance.sourceCapture) {
      assert.equal(digest(state.provenance.sourceCapture), state.provenance.sourceCaptureSha256,
        `${state.id} recorded game capture must remain traceable`);
    }
    proofs.push({ state: state.id, file, pixels: [proof.width, proof.height], sha256: digest(file) });
  }
  const native = await sharp(path.join(root, 'exports/sheet-native.png')).raw().toBuffer({ resolveWithObject: true });
  const large = await sharp(path.join(root, 'exports/sheet-3x.png')).raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([large.info.width, large.info.height, large.info.channels], [native.info.width * 3, native.info.height * 3, native.info.channels]);
  for (let y = 0; y < large.info.height; y++) {
    for (let x = 0; x < large.info.width; x++) {
      const smallOffset = (Math.floor(y / 3) * native.info.width + Math.floor(x / 3)) * native.info.channels;
      const largeOffset = (y * large.info.width + x) * large.info.channels;
      for (let channel = 0; channel < native.info.channels; channel++) {
        assert.equal(large.data[largeOffset + channel], native.data[smallOffset + channel], 'Enlargement changed source pixels');
      }
    }
  }
  const evidence = {
    result: 'pass',
    scope: 'One local regeneration and actual export inspection; not visual or runtime acceptance',
    assets: names.size,
    reproducibleFiles: tracked.length,
    rgbaSilhouettes: true,
    proofs,
    exactNearestNeighborEnlargement: 3,
    fixturesSha256: digest('fixtures.json'),
    manifestSha256: digest('manifest.json'),
    versions: { node: process.versions.node, sharp: sharp.versions.sharp, vips: sharp.versions.vips },
  };
  fs.writeFileSync(path.join(root, 'verification.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

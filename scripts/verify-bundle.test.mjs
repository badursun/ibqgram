import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('public verifier rejects modified, extra and symlinked bundle files without credentials', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'icqram-integrity-'));
  const app = path.join(root, 'icqram.app');
  const manifest = path.join(root, 'manifest.json');
  const tool = fileURLToPath(new URL('./verify-bundle.py', import.meta.url));
  const run = () => spawnSync('python3', [tool, manifest, app], { encoding: 'utf8' });
  try {
    await mkdir(app);
    await writeFile(path.join(app, 'asset'), 'original');
    await writeFile(manifest, JSON.stringify({ 'telegram-native': { asset: createHash('sha256').update('original').digest('hex') } }));
    assert.equal(run().status, 0);
    await writeFile(path.join(app, 'asset'), 'modified');
    assert.equal(run().status, 1);
    await writeFile(path.join(app, 'asset'), 'original');
    await writeFile(path.join(app, 'extra'), 'unexpected');
    assert.equal(run().status, 1);
    await rm(path.join(app, 'extra'));
    await rm(path.join(app, 'asset'));
    await writeFile(path.join(root, 'external'), 'original');
    await symlink(path.join(root, 'external'), path.join(app, 'asset'));
    assert.equal(run().status, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

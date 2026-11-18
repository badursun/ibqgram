import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreviewServer } from './serve.mjs';

test('preview serves only public assets, never project secrets or source checkout', async t => {
  const server = createPreviewServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const home = await fetch(base);
  assert.equal(home.status, 200);
  const html = await home.text();
  assert.match(html, /IBQgram — Giriş/);
  assert.doesNotMatch(html, /DEMO|· demo|Yerel önizleme/);
  for (const pathname of ['/.env', '/../.env', '/%2e%2e/.env', '/desktop/tdesktop/LICENSE', '/.git/config', '/scripts/serve.mjs']) {
    assert.equal((await fetch(base + pathname)).status, 404, pathname);
  }
  assert.equal((await fetch(base, { method: 'POST', body: 'message' })).status, 405);
  const script = await fetch(base + '/app.js');
  assert.match(script.headers.get('content-type'), /javascript/);
  assert.equal((await fetch(base, { method: 'HEAD' })).status, 200);
  const svg = await fetch(base + '/assets/brand/animations/icqram-logo-connecting.svg');
  assert.equal(svg.status, 200);
  assert.match(svg.headers.get('content-type'), /image\/svg\+xml/);
  const vector = await svg.text();
  assert.match(vector, /prefers-reduced-motion/);
  assert.doesNotMatch(vector, /<image|<script|<text[ >]/);
  assert.equal((await fetch(base + '/sounds/not-whitelisted.mp3')).status, 404);
});

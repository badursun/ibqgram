import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../prototype/bridge.js', import.meta.url), 'utf8');
function host(native = true) {
  const sent = [], listeners = {};
  const window = { addEventListener(name, fn) { listeners[name] = fn; } };
  if (native) window.icqramHost = { postMessage(text) { sent.push(JSON.parse(text)); } };
  vm.runInNewContext(source, { window, setTimeout, clearTimeout });
  return { window, sent, listeners };
}
test('browser never fabricates account or delivery success', async () => {
  const { window } = host(false);
  assert.equal((await window.icqram.request('bootstrap')).auth, 'phone');
  for (const method of ['auth.phone', 'auth.code', 'auth.password', 'auth.qr', 'chat.send']) {
    await assert.rejects(window.icqram.request(method), { code: 'CONNECTION_UNAVAILABLE' });
  }
});
test('native replies must match request id and protocol version; late duplicate replies are ignored', async () => {
  const { window, sent } = host();
  const result = window.icqram.request('auth.phone', { phone: '+905551234567' });
  const id = sent[0].id;
  window.icqramReceive({ version: 2, id, result: { auth: 'ready' } });
  window.icqramReceive({ version: 1, id: id + 1, result: { auth: 'ready' } });
  window.icqramReceive({ version: 1, id, result: { auth: 'code' } });
  assert.equal((await result).auth, 'code');
  window.icqramReceive({ version: 1, id, result: { auth: 'ready' } });
});
test('host errors reject and page departure cancels outstanding work', async () => {
  const { window, sent, listeners } = host();
  const error = assert.rejects(window.icqram.request('chat.send'), { code: 'CONNECTION_UNAVAILABLE' });
  window.icqramReceive({ version: 1, id: sent[0].id, error: 'CONNECTION_UNAVAILABLE' });
  await error;
  const cancelled = assert.rejects(window.icqram.request('auth.qr'), { code: 'CANCELLED' });
  listeners.pagehide(); await cancelled;
  await assert.rejects(window.icqram.request('eval'), { code: 'UNSUPPORTED_METHOD' });
});

test('presence updates remain mutable while the native view and API stay frozen',()=>{
 const listeners={},sent=[],window={icqramView:Object.freeze({kind:'chat',localPresence:'AW'}),addEventListener(){},icqramHost:{postMessage(x){sent.push(x);}}};
 const document={documentElement:{dataset:{}},addEventListener(n,f){listeners[n]=f;}};
 vm.runInNewContext(source,{window,document,setTimeout,clearTimeout});
 assert.equal(window.icqram.presence,'AW');listeners['icqram-presence-changed']({detail:{code:'DND'}});
 assert.equal(window.icqram.presence,'DND');assert.equal(window.icqramView.localPresence,'AW');assert.equal(Object.isFrozen(window.icqram),true);assert.equal(sent.length,0);
 listeners['icqram-presence-changed']({detail:{code:'INVALID'}});assert.equal(window.icqram.presence,'DND');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../prototype/boot.js', import.meta.url), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));
function boot({ native = true, search = '', handler, view } = {}) {
  const elements = new Map(), events = [], timers = [], calls = [];
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, { hidden: false, inert: false, value: '', disabled: false, textContent: '', listeners: {}, focus() {}, addEventListener(type, action) { this.listeners[type] = action; } });
    return elements.get(selector);
  };
  const document = { querySelector: element, addEventListener() {}, dispatchEvent(event) { events.push(event); } };
  const window = { icqramView:view, icqram: { native, request(method, params) { calls.push({ method, params }); return handler ? handler(method, params) : Promise.resolve({ auth: 'phone', connected: false }); } }, ICQAudio: { play() {}, stop() {}, setEnabled() {} } };
  vm.runInNewContext(source, { document, window, location: { search }, URLSearchParams, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }, setTimeout(fn, duration) { timers.push({ fn, duration }); } });
  return { element, events, calls, timers, submit() { element('#login-form').listeners.submit({ preventDefault() {} }); } };
}
test('native startup ignores scene URLs and timer alone never authorizes an account', async () => {
  let resolve;
  const app = boot({ search: '?screen=contacts', handler: () => new Promise(done => { resolve = done; }) });
  assert.equal(app.timers[0].duration, 2600);
  app.timers[0].fn();
  assert.equal(app.element('#desktop').hidden, true);
  assert.equal(app.element('#login-submit').disabled, true);
  resolve({ auth: 'phone', connected: false }); await flush();
  assert.equal(app.element('#desktop').hidden, true);
  assert.equal(app.element('#login-screen').hidden, false);
  assert.equal(app.element('#login-submit').disabled, false);
});
test('a verified saved session opens contacts only after the startup interval', async () => {
  const app = boot({ handler: () => Promise.resolve({ auth: 'ready', connected: true }) });
  await flush();
  assert.equal(app.element('#desktop').hidden, true);
  app.timers[0].fn();
  assert.equal(app.element('#desktop').hidden, false);
  assert.equal(app.element('#login-screen').hidden, true);
});
test('phone, code and password follow host responses; password is cleared on failure', async () => {
  const app = boot({ handler: method => {
    if (method === 'bootstrap') return Promise.resolve({ auth: 'phone' });
    if (method === 'auth.phone') return Promise.resolve({ auth: 'code' });
    if (method === 'auth.code') return Promise.resolve({ auth: 'password' });
    return Promise.reject({ code: 'PASSWORD_HASH_INVALID' });
  } });
  await flush(); app.timers[0].fn();
  app.element('#login-phone').value = '+90 555 123 45 67'; app.submit(); await flush();
  assert.equal(app.calls[1].params.phone, '+905551234567');
  assert.equal(app.element('#code-step').hidden, false);
  app.element('#login-code').value = '123456'; app.submit(); await flush();
  assert.equal(app.element('#password-step').hidden, false);
  app.element('#login-password').value = 'test-only-password'; app.submit(); await flush();
  assert.equal(app.element('#login-password').value, '');
  assert.equal(app.element('#desktop').hidden, true);
  assert.equal(app.element('#login-error').textContent, 'Parolanı kontrol et.');
});
test('invalid phone does not reach host and rejected request never advances login', async () => {
  const app = boot({ handler: method => method === 'bootstrap' ? Promise.resolve({ auth: 'phone' }) : Promise.reject({ code: 'CONNECTION_UNAVAILABLE' }) });
  await flush(); app.timers[0].fn();
  app.element('#login-phone').value = '123'; app.submit(); await flush();
  assert.equal(app.calls.length, 1);
  app.element('#login-phone').value = '+905551234567'; app.submit(); await flush();
  assert.equal(app.element('#phone-step').hidden, false);
  assert.equal(app.element('#desktop').hidden, true);
});

test('returning to phone asks the host to reset and clears code and password', async () => {
  const app = boot({ handler: method => Promise.resolve({ auth: method === 'bootstrap' ? 'password' : 'phone' }) });
  await flush(); app.timers[0].fn();
  app.element('#login-code').value = '12345';
  app.element('#login-password').value = 'discard-this-password';
  assert.equal(app.element('#login-back').hidden, false);
  app.element('#login-back').listeners.click(); await flush();
  assert.equal(app.calls.at(-1).method, 'auth.reset');
  assert.equal(app.element('#phone-step').hidden, false);
  assert.equal(app.element('#login-code').value, '');
  assert.equal(app.element('#login-password').value, '');
  assert.equal(app.element('#desktop').hidden, true);
});

test('server rejection keeps the login step and silent errors do not produce generic warnings', async () => {
  let reject;
  const app = boot({ handler: method => method === 'bootstrap' ? Promise.resolve({ auth: 'phone' }) : new Promise((_, fail) => { reject = fail; }) });
  await flush(); app.timers[0].fn();
  app.element('#login-phone').value = '+905551234567';
  app.submit(); app.submit();
  assert.equal(app.calls.length, 2);
  assert.equal(app.element('#login-back').disabled, true);
  reject({ code: 'SILENT' }); await flush();
  assert.equal(app.element('#login-error').textContent, '');
  assert.equal(app.element('#phone-step').hidden, false);
  assert.equal(app.element('#desktop').hidden, true);
  assert.equal(app.element('#login-submit').disabled, false);
});

test('native full-screen startup dismisses only after routing and keeps the inline box hidden',async()=>{
 const a=boot({view:{kind:'contacts',nativeStartup:true},handler:()=>Promise.resolve({auth:'ready'})});
 assert.equal(a.element('#startup-overlay').hidden,true);assert.equal(a.calls.some(c=>c.method==='startup.finish'),false);
 await flush();a.timers[0].fn();await flush();assert.equal(a.element('#desktop').hidden,false);assert.equal(a.calls.at(-1).method,'startup.finish');
});
test('independent profile windows skip startup delay and cannot trigger another startup dismissal',async()=>{
 const a=boot({view:{kind:'profile'},handler:()=>Promise.resolve({auth:'ready'})});assert.equal(a.timers[0].duration,0);
 await flush();a.timers[0].fn();assert.equal(a.calls.some(c=>c.method==='startup.finish'),false);
});

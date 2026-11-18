/* Account state and delivery confirmations belong to the native client. */
(() => {
  'use strict';
  const pending = new Map();
  let sequence = 0;
  const native = Boolean(window.icqramHost);
  if (native && typeof document !== 'undefined' && window.icqramView) {
    document.documentElement.dataset.host = 'native';
    document.documentElement.dataset.view = window.icqramView.kind;
  }
  const failure = code => Object.assign(new Error(code), { code });
  const allowed = new Set(['window.openCommands','commands.load','commands.refresh','commands.select','notifications.load', 'notifications.save', 'notifications.authorize', 'notifications.test', 'notifications.systemSettings', 'window.openPanel', 'startup.finish', 'window.openProfile', 'bootstrap', 'auth.phone', 'auth.code', 'auth.password', 'auth.reset', 'auth.qr', 'account.logout', 'contacts.load', 'dialogs.load', 'contacts.snapshot', 'profile.load', 'presence.set', 'presence.local', 'preferences.theme', 'directory.search', 'directory.add', 'window.openDirectory', 'window.openMedia', 'viewer.load', 'viewer.save', 'viewer.cancel', 'chat.photo.get', 'chat.photo.save', 'chat.photo.cancel', 'chat.draft.get', 'chat.draft.set', 'chat.read', 'chat.history', 'chat.topics', 'chat.topic.select', 'chat.send', 'chat.state','chat.commands.refresh', 'chat.block', 'chat.typing', 'chat.file.choose', 'chat.file.send', 'chat.file.download', 'chat.file.cancel', 'window.resize', 'window.openChat', 'window.minimize', 'window.close', 'window.dragStart', 'window.dragMove', 'window.dragEnd']);
  function receive(message) {
    if (!message || message.version !== 1 || !Number.isSafeInteger(message.id)) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id); clearTimeout(request.timer);
    if (message.error) request.reject(failure(message.error));
    else request.resolve(message.result);
  }
  Object.defineProperty(window, 'icqramReceive', { value: receive });
  async function request(method, params = {}) {
    if (!allowed.has(method)) throw failure('UNSUPPORTED_METHOD');
    if (!native) {
      if (method === 'bootstrap') return { auth: 'phone', connected: false };
      throw failure('CONNECTION_UNAVAILABLE');
    }
    if (pending.size >= 32) throw failure('BUSY');
    const id = ++sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(failure('TIMEOUT')); }, ['chat.file.choose','chat.file.download','chat.photo.save','viewer.save'].includes(method) ? 600000 : method === 'presence.set' ? 25000 : 15000);
      pending.set(id, { resolve, reject, timer });
      try { window.icqramHost.postMessage(JSON.stringify({ version: 1, id, method, params })); }
      catch { clearTimeout(timer); pending.delete(id); reject(failure('CONNECTION_UNAVAILABLE')); }
    });
  }
  window.addEventListener('pagehide', () => {
    for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(failure('CANCELLED')); }
    pending.clear();
  });
  let localPresence=window.icqramView?.localPresence||'AV';
  if(typeof document!=='undefined')document.addEventListener('icqram-presence-changed',event=>{
    if(!window.icqramView||!['AV','FC','AW','NA','OC','DND','IV','OF','PH','LC'].includes(event.detail?.code))return;
    localPresence=event.detail.code;
  });
  window.icqram = Object.freeze({ native, request, get presence(){return localPresence;} });
})();

/* Local, user-supplied ICQ recordings. No remote audio or telemetry. */
(() => {
  const files = {
    startup: 'icq-startup-sfx.mp3', message: 'icq-message-received-sfx.mp3',
    system: 'icq-system-message-sfx.mp3', url: 'icq-url-ribbit-sfx.mp3',
    auth: 'icq-auth-sound.mp3', online: 'icq-user-online.mp3',
    chat: 'icq-chat-beep.mp3', chatRequest: 'icq-chat-request-from.mp3',
    contact: 'icq-incoming-contact-from.mp3', file: 'icq-incoming-file-from.mp3',
    transfer: 'icq-incoming-file-transfer.mp3', web: 'icq-incoming-web-page-from.mp3',
    phoneRequest: 'icq-phone-request-from.mp3', phone: 'icq-phone-sfx.mp3'
  };
  let enabled = true;
  try { enabled = localStorage.getItem('icqram.sound') !== 'off'; } catch {}
  window.addEventListener('storage', event => { if (event.key === 'icqram.sound') { enabled = event.newValue !== 'off'; if (!enabled) stop(); } });
  if (typeof window.icqramView?.notifications?.sound === 'boolean') enabled = window.icqramView.notifications.sound;
  window.addEventListener('icqram-notifications', event => {
    if (typeof event.detail?.sound !== 'boolean') return;
    enabled = event.detail.sound;
    try { localStorage.setItem('icqram.sound', enabled ? 'on' : 'off'); } catch {}
    if (!enabled) stop();
  });
  let current;
  const cache = new Map();
  const stop = () => { if (current) { current.pause(); current.currentTime = 0; } };
  window.ICQAudio = {
    files,
    get enabled() { return enabled; },
    setEnabled(value) { enabled = value; try { localStorage.setItem('icqram.sound', value ? 'on' : 'off'); } catch {} if (!value) stop(); if (window.icqram?.native) window.icqram.request('notifications.save', {sound: value}).catch(() => {}); },
    stop,
    async play(event) {
      if (!enabled || !files[event]) return false;
      stop();
      if (!cache.has(event)) { const audio = new Audio(`sounds/${files[event]}`); audio.preload = 'none'; cache.set(event, audio); }
      current = cache.get(event); current.volume = .65; current.currentTime = 0;
      try { await current.play(); return true; }
      catch (error) {
        if (error.name === 'NotAllowedError') document.dispatchEvent(new Event('icqram-audio-blocked'));
        return false;
      }
    }
  };
})();

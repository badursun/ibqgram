(() => {
  'use strict';
  if (window.icqramView?.kind !== 'settings') return;
  const $ = selector => document.querySelector(selector);
  const controls = [...document.querySelectorAll('[data-notify]')];
  const fieldset = $('#notification-options'), permission = $('#notification-permission');
  const feedback = $('#notification-feedback'), authorize = $('#notify-authorize');
  const test = $('#notify-test'), system = $('#notify-system');
  let settings = null, busy = false, systemState = null;
  const errors = {
    NOTIFICATIONS_DENIED: 'Allow IBQgram notifications in macOS Settings first.',
    NOTIFICATION_FAILED: 'macOS could not schedule the notification. Please try again.',
    LOCKED: 'Unlock IBQgram to change notifications.',
    TIMEOUT: 'The request timed out. Please try again.'
  };
  function render() {
    fieldset.disabled = !settings || busy;
    if (settings) for (const control of controls) {
      const key = control.dataset.notify;
      if (key === 'preview') control.value = String(settings[key]);
      else control.checked = settings[key] === true;
      control.disabled = busy || (key !== 'enabled' && !settings.enabled);
    }
    authorize.hidden = systemState?.authorization !== 'notDetermined';
    authorize.disabled = busy;
    test.disabled = busy || !settings?.enabled || systemState?.authorization !== 'authorized';
    system.disabled = busy || !window.icqram.native;
    if (!systemState) return;
    const status = systemState.authorization;
    permission.textContent = status === 'authorized'
      ? (!systemState.alerts || !systemState.banner ? 'Allowed, but banners are off in macOS Settings.' : 'Notifications are allowed by macOS.')
      : status === 'denied' ? 'Notifications are blocked in macOS Settings.'
      : status === 'notDetermined' ? 'Allow IBQgram to show message notifications.'
      : 'Notification permission could not be checked.';
    if (status === 'authorized' && settings?.sound && !systemState.sound) permission.textContent += ' Sound is disabled by macOS.';
  }
  async function run(action) {
    if (busy) return;
    busy = true; feedback.textContent = ''; render();
    try { await action(); }
    catch (error) { feedback.textContent = errors[error.code] || 'Could not update notifications. Please try again.'; }
    finally { busy = false; render(); }
  }
  async function load(method = 'notifications.load') {
    const result = await window.icqram.request(method);
    settings = result; systemState = result.system;
  }
  for (const control of controls) control.addEventListener('change', () => {
    const key = control.dataset.notify, value = key === 'preview' ? Number(control.value) : control.checked;
    run(async () => {
      settings = await window.icqram.request('notifications.save', { [key]: value });
      feedback.textContent = 'Saved.';
    });
  });
  authorize.addEventListener('click', () => run(() => load('notifications.authorize')));
  system.addEventListener('click', () => run(() => window.icqram.request('notifications.systemSettings')));
  test.addEventListener('click', () => run(async () => {
    await window.icqram.request('notifications.test');
    feedback.textContent = 'Test sent to macOS. Focus may silence the banner.';
  }));
  const refresh = () => run(() => load());
  window.addEventListener('focus', refresh);
  window.addEventListener('icqram-settings-focus', refresh);
  window.addEventListener('icqram-notifications', event => { settings = event.detail; render(); });
  refresh();
})();

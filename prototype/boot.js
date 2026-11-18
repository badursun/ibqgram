(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const separateChat = ['chat','directory','viewer','profile','settings','about','presence','info','now','commands'].includes(window.icqramView?.kind);
  const nativeStartup = window.icqramView?.nativeStartup === true;
  if (nativeStartup) $('#startup-overlay').hidden = true;
  const scene = window.icqram.native ? (window.icqramView?.fixtures ? 'contacts' : null) : new URLSearchParams(location.search).get('screen');
  let state = { auth: ['code', 'password'].includes(scene) ? scene : (scene ? 'phone' : 'loading'), connected: false };
  let busy = false;
  let started = false;
  const messages = {
    CONNECTION_UNAVAILABLE: 'Bağlantı kurulamıyor. Lütfen daha sonra tekrar dene.',
    TIMEOUT: 'Bağlantı zaman aşımına uğradı. Tekrar dene.',
    PHONE_NUMBER_INVALID: 'Telefon numaranı ülke koduyla birlikte yaz.',
    PHONE_CODE_INVALID: 'Doğrulama kodunu kontrol et.',
    PHONE_CODE_EXPIRED: 'Kodun süresi doldu. Yeni bir kod iste.',
    PASSWORD_HASH_INVALID: 'Parolanı kontrol et.',
    FLOOD_WAIT: 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.',
    PHONE_NUMBER_BANNED: 'Bu telefon numarasıyla Telegram girişi yapılamıyor.',
    PHONE_NUMBER_FLOOD: 'Bu numara için çok fazla giriş denemesi yapıldı. Daha sonra tekrar dene.',
    AUTH_METHOD_UNSUPPORTED: 'Bu hesap ek bir giriş yöntemi gerektiriyor. Şimdilik resmî Telegram uygulamasıyla giriş yap.',
    AUTH_PAYMENT_REQUIRED: 'Telegram bu giriş için ek bir doğrulama istiyor. Resmî Telegram uygulamasını kullan.',
    SIGNUP_REQUIRED: 'Önce resmî Telegram uygulamasından hesap oluştur.',
    QR_UNAVAILABLE: 'Şu anda telefon numaranla giriş yapabilirsin.',
    SRP_ID_INVALID: 'Parola doğrulamasının süresi doldu. Parolanı tekrar gir.',
    PASSWORD_CHECK_FAILED: 'Parola doğrulanamadı. Lütfen tekrar dene.',
    AUTH_STATE_INVALID: 'Giriş adımı değişti. Telefon numaranla yeniden başla.',
    SILENT: ''
  };
  function route() {
    if (!started) return;
    const authenticated = state.auth === 'ready';
    $('#startup-overlay').hidden = true;
    for (const id of ['desktop', 'taskbar']) { $(`#${id}`).hidden = !authenticated; $(`#${id}`).inert = !authenticated; }
    $('#login-screen').hidden = authenticated; $('#login-screen').inert = authenticated;
    for (const name of ['phone', 'code', 'password']) {
      $(`#${name}-step`).hidden = state.auth !== name;
      $(`#login-${name}`).disabled = state.auth !== name;
      $(`#login-${name}`).required = state.auth === name;
    }
    $('#login-submit').textContent = state.auth === 'loading' ? 'Bağlanıyor…' : (state.auth === 'phone' ? 'Devam et' : 'Giriş yap');
    $('#login-submit').disabled = busy || state.auth === 'loading';
    $('#qr-login').disabled = busy || state.auth === 'loading';
    $('#qr-login').hidden = state.auth !== 'phone';
    $('#login-back').hidden = !['code', 'password'].includes(state.auth);
    $('#login-back').disabled = busy;
    if (authenticated) $('#search').focus();
    else $(`#login-${state.auth}`)?.focus();
    document.dispatchEvent(new CustomEvent('icqram-session', { detail: state }));
  }
  function apply(result) {
    if (!result || !['phone','code','password','ready'].includes(result.auth)) throw new Error('INVALID_STATE');
    if (result.auth !== state.auth) {
      $('#login-code').value = ''; $('#login-password').value = '';
      if (result.auth === 'ready') $('#login-phone').value = '';
    }
    state = result; route();
  }
  async function submit(method, params) {
    if (busy) return;
    busy = true; $('#login-submit').disabled = true; $('#qr-login').disabled = true;
    $('#login-back').disabled = true;
    $('#login-error').textContent = '';
    try { apply(await window.icqram.request(method, params)); }
    catch (error) { $('#login-error').textContent = messages[error.code] ?? 'İşlem tamamlanamadı. Lütfen tekrar dene.'; }
    finally { busy = false; $('#login-submit').disabled = false; $('#qr-login').disabled = false; $('#login-back').disabled = false; }
  }
  $('#login-form').addEventListener('submit', event => {
    event.preventDefault();
    const value = $(`#login-${state.auth}`)?.value.trim() || '';
    if (state.auth === 'phone' && !/^\+[1-9]\d{6,14}$/.test(value.replace(/[\s()-]/g, ''))) {
      $('#login-error').textContent = messages.PHONE_NUMBER_INVALID; return;
    }
    if (state.auth === 'phone') submit('auth.phone', { phone: value.replace(/[\s()-]/g, '') });
    else if (state.auth === 'code') submit('auth.code', { code: value });
    else if (state.auth === 'password') {
      submit('auth.password', { password: $('#login-password').value });
      $('#login-password').value = '';
    }
  });
  $('#qr-login').addEventListener('click', () => submit('auth.qr', {}));
  $('#login-back').addEventListener('click', () => submit('auth.reset', {}));
  $('#logout').addEventListener('click', async () => {
    if (window.icqram.native) {
      try { await window.icqram.request('account.logout'); } catch { return; }
    }
    window.ICQAudio.stop(); location.href = 'index.html';
  });
  document.addEventListener('icqram-audio-blocked', () => { $('#audio-notice').hidden = false; });
  $('#enable-audio').addEventListener('click', () => { window.ICQAudio.setEnabled(true); window.ICQAudio.play('startup'); $('#audio-notice').hidden = true; });
  $('#dismiss-audio').addEventListener('click', () => { $('#audio-notice').hidden = true; });
  $('#desktop').hidden = true; $('#login-screen').hidden = false;
  $('#desktop').inert = true; $('#login-screen').inert = true; $('#taskbar').inert = true;
  if (!separateChat) window.ICQAudio.play('startup');
  window.icqram.request('bootstrap').then(result => { if (!scene) apply(result); }).catch(() => {
    if (!scene) { apply({ auth: 'phone', connected: false }); $('#login-error').textContent = messages.CONNECTION_UNAVAILABLE; }
  });
  setTimeout(() => {
    window.ICQAudio.stop(); started = true;
    if (scene === 'contacts') state = { auth: 'ready', connected: false };
    route();
    if (nativeStartup) window.icqram.request('startup.finish').catch(() => {});
  }, separateChat ? 0 : 2600);
})();

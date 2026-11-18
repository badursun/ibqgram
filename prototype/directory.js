(() => {
  'use strict';
  if (window.icqramView?.kind !== 'directory') return;
  const panel = document.querySelector('#directory-template').content.firstElementChild.cloneNode(true);
  document.querySelector('#chat-windows').append(panel);
  const $ = selector => panel.querySelector(selector);
  const query = $('.directory-query'), feedback = $('.directory-feedback'), tbody = $('tbody');
  const add = $('.directory-add'), search = $('.directory-search'), online = $('.directory-online input');
  let mode = 'username', users = [], selected = '', busy = false, generation = 0, retryAt = 0;
  const modes = {
    username: ['Search for a user by Telegram username.', 'Search Users By Username', 'Nick:', ''],
    uin: ['Search for a known Telegram user by UIN.', 'Search Users By UIN', 'ICQ #:', 'Yalnızca bu oturumun tanıdığı kullanıcılar bulunabilir.'],
    email: ['Search for a user by his/her Email address.', 'Search Users By Email', 'Email:', 'Telegram e-posta adresiyle kişi aramayı desteklemiyor.'],
    interests: ['Search for a user by his/her interests.', 'Search Users By Interests', 'Interest:', 'Telegram ilgi alanıyla kişi aramayı desteklemiyor.']
  };
  const errors = {
    INVALID_QUERY: '5–32 karakterlik bir Telegram kullanıcı adı gir.',
    FLOOD_WAIT: 'Telegram beklemeni istiyor. Bir süre sonra tekrar dene.',
    TIMEOUT: 'Arama yanıtı gecikti. Yeniden deneyebilirsin.',
    ADD_UNCERTAIN: 'Ekleme onayı gecikti. Yeniden arayarak rehber durumunu kontrol et.',
    LOCKED: 'Önce uygulamanın kilidini aç.',
    CONNECTION_UNAVAILABLE: 'Telegram bağlantısı kurulamadı.',
    PEER_UNAVAILABLE: 'Kullanıcıya ulaşılamıyor. Yeniden ara.',
    TOO_MANY_WINDOWS: 'Yeni sohbet açmak için bazı sohbet pencerelerini kapat.'
  };
  const supported = () => mode === 'username' || mode === 'uin';
  function controls() {
    const user = users.find(u => u.id === selected);
    search.disabled = busy || !supported();
    query.disabled = busy || !supported();
    add.disabled = busy || !user;
    add.textContent = user?.listed || user?.self || user?.contact ? 'Open Chat' : 'Add User';
    add.title = user?.bot ? (user.listed ? 'Bot ile sohbet aç' : 'Botu icqram listesine ekle') : user?.contact ? 'Kayıtlı kişiyle sohbet aç' : 'Telegram rehberine ekle ve sohbet aç';
    for (const b of panel.querySelectorAll('[role=tab], .directory-new, .directory-pages')) b.disabled = busy;
  }
  function render() {
    const filtered = users.filter(u => !online.checked || u.online);
    if (!filtered.some(u => u.id === selected)) selected = '';
    tbody.replaceChildren();
    for (const user of filtered) {
      const row = document.createElement('tr'); row.tabIndex = 0;
      row.setAttribute('aria-selected', String(user.id === selected));
      row.title = `${user.name} · UIN ${user.id}${user.username ? ' · @' + user.username : ''}${user.verified ? ' · Telegram tarafından doğrulanmış' : ''}`;
      const values = [user.id, user.username ? '@' + user.username : user.name, user.firstName, user.lastName, '', user.bot ? (user.verified ? 'Bot ✓' : 'Bot') : user.contact ? 'Added' : '—'];
      values.forEach((value, index) => {
        const cell = document.createElement('td'); cell.title = index === 4 ? 'Telegram e-posta adresini paylaşmaz.' : String(value || '');
        if (index === 0) { const icon = document.createElement('img'); icon.src = 'assets/brand/static/icqram-flower.svg'; icon.alt = ''; cell.append(icon); }
        cell.append(document.createTextNode(String(value || ''))); row.append(cell);
      });
      const select = () => { selected = user.id; for (const item of tbody.children) item.setAttribute('aria-selected', String(item === row)); controls(); };
      row.addEventListener('click', select);
      row.addEventListener('dblclick', () => { select(); open(user); });
      row.addEventListener('keydown', event => {
        if (event.key === 'Enter') { event.preventDefault(); select(); open(user); }
        else if (event.key === ' ') { event.preventDefault(); select(); }
        else if (['ArrowDown','ArrowUp'].includes(event.key)) { event.preventDefault(); const next = event.key === 'ArrowDown' ? row.nextElementSibling : row.previousElementSibling; next?.focus(); next?.click(); }
      });
      tbody.append(row);
    }
    $('.directory-count').textContent = `Found ${filtered.length} User(s). Double click on a user to open a chat.`;
    controls();
  }
  function selectMode(next) {
    if (busy || !modes[next]) return;
    mode = next; ++generation; query.value = ''; users = []; selected = '';
    const [description, legend, label, note] = modes[mode];
    $('.directory-description').textContent = description; $('.directory-legend').textContent = legend; $('.directory-label').textContent = label; feedback.textContent = note;
    query.inputMode = mode === 'uin' ? 'numeric' : 'text';
    for (const tab of panel.querySelectorAll('[role=tab]')) tab.setAttribute('aria-selected', String(tab.dataset.mode === mode));
    render(); if (supported()) query.focus();
  }
  async function runSearch() {
    if (busy || !supported()) return;
    const value = query.value.trim();
    if (mode === 'username' ? !/^@?[a-zA-Z0-9_]{5,32}$/.test(value) : !/^[1-9][0-9]{0,15}$/.test(value)) { feedback.textContent = mode === 'uin' ? 'Geçerli bir UIN gir.' : errors.INVALID_QUERY; query.focus(); return; }
    if (Date.now() < retryAt) { feedback.textContent = errors.FLOOD_WAIT; return; }
    const version = ++generation; busy = true; selected = ''; users = []; render(); feedback.textContent = 'Aranıyor…';
    try {
      const result = await window.icqram.request('directory.search', { mode, query: value });
      if (version !== generation) return;
      if (!Array.isArray(result.users)) throw new Error('Invalid results');
      users = result.users.filter(u => /^[1-9][0-9]{0,15}$/.test(u.id) && typeof u.name === 'string');
      const exact = value.replace(/^@/,'').toLowerCase();
      users.sort((a,b) => Number(b.username?.toLowerCase() === exact) - Number(a.username?.toLowerCase() === exact));
      feedback.textContent = users.length ? '' : result.knownOnly ? 'Bu UIN oturumda tanınmıyor. Kullanıcı adıyla ara.' : 'Kullanıcı bulunamadı.';
    } catch (error) { if (error.code === 'FLOOD_WAIT') retryAt = Date.now() + 60000; feedback.textContent = error.code === 'SILENT' ? '' : errors[error.code] || 'Arama tamamlanamadı. Yeniden dene.'; }
    finally { busy = false; render(); }
  }
  async function open(user) {
    if (busy) return;
    try { await window.icqram.request('window.openChat', { contactId: user.id }); }
    catch (error) { feedback.textContent = errors[error.code] || 'Sohbet açılamadı.'; }
  }
  add.addEventListener('click', async () => {
    const user = users.find(u => u.id === selected); if (!user || busy) return;
    if (user.listed || user.self || user.contact) return open(user);
    busy = true; controls(); feedback.textContent = 'Kişi ekleniyor…';
    let added = false;
    try {
      const result = await window.icqram.request('directory.add', { id: user.id });
      if (result?.added !== true) throw Object.assign(new Error(), { code:'ADD_UNCERTAIN' });
      if (user.bot) user.listed = true; else user.contact = true; added = true; feedback.textContent = user.bot ? 'Bot icqram listesine eklendi.' : 'Kişi Telegram rehberine eklendi.';
    } catch (error) { feedback.textContent = error.code === 'SILENT' ? '' : errors[error.code === 'TIMEOUT' ? 'ADD_UNCERTAIN' : error.code] || 'Kişi eklenemedi. Yeniden ara.'; }
    finally { busy = false; render(); }
    if (added) open(user);
  });
  for (const tab of panel.querySelectorAll('[role=tab]')) tab.addEventListener('click', () => selectMode(tab.dataset.mode));
  $('.directory-form').addEventListener('submit', event => { event.preventDefault(); runSearch(); });
  search.addEventListener('click', runSearch); online.addEventListener('change', render);
  $('.directory-new').addEventListener('click', () => selectMode(mode));
  $('.directory-pages').addEventListener('click', () => selectMode('username'));
  $('.directory-wizard').addEventListener('click', event => {
    const enabled = event.currentTarget.getAttribute('aria-pressed') !== 'true'; event.currentTarget.setAttribute('aria-pressed', String(enabled));
    feedback.textContent = enabled ? '1. Details → kullanıcı adı. 2. Search Again. 3. Sonuç seç → Add User / Open Chat.' : modes[mode][3];
  });
  const request = (method,params) => window.icqram.request(method,params).catch(() => {});
  $('.directory-close').addEventListener('click', () => request('window.close'));
  $('.directory-minimize').addEventListener('click', () => request('window.minimize'));
  let expanded = false;
  $('.directory-maximize').addEventListener('click', () => { expanded = !expanded; request('window.resize', expanded ? {width:800,height:700} : {width:456,height:437}); });
  const grip = $('.directory-resize');
  let queued = null, resizing = false;
  async function resize(size) { queued = size; if (resizing) return; resizing = true; while (queued) { const next=queued; queued=null; await request('window.resize',next); } resizing=false; }
  grip.addEventListener('pointerdown', event => {
    if (event.button !== 0) return; event.preventDefault();
    const start={x:event.screenX,y:event.screenY,w:innerWidth,h:innerHeight}; grip.setPointerCapture(event.pointerId);
    const move=e=>{ if(e.pointerId===event.pointerId) resize({width:Math.round(start.w+e.screenX-start.x),height:Math.round(start.h+e.screenY-start.y)}); };
    const end=e=>{ if(e.pointerId!==event.pointerId)return; if(e.type==='pointerup')move(e); grip.removeEventListener('pointermove',move); for(const name of ['pointerup','pointercancel','lostpointercapture'])grip.removeEventListener(name,end); if(grip.hasPointerCapture(event.pointerId))grip.releasePointerCapture(event.pointerId); };
    grip.addEventListener('pointermove',move); for(const name of ['pointerup','pointercancel','lostpointercapture'])grip.addEventListener(name,end);
  });
  document.addEventListener('icqram-session',event=>{if(event.detail?.auth==='ready')query.focus();});
  selectMode('username');
})();

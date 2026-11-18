/* icqram shared interface — GPL-3.0-only. Account operations use the native bridge. */
(() => {
  'use strict';
  if (window.icqram.native && ['chat','directory','viewer','profile','settings','about','presence','info','now','commands'].includes(window.icqramView?.kind)) return;
  const showFixtures = window.icqramView?.fixtures === true || !window.icqram.native && new URLSearchParams(location.search).get('screen') === 'contacts';
  const contacts = showFixtures ? [
    { id: 'ece', name: 'Ece', state: 'online', detail: 'Bir kahve molası ☕', unread: 0 },
    { id: 'deniz', name: 'Deniz', state: 'online', detail: 'Bir şarkı daha…' },
    { id: 'mert', name: 'Mert', state: 'online', detail: 'Buradayım.' },
    { id: 'selin', name: 'Selin', state: 'away', detail: 'Az sonra dönerim.' },
    { id: 'can', name: 'Can', state: 'busy', detail: 'Kulaklıklar takılı.' },
    { id: 'ada', name: 'Ada', state: 'offline', detail: 'Çevrimdışı' },
    { id: 'kerem', name: 'Kerem', state: 'offline', detail: 'Çevrimdışı' },
    { id: 'zeynep', name: 'Zeynep', state: 'offline', detail: 'Çevrimdışı' }
  ] : [];
  const labels = { online: 'Online', away: 'Away', busy: 'Occupied', offline: 'Offline' };
  const histories = new Map(contacts.map(c => [c.id, c.id === 'ece' ? [
    { from: 'Ece', text: 'Burada mısın? :)', time: '14:32' },
    { from: 'Ben', text: 'Buradayım! Bu pencereyi özlemişim.', time: '14:33' },
    { from: 'Ece', text: 'Ben de. Sanki okuldan yeni gelmişiz de\nbilgisayarı açmışız gibi.', time: '14:33' }
  ] : [{ from: c.name, text: 'Merhaba! Nasılsın?', time: '14:30' }]]));
  const windows = new Map();
  const drafts = new Map();
  let topZ = 10;
  let selected = contacts[0]?.id;
  let doNotDisturb = false;
  document.addEventListener('icqram-presence', event => { doNotDisturb = event.detail?.code === 'DND'; });
  let contactsLoading = false;
  const $ = selector => document.querySelector(selector);
  const make = (tag, className, text) => { const el = document.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = text; return el; };
  const collapsedGroups = new Set();
  let activeFilter='all';
  const visibleContacts=()=>window.ICQPresence.filtered(contacts,activeFilter,$('#search').value);
  function updateSelection() {
    for(const row of document.querySelectorAll('#contact-list .contact')){
      const active=row.dataset.contactId===selected;
      row.classList.toggle('selected',active);row.setAttribute('aria-pressed',String(active));
    }
    const available=visibleContacts().some(c=>c.id===selected);
    $('#open-first').disabled=!available;$('#quick-message').disabled=false;
  }
  const selectContact=id=>{selected=id;updateSelection();};
  for(const button of document.querySelectorAll('[data-contact-filter]')){
    button.addEventListener('click',()=>{
      activeFilter=button.dataset.contactFilter;
      for(const tab of document.querySelectorAll('[data-contact-filter]'))tab.setAttribute('aria-pressed',String(tab===button));
      renderContacts();
    });
  }
  function renderContacts() {
    const list = $('#contact-list'); list.replaceChildren();
    const query = $('#search').value.trim().toLocaleLowerCase('tr');
    const matches = visibleContacts();
    const renderGroup = (section, parent, nested=false) => {
      const entries = section.contacts || section.children.flatMap(c=>c.contacts);
      const group = make(nested ? 'div' : 'details', 'contact-group'+(nested?' nested':' category'));
      if (nested) {
        group.append(make('div', 'presence-divider', section.label));
      } else {
        group.open = !collapsedGroups.has(section.key);
        const count = section.children ? `${entries.filter(c=>c.state!=='offline').length}/${entries.length}` : String(entries.length);
        group.append(make('summary', '', `${section.label} - ${count}`));
        group.addEventListener('toggle',()=>{if(!group.isConnected)return;if(group.open)collapsedGroups.delete(section.key);else collapsedGroups.add(section.key);});
      }
      if(section.children)for(const child of section.children)renderGroup(child,group,true);
      else for (const c of entries) {
        const neutral = c.bot || ['group','channel'].includes(c.kind);
        const button = make('button', `contact${selected === c.id ? ' selected' : ''}`);
        button.type = 'button'; button.dataset.contactId=c.id; button.setAttribute('aria-label', `${c.name}, ${neutral?section.label:c.statusText||labels[c.state]} — double-click to open chat`);
        button.setAttribute('aria-pressed', String(selected === c.id));
        const light = window.ICQPresence.icon(neutral?'IV':c.presence || (c.state==='offline'?'OF':'AV'),neutral?undefined:c.state==='online');
        light.classList.add(neutral?'neutral':c.state);button.append(light);
        button.title = `${c.statusText || c.detail || ''} · ${c.kind==='group'?'Group ID':c.kind==='channel'?'Channel ID':'UIN'} ${c.id.replace(/^(chat|channel):/,'')}${c.username?' · @'+c.username:''}`;
        const text = make('span','contact-text');
        const detail = c.typing || (c.blocked?'Blocked':neutral?c.detail:c.statusText || window.ICQPresence.states.find(s=>s.code===c.presence)?.short || c.detail);
        text.append(make('span','contact-name',showFixtures?c.name.toLocaleLowerCase('tr')+'@home':c.name),make('span','contact-detail'+(c.typing||c.blocked||(!neutral&&!['AV','OF'].includes(c.presence))?' visible':''),detail));button.append(text);
        if(c.unread)button.append(make('span','unread',String(c.unread)));
        button.addEventListener('click',()=>selectContact(c.id));
        button.addEventListener('dblclick',()=>{if(!window.icqram.native)c.unread=0;openChat(c.id);});
        button.addEventListener('keydown',event=>{
          if(event.key==='Enter'){event.preventDefault();openChat(c.id);}
          if(event.key==='ArrowDown'||event.key==='ArrowUp'){
            event.preventDefault();const rows=Array.from(list.querySelectorAll('.contact')).filter(row=>!row.closest('details')||row.closest('details').open);
            const next=rows[rows.indexOf(button)+(event.key==='ArrowDown'?1:-1)];if(next){selectContact(next.dataset.contactId);next.focus();}
          }
        });group.append(button);
      }
      parent.append(group);
    };
    const sectionKeys={user:['general','bots'],group:['groups'],channel:['channels']};
    for(const section of window.ICQPresence.sections(matches))if(activeFilter==='all'||sectionKeys[activeFilter]?.includes(section.key))renderGroup(section,list);
    if (!matches.length) list.append(make('p', 'empty', query ? 'No matching chats.' : ({all:'Your chat list is empty.',user:'No users or bots.',group:'No groups.',channel:'No channels.'}[activeFilter])));
    updateSelection();
  }
  async function loadContacts() {
    if (contactsLoading || !window.icqram.native || showFixtures) return;
    contactsLoading = true;
    if (!contacts.length) $('#contact-list').replaceChildren(make('p', 'empty', 'Loading contacts…'));
    try {
      const result = await window.icqram.request('contacts.load');
      if (!Array.isArray(result?.contacts)) throw new Error('Invalid contacts');
      const valid = result.contacts.map(window.ICQPresence.contact).filter(Boolean);
      contacts.splice(0, contacts.length, ...valid);
      for (const contact of contacts) if (!histories.has(contact.id)) histories.set(contact.id, []);
      selected = contacts.some(c => c.id === selected) ? selected : contacts[0]?.id;
      renderContacts();
      let more = true, page = 0;
      while (more) {
        const dialogs = await window.icqram.request('dialogs.load',{reset:page===0});
        if(!Array.isArray(dialogs?.contacts))throw new Error('Invalid dialogs');
        const items=dialogs.contacts.map(window.ICQPresence.contact).filter(Boolean);
        contacts.splice(0,contacts.length,...items);
        for(const contact of contacts)if(!histories.has(contact.id))histories.set(contact.id,[]);
        selected=contacts.some(c=>c.id===selected)?selected:contacts[0]?.id;
        renderContacts();more=dialogs.hasMoreDialogs===true;
        if(++page>=500 && more)throw new Error('Dialog limit');
      }
    } catch (error) {
      if (error.code === 'SILENT') {
        if (contacts.length) renderContacts();
        else $('#contact-list').replaceChildren();
        return;
      }
      const retry = make('button', 'empty', contacts.length?'Some chats could not be loaded. Retry.':'Chats could not be loaded. Retry.');
      retry.addEventListener('click', loadContacts);
      if(contacts.length){renderContacts();$('#contact-list').append(retry);}else $('#contact-list').replaceChildren(retry);
    } finally { contactsLoading = false; }
  }
  document.addEventListener('icqram-refresh-contacts', loadContacts);
  let accountReady = false;
  document.addEventListener('visibilitychange', () => { if (!document.hidden && accountReady) loadContacts(); });
  setInterval(() => { if (accountReady && !document.hidden) loadContacts(); }, 60000);
  let snapshotLoading=false;
  setInterval(async()=>{
    if(!accountReady || contactsLoading || snapshotLoading || document.hidden)return;
    snapshotLoading=true;
    try { const result=await window.icqram.request('contacts.snapshot'); if(result.profileAvatar)document.dispatchEvent(new CustomEvent('icqram-profile-avatar',{detail:result.profileAvatar})); const valid=result.contacts?.map(window.ICQPresence.contact).filter(Boolean); if(valid && JSON.stringify(valid)!==JSON.stringify(contacts)){contacts.splice(0,contacts.length,...valid);renderContacts();} }catch{}finally{snapshotLoading=false;}
  },1500);
  document.addEventListener('icqram-session', event => {
    accountReady = event.detail?.auth === 'ready'; if (accountReady) loadContacts();
  });
  function renderHistory(id) {
    const panel = windows.get(id); if (!panel) return;
    const log = panel.querySelector('.history'); log.replaceChildren(make('div', 'day', 'BUGÜN'));
    for (const message of histories.get(id)) {
      const item = make('div', `message${message.from === 'Ben' ? ' mine' : ''}`);
      const meta = make('div', 'message-meta'); meta.append(make('span', '', message.from), make('time', '', message.time));
      item.append(meta, make('p', '', message.text));
      if (message.status) item.append(make('div', 'receipt', { pending: 'Gönderiliyor…', failed: 'Gönderilemedi', sent: 'Gönderildi' }[message.status] || ''));
      log.append(item);
    }
    panel.querySelector('.message-count').textContent = `${histories.get(id).length} mesaj`;
    log.scrollTop = log.scrollHeight;
  }
  function raise(panel) { document.querySelectorAll('#desktop .window').forEach(w => w.classList.remove('active-window')); panel.classList.add('active-window'); panel.style.zIndex = String(++topZ); }
  function updateTabs() {
    $('#window-tabs').replaceChildren();
    for (const [id, panel] of windows) {
      const tab = make('button', '', `✉ ${contacts.find(c => c.id === id).name}`);
      tab.addEventListener('click', () => { panel.hidden = false; raise(panel); panel.querySelector('textarea').focus(); });
      $('#window-tabs').append(tab);
    }
  }
  function openChat(id, focus = true) {
    const contact = contacts.find(c => c.id === id); if (!contact) return;
    selected = id; renderContacts();
    if (window.icqramView?.kind === 'contacts') {
      window.icqram.request('window.openChat', { contactId: id }).catch(() => {
        const error = make('p', 'empty', 'This chat cannot be opened right now.');
        error.setAttribute('role', 'alert'); $('#contact-list').append(error);
      }); return;
    }
    if (windows.has(id)) { const panel = windows.get(id); panel.hidden = false; raise(panel); if (focus) panel.querySelector('textarea').focus(); return; }
    const panel = $('#chat-template').content.firstElementChild.cloneNode(true);
    panel.dataset.contact = id; panel.setAttribute('aria-label', `${contact.name} ile sohbet`);
    panel.querySelector('.chat-title').textContent = `✉ ${contact.name} — Mesaj`;
    panel.querySelector('.person-name').textContent = contact.name;
    panel.querySelector('.person-status').textContent = `${labels[contact.state]}`;
    const offset = windows.size * 24;
    if (offset) { panel.style.top = `${55 + offset}px`; panel.style.left = `min(${278 + offset}px, calc(100% - 376px))`; }
    const input = panel.querySelector('textarea'); input.value = drafts.get(id) || '';
    input.addEventListener('input', () => drafts.set(id, input.value));
    panel.querySelector('.composer').addEventListener('submit', async event => {
      event.preventDefault(); const text = input.value.trim(); if (!text) { input.focus(); return; }
      const message = { from: 'Ben', text: text.slice(0, 4000), time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }), status: 'pending' };
      histories.get(id).push(message);
      input.value = ''; drafts.delete(id); renderHistory(id); input.focus();
      try {
        const result = await window.icqram.request('chat.send', { contactId: id, text: message.text });
        message.status = result?.sent === true ? 'sent' : 'failed';
      } catch { message.status = 'failed'; }
      if (message.status === 'failed' && !input.value) { input.value = message.text; drafts.set(id, message.text); }
      renderHistory(id);
    });
    input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); panel.querySelector('form').requestSubmit(); } });
    panel.querySelector('.close').addEventListener('click', () => { if (window.icqramView) { window.icqram.request('window.close').catch(() => {}); return; } panel.remove(); windows.delete(id); updateTabs(); });
    panel.querySelector('.minimize').addEventListener('click', () => { if (window.icqramView) window.icqram.request('window.minimize').catch(() => {}); else panel.hidden = true; });
    panel.addEventListener('pointerdown', () => raise(panel));
    windows.set(id, panel); $('#chat-windows').append(panel); makeDraggable(panel); raise(panel); renderHistory(id); updateTabs(); if (focus) input.focus();
  }
  function makeDraggable(panel) {
    if (window.icqramView) return;
    const bar = panel.querySelector('.titlebar');
    bar.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button') || matchMedia('(max-width: 680px)').matches) return;
      const rect = panel.getBoundingClientRect(), desk = $('#desktop').getBoundingClientRect();
      const x = event.clientX - rect.left, y = event.clientY - rect.top;
      bar.setPointerCapture(event.pointerId); raise(panel);
      function move(e) { panel.style.left = `${Math.max(0, Math.min(desk.width - rect.width, e.clientX - desk.left - x))}px`; panel.style.top = `${Math.max(0, Math.min(desk.height - 50, e.clientY - desk.top - y))}px`; }
      function done() { bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', done); bar.removeEventListener('pointercancel', done); }
      bar.addEventListener('pointermove', move); bar.addEventListener('pointerup', done); bar.addEventListener('pointercancel', done);
    });
  }
  $('#search').addEventListener('input', renderContacts);
  $('#open-first').addEventListener('click', () => {if(visibleContacts().some(c=>c.id===selected))openChat(selected);});
  $('#home-button').addEventListener('click', () => { $('.contacts-window').hidden = false; raise($('.contacts-window')); $('#search').focus(); $('.contacts-window').scrollIntoView({ block: 'nearest' }); });
  $('#sound').addEventListener('click', event => {
    window.ICQAudio.setEnabled(!window.ICQAudio.enabled);
    event.currentTarget.textContent = window.ICQAudio.enabled ? '♫ Sound on' : '♫ Sound off';
    event.currentTarget.setAttribute('aria-pressed', String(window.ICQAudio.enabled));
    event.currentTarget.setAttribute('aria-checked', String(window.ICQAudio.enabled));
  });
  const syncSound = () => {
    const button = $('#sound'), enabled = window.ICQAudio.enabled;
    button.textContent = enabled ? '♫ Sound on' : '♫ Sound off';
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-checked', String(enabled));
  };
  window.addEventListener('icqram-notifications', syncSound);
  syncSound();
  $('#contacts-minimize').addEventListener('click', () => { if (window.icqramView) window.icqram.request('window.minimize').catch(() => {}); else $('.contacts-window').hidden = true; });
  $('#search-go').addEventListener('click', () => $('#search').focus());
  $('#add-user').disabled = !showFixtures && !window.icqram.native;
  $('#add-user').addEventListener('click', () => { if (window.icqram.native) window.icqram.request('window.openDirectory').catch(() => { $('#search').placeholder = 'Arama penceresi acilamadi.'; }); else $('#add-contact').showModal(); });
  $('#cancel-contact').addEventListener('click', () => $('#add-contact').close());
  $('#add-contact-form').addEventListener('submit', event => {
    event.preventDefault(); const name = $('#new-name').value.trim(); if (!name) return;
    if (!showFixtures) return;
    const id = `local-${Date.now()}`; contacts.push({id,name,state:'offline',detail:''});
    histories.set(id, []); $('#new-name').value = ''; $('#add-contact').close();
    renderContacts();
  });
  $('#quick-message').addEventListener('click', () => { window.icqram.request('window.openPanel',{kind:'now'}).catch(()=>{}); });
  // Future account adapter entry point. No network client dispatches this yet.
  document.addEventListener('icqram-message', event => {
    const { contactId, text } = event.detail || {};
    const contact = contacts.find(c => c.id === contactId);
    if (!contact || typeof text !== 'string' || !text.trim()) return;
    histories.get(contactId).push({ from: contact.name, text: text.slice(0,4000), time: new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}) });
    renderHistory(contactId);
    if (!windows.has(contactId) || windows.get(contactId).hidden) contact.unread = (contact.unread || 0) + 1;
    renderContacts(); if (!doNotDisturb) window.ICQAudio.play('message');
  });
  $('#reset-layout').addEventListener('click', () => { for (const panel of document.querySelectorAll('#desktop .window')) { panel.style.left = ''; panel.style.top = ''; panel.hidden = false; } });
  for (const id of ['#about-button', '#main-about']) $(id).addEventListener('click', () => { if(window.icqram.native) window.icqram.request('window.openPanel',{kind:'about'}).catch(()=>{}); else $('#about').showModal(); });
  for (const id of ['#close-about', '#okay-about']) $(id).addEventListener('click', () => $('#about').close());
  $('#about').addEventListener('click', event => {
    if (event.target !== $('#about')) return;
    const bounds = $('#about').getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) $('#about').close();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const dialog = document.querySelector('dialog[open]');
    if (dialog) { event.preventDefault(); dialog.close(); }
  });
  const tick = () => { $('#clock').textContent = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); };
  if (window.icqramView?.kind === 'chat') openChat(window.icqramView.contactId, false);
  tick(); setInterval(tick, 30000); makeDraggable($('.contacts-window')); renderContacts(); if (window.icqramView?.kind !== 'chat') raise($('.contacts-window'));
})();

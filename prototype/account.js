(() => {
  'use strict';
  if (window.icqram.native && ['chat','directory','viewer','about','info','now'].includes(window.icqramView?.kind)) return;
  const $ = selector => document.querySelector(selector);
  const P = window.ICQPresence;
  let profile = null, selected = 'AV', current = 'AV', busy = false, profileGeneration = 0;
  const storageKey = () => `icqram.presence.${profile?.uin}`;
  const errors = {
    PROFILE_CHANGED: 'Your Telegram name changed elsewhere. Refresh your profile and try again.',
    FLOOD_WAIT: 'Telegram asks you to wait. Please try again later.',
    NAME_TOO_LONG: 'Your name is too long for this status tag.',
    PRESENCE_UNCERTAIN: 'Telegram has not confirmed the update. Refresh your profile before retrying.',
    TIMEOUT: 'The request timed out. Refresh your profile and try again.'
  };
  function setLocal(code, notify=true) {
    current = code;
    if(profile)try{localStorage.setItem(storageKey(),code);}catch{}
    const state = P.states.find(s => s.code === code) || P.states[0];
    $('#presence').replaceChildren(P.icon(code), document.createTextNode(state.short));
    $('#presence').title = state.label;
    document.dispatchEvent(new CustomEvent('icqram-presence', { detail: { code } }));
    if (notify && profile && window.icqram.native && !['profile','settings'].includes(window.icqramView?.kind)) window.icqram.request('presence.local', { code }).catch(() => {});
  }
  function applyAvatar(value) {
    if (!profile || value?.uin !== profile.uin) return;
    const photo = $('#account-avatar');
    const valid = typeof value.avatar === 'string' && value.avatar.length < 100000 && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value.avatar);
    photo.hidden = !valid; photo.src = valid ? value.avatar : '';
    $('#account-initials').hidden = valid;
  }
  document.addEventListener('icqram-profile-avatar', event => applyAvatar(event.detail));
  function applyProfile(value) {
    if (!value || typeof value.uin !== 'string' || !/^\d+$/.test(value.uin) || typeof value.name !== 'string') throw new Error('PROFILE_INVALID');
    profile = value;
    const parsed = P.parse(value.name);
    $('#account-title').textContent = `IBQgram - @${value.uin}`;
    $('#account-name').textContent = parsed.name || 'My account';
    $('#account-initials').textContent = parsed.name.split(/\s+/).slice(0,2).map(part => Array.from(part)[0] || '').join('').toLocaleUpperCase('tr');
    applyAvatar(value);
    $('#account-username').textContent = value.username ? `@${value.username}` : 'No username';
    $('#profile-uin').value = value.uin;
    $('#profile-name').value = parsed.name;
    $('#profile-username').value = value.username ? `@${value.username}` : 'Not set';
    $('#saved-messages').disabled = false; $('#profile-button').disabled = false; $('#presence').disabled = false;
    let saved; try { saved = localStorage.getItem(storageKey()); } catch {}
    if(P.states.some(s=>s.code===value.localPresence))saved=value.localPresence;
    if(value.shareStatus===true&&parsed.code)saved=parsed.code;
    setLocal(P.states.some(s => s.code === saved) ? saved : parsed.code || 'AV',!['profile','settings','presence'].includes(window.icqramView?.kind));
    if(window.icqramView?.kind==='presence'&&!busy){selected=current;$('#presence-publish').checked=value.shareStatus===true;$('#presence-remove').checked=false;preview();}
    $('#presence-sharing').textContent=value.shareStatus?'Status sharing: On…':'Status sharing…';
  }
  async function loadProfile() {
    if (!window.icqram.native || window.icqramView?.fixtures) return;
    $('#account-error').textContent = '';
    const generation = profileGeneration;
    try { const result = await window.icqram.request('profile.load'); if (generation === profileGeneration) applyProfile(result.profile); }
    catch { if (generation === profileGeneration) $('#account-error').textContent = 'Could not load your profile. Select Refresh to try again.'; }
  }
  function preview() {
    const publish = $('#presence-publish').checked;
    const removing=$('#presence-remove').checked||(!publish&&profile?.shareStatus===true);
    const code = removing ? '' : selected;
    $('#presence-preview').textContent = profile ? [profile.firstName, P.lastNameWithStatus(profile.lastName, code)].filter(Boolean).join(' ') : '';
    $('#presence-preview-row').hidden = !publish&&!removing;
    $('#presence-apply').textContent = publish||removing ? 'Update Telegram name' : 'Apply';
    $('#presence-remove').disabled = busy||!P.parse(profile?.name).code;
    $('#presence-apply').disabled = !profile || busy;
    for (const button of $('#presence-options').children) button.setAttribute('aria-checked', String(button.dataset.code === selected));
  }
  for (const state of P.states) {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.code = state.code;
    button.setAttribute('role', 'radio'); button.append(P.icon(state.code), document.createTextNode(state.label));
    button.addEventListener('click', () => { selected = state.code; preview(); });
    $('#presence-options').append(button);
  }
  $('#presence-sharing').addEventListener('click', () => {
    if(window.icqram.native){window.icqram.request('window.openPanel',{kind:'presence'}).catch(()=>{});return;}
    $('#settings-dialog').close();
    selected = current; $('#presence-error').textContent = ''; $('#presence-publish').checked = false;
    $('#presence-remove').checked = false; preview(); $('#presence-dialog').showModal();
  });
  const menus = [[$('#presence'),$('#presence-dropup')],[$('#logo-button'),$('#main-dropup')]];
  function closeMenus(focus=false) {
    for(const [trigger,menu] of menus){const opened=!menu.hidden;menu.hidden=true;trigger.setAttribute('aria-expanded','false');if(opened&&focus)trigger.focus();}
  }
  function menuButtons(menu){return Array.from(menu.querySelectorAll('button')).filter(b=>!b.disabled);}
  function openMenu(trigger,menu,last=false){
    const wasOpen=!menu.hidden;closeMenus();if(wasOpen)return;
    menu.hidden=false;trigger.setAttribute('aria-expanded','true');
    for(const button of $('#status-menu-options').children)button.setAttribute('aria-checked',String(button.dataset.code===current));
    const buttons=menuButtons(menu),active=buttons.find(b=>b.dataset.code===current);
    (last?buttons.at(-1):active||buttons[0])?.focus();
  }
  for(const state of P.states){
    const button=document.createElement('button');button.type='button';button.dataset.code=state.code;button.tabIndex=-1;
    button.setAttribute('role','menuitemradio');button.setAttribute('aria-checked','false');button.append(P.icon(state.code),document.createTextNode(state.label));
    button.addEventListener('click',()=>{if(!profile||busy)return;closeMenus(true);changeStatus(state.code);});
    $('#status-menu-options').append(button);
  }
  for(const [trigger,menu] of menus){
    trigger.addEventListener('click',()=>openMenu(trigger,menu));
    trigger.addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();if(menu.hidden)openMenu(trigger,menu,event.key==='ArrowUp');}});
    menu.addEventListener('keydown',event=>{
      const buttons=menuButtons(menu),index=buttons.indexOf(document.activeElement);let next;
      if(event.key==='ArrowDown')next=(index+1)%buttons.length;
      if(event.key==='ArrowUp')next=(index-1+buttons.length)%buttons.length;
      if(event.key==='Home')next=0;if(event.key==='End')next=buttons.length-1;
      if(next!==undefined){event.preventDefault();buttons[next]?.focus();}
      if(event.key==='Tab')closeMenus();
    });
  }
  for(const id of ['system-menu','sound','main-about'])$('#'+id).addEventListener('click',()=>closeMenus());
  document.addEventListener('pointerdown',event=>{if(!menus.some(([trigger,menu])=>trigger.contains(event.target)||menu.contains(event.target)))closeMenus();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeMenus(true);}});
  window.addEventListener('blur',()=>closeMenus());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)closeMenus();});
  for (const id of ['presence-publish', 'presence-remove']) $(`#${id}`).addEventListener('change', preview);
  const closePresence=()=>{if(window.icqramView?.kind==='presence')window.icqram.request('window.close').catch(()=>{});else $('#presence-dialog').close();};
  async function changeStatus(code, options={}) {
    if(!profile||busy||!P.states.some(s=>s.code===code))return;
    const publishing=options.share===true||options.remove===true||profile.shareStatus===true;
    if(!publishing){setLocal(code);if(options.close)closePresence();return;}
    busy=true;$('#presence-error').textContent='';$('#account-error').textContent='Updating status…';$('#presence').disabled=true;
    for(const button of $('#presence-options').children)button.disabled=true;
    $('#presence-publish').disabled=true;preview();
    const generation=profileGeneration;
    const params={code:options.remove?'':code,publish:true,firstName:profile.firstName,lastName:profile.lastName};
    if(typeof options.share==='boolean')params.shareChanges=options.share&&!options.remove;
    try{
      const result=await window.icqram.request('presence.set',params);
      if(generation!==profileGeneration||!profile)return;
      result.profile.localPresence=code;
      applyProfile(result.profile);setLocal(code);$('#account-error').textContent='';
      if(options.close)closePresence();
      document.dispatchEvent(new CustomEvent('icqram-refresh-contacts'));
    }catch(error){
      if(generation!==profileGeneration||!profile)return;
      const message=errors[error.code]||(error.code==='BUSY'?'A status update is already in progress.':error.code==='SAVE_FAILED'?'The preference could not be saved. Refresh your profile before retrying.':'Could not share your status. Refresh your profile and try again.');
      await loadProfile();
      if(generation===profileGeneration&&profile){$('#presence-error').textContent=message;$('#account-error').textContent=message;}
    }finally{
      busy=false;$('#presence-publish').disabled=false;$('#presence').disabled=!profile;
      for(const button of $('#presence-options').children)button.disabled=false;
      preview();
    }
  }
  $('#presence-apply').addEventListener('click',()=>{
    const share=$('#presence-publish').checked;
    const remove=$('#presence-remove').checked||(!share&&profile?.shareStatus===true);
    return changeStatus(selected,{share,remove,close:true});
  });
  document.addEventListener('icqram-tray-presence',event=>changeStatus(event.detail?.code));
  document.addEventListener('icqram-presence-changed',event=>{
    const code=event.detail?.code;if(!profile||!P.states.some(s=>s.code===code))return;
    setLocal(code,false);
  });
  $('#saved-messages').addEventListener('click',async()=>{
    if(!profile || !window.icqram.native)return;
    try {await window.icqram.request('window.openChat',{contactId:profile.uin});}
    catch {$('#account-error').textContent='Could not open Saved Messages. Please try again.';}
  });
  $('#profile-button').addEventListener('click', () => { if(window.icqram.native) window.icqram.request('window.openProfile').catch(()=>{}); else $('#profile-dialog').showModal(); });
  for (const button of document.querySelectorAll('[data-close-dialog]')) button.addEventListener('click', () => { if(['profile','presence'].includes(window.icqramView?.kind)) window.icqram.request('window.close').catch(()=>{}); else button.closest('dialog').close(); });
  document.addEventListener('icqram-refresh-profile', loadProfile);
  $('#refresh-account').addEventListener('click', () => { loadProfile(); document.dispatchEvent(new CustomEvent('icqram-refresh-contacts')); });
  document.addEventListener('icqram-session', event => { ++profileGeneration; if (event.detail?.auth === 'ready') loadProfile(); else { profile=null; $('#account-avatar').hidden=true; $('#account-avatar').src=''; $('#account-initials').textContent=''; } });
  setLocal('AV');
  if(window.icqramView?.kind==='profile'){ $('#profile-dialog').classList.add('window','active-window'); $('#profile-dialog').show(); document.addEventListener('keydown',event=>{if(event.key==='Escape')window.icqram.request('window.close').catch(()=>{});}); }
})();

/* Shared appearance preference, independent of account/session state. */
(() => {
  const root = document.documentElement;
  const media = matchMedia('(prefers-color-scheme: dark)');
  const allowed = new Set(['system', 'light', 'dark']);
  let preference = 'system';
  try { const saved = localStorage.getItem('icqram.theme'); if (allowed.has(saved)) preference = saved; } catch {}
  const select = document.querySelector('#theme-choice');
  const dialog = document.querySelector('#settings-dialog');
  const apply = value => {
    if (!allowed.has(value)) return false;
    preference = value;
    root.dataset.theme = value === 'system' ? (media.matches ? 'dark' : 'light') : value;
    if (select) select.value = value;
    return true;
  };
  const save = value => {
    if (!apply(value)) return;
    try { localStorage.setItem('icqram.theme', value); } catch {}
    if (window.icqram?.native) window.icqram.request('preferences.theme', { theme: value }).catch(() => {});
  };
  const open = () => { if(window.icqram?.native) window.icqram.request('window.openPanel',{kind:'settings'}).catch(()=>{}); else if(dialog && !dialog.open)dialog.showModal(); };
  select?.addEventListener('change', () => save(select.value));
  for (const button of document.querySelectorAll('[data-settings-close]')) button.addEventListener('click', () => { if(window.icqramView?.kind==='settings') window.icqram.request('window.close').catch(()=>{}); else dialog.close(); });
  for (const id of ['#settings-button', '#system-menu']) document.querySelector(id)?.addEventListener('click', open);
  dialog?.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  media.addEventListener('change', () => apply(preference));
  window.addEventListener('storage', event => { if (event.key === 'icqram.theme') apply(event.newValue || 'system'); });
  window.addEventListener('icqram-theme', event => { if (apply(event.detail?.theme)) { try { localStorage.setItem('icqram.theme', preference); } catch {} } });
  window.ICQTheme = Object.freeze({ open });
  apply(preference);
})();
/* Native window operations. */
(() => {
  if (!window.icqramView) return;
  const request = (method, params) => window.icqram.request(method, params).catch(() => {});
  for (const button of document.querySelectorAll('.native-close')) button.addEventListener('click', () => request('window.close'));
  let finishDrag = () => {};
  document.addEventListener('pointerdown', event => {
    const bar = event.target.closest('.window > .titlebar');
    if (!bar || event.button !== 0 || event.target.closest('button, input, select, a')) return;
    finishDrag();
    event.preventDefault();
    window.getSelection()?.removeAllRanges();
    request('window.dragStart', { x: event.screenX, y: event.screenY });
    try { bar.setPointerCapture(event.pointerId); } catch { /* System dragging can take pointer ownership. */ }
    const move = e => {
      if (e.pointerId !== event.pointerId) return;
      if (!(e.buttons & 1)) { finishDrag(); return; }
      request('window.dragMove', { x: e.screenX, y: e.screenY });
    };
    const end = e => {
      if (e.pointerId !== event.pointerId) return;
      if (e.type === 'pointerup') request('window.dragMove', { x: e.screenX, y: e.screenY });
      finishDrag();
    };
    finishDrag = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', end);
      document.removeEventListener('pointercancel', end);
      window.removeEventListener('blur', finishDrag);
      if (bar.hasPointerCapture(event.pointerId)) bar.releasePointerCapture(event.pointerId);
      request('window.dragEnd');
      finishDrag = () => {};
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
    window.addEventListener('blur', finishDrag);
  });
  if (['chat','directory','viewer','profile','settings','about','presence','info','now','commands'].includes(window.icqramView.kind)) return;
  let previous = '', resizing = false, contactsReady = false;
  let contactSize=null;
  try { const saved=JSON.parse(localStorage.getItem('icqram.contacts.size'));if(saved&&Number.isFinite(saved.width)&&Number.isFinite(saved.height))contactSize={width:Math.max(236,Math.min(900,saved.width)),height:Math.max(300,Math.min(1000,saved.height))}; }catch{}
  const nativeSize=window.icqramView.contactsSize;
  if(nativeSize&&Number.isFinite(nativeSize.width)&&Number.isFinite(nativeSize.height))contactSize={width:Math.max(236,Math.min(900,nativeSize.width)),height:Math.max(300,Math.min(1000,nativeSize.height))};
  let pendingSize=null, dragResizing=false;
  const resizeContacts=async size=>{
    pendingSize={width:Math.max(236,Math.min(900,size.width)),height:Math.max(300,Math.min(1000,size.height))};
    if(dragResizing)return;dragResizing=true;
    while(pendingSize){const next=pendingSize;pendingSize=null;try{await window.icqram.request('window.resize',{...next,surface:'contacts',remember:true});contactSize=next;try{localStorage.setItem('icqram.contacts.size',JSON.stringify(next));}catch{}}catch{pendingSize=null;}}
    dragResizing=false;
  };
  const grip=document.querySelector('.contacts-resize-grip');
  grip.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;event.preventDefault();
    const start={x:event.screenX,y:event.screenY,width:window.innerWidth,height:window.innerHeight};grip.setPointerCapture(event.pointerId);
    const move=e=>{if(e.pointerId===event.pointerId)resizeContacts({width:Math.round(start.width+e.screenX-start.x),height:Math.round(start.height+e.screenY-start.y)});};
    const end=e=>{if(e.pointerId!==event.pointerId)return;if(e.type==='pointerup')move(e);for(const type of ['pointerup','pointercancel','lostpointercapture'])grip.removeEventListener(type,end);grip.removeEventListener('pointermove',move);if(grip.hasPointerCapture(event.pointerId))grip.releasePointerCapture(event.pointerId);};
    grip.addEventListener('pointermove',move);for(const type of ['pointerup','pointercancel','lostpointercapture'])grip.addEventListener(type,end);
  });
  grip.addEventListener('keydown',event=>{
    const delta={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]}[event.key];
    if(delta){event.preventDefault();resizeContacts({width:window.innerWidth+delta[0],height:window.innerHeight+delta[1]});}
  });
  const resize = () => {
    if (resizing) return;
    const loggedIn=document.querySelector('#login-screen').hidden;
    if(loggedIn&&contactsReady)return;
    if(!loggedIn){contactsReady=false;delete document.documentElement.dataset.contactsResizable;}
    const surface = document.querySelector(loggedIn ? '#desktop' : '.login-window');
    const bounds = loggedIn&&contactSize ? contactSize : surface.getBoundingClientRect();
    const width = Math.ceil(bounds.width), height = Math.ceil(bounds.height);
    const key = `${loggedIn}:${width}:${height}`;
    if (key === previous || width < 200 || height < 100) return;
    resizing = true;
    window.icqram.request('window.resize', { width, height, surface:loggedIn?'contacts':'login', remember:loggedIn&&!!contactSize }).then(() => {
      if(loggedIn){contactsReady=true;document.documentElement.dataset.contactsResizable='true';}
      previous = key; resizing = false; schedule();
    }).catch(() => { resizing = false; });
  };
  const schedule = () => requestAnimationFrame(resize);
  const observer = new ResizeObserver(schedule);
  for (const selector of ['.login-window', '#desktop']) observer.observe(document.querySelector(selector));
  document.addEventListener('icqram-session', schedule);
  window.addEventListener('load', schedule);
  window.addEventListener('resize', schedule);
  schedule();
})();

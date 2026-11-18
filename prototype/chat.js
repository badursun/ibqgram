(() => {
  'use strict';
  if (!window.icqram.native || window.icqramView?.kind !== 'chat') return;
  const panel = document.querySelector('#classic-chat-template').content.firstElementChild.cloneNode(true);
  document.querySelector('#chat-windows').append(panel);
  panel.classList.add('active-window');
  const $ = selector => panel.querySelector(selector);
  const make = (tag, className, text) => Object.assign(document.createElement(tag), { className, textContent: text });
  const log = $('.history'), input = $('textarea'), send = $('.send');
  const footer = $('.chat-footer').firstElementChild;
  const counter = $('.chat-chars');
  const composeMode = $('.compose-mode-button'), historyMode = $('.history-mode-button');
  const older = $('.older-messages'), refresh = $('.refresh-chat');
  const notice = $('.chat-notice'), userMenu = $('.chat-user-menu');
  const grip = $('.chat-resize-grip');
  let notificationTopic=Number(window.icqramView.panelData?.topicId)||0;
  let notificationPending=Number.isInteger(window.icqramView.panelData?.topicId);
  window.addEventListener('icqram-open-notification',event=>{notificationTopic=Number(event.detail?.topicId)||0;notificationPending=true;return openNotificationTopic();});
  async function openNotificationTopic(){
    if(!notificationPending||!initialized||switchingTopic||sending)return;
    setMode(false);
    if(peerInfo?.forum&&notificationTopic){await loadTopics();if(!topicsLoaded)return;const id=notificationTopic;notificationTopic=0;await selectTopic(id);}
    notificationPending=false;log.scrollTop=log.scrollHeight;
  }
  let topicId=0, generation=0, switchingTopic=false, topicsLoading=false, topicsLoaded=false;
  const contextRequest=(method,params={})=>window.icqram.request(method,{...params,topicId});
  let draftLoaded=false, draftDirty=false, draftQueue=Promise.resolve(), draftVersion=0;
  function saveDraft() {
    if(!draftLoaded)return draftQueue;
    const text=input.value, savedTopic=topicId;
    draftQueue=draftQueue.catch(()=>{}).then(()=>window.icqram.request('chat.draft.set',{text,topicId:savedTopic})).then(result=>{if(notice.dataset.kind==='draft'){notice.hidden=true;notice.textContent='';}return result;});
    draftQueue.catch(()=>{notice.dataset.kind='draft';notice.hidden=false;notice.textContent='Taslak kaydedilemedi. Uygulamayı kapatmadan yeniden dene.';});
    return draftQueue;
  }
  async function restoreDraft() {
    if(draftLoaded)return;
    const version=draftVersion, context=generation;
    try { const result=await contextRequest('chat.draft.get');
      if(context!==generation)return;
      if(!draftDirty && version===draftVersion && typeof result.text==='string')input.value=result.text.slice(0,4000);
      draftLoaded=true;counter.textContent=String(window.ICQChatModel.countCharacters(input.value));
      if(draftDirty)await saveDraft();
    } catch {notice.dataset.kind='draft';notice.hidden=false;notice.textContent='Kayıtlı taslak yüklenemedi. Yazdıkların bu pencerede korunuyor.';}
  }
  async function closeChat() { try {await saveDraft();await window.icqram.request('window.close');}catch{} }

  $('.recipient-uin').value = window.icqramView.contactId;
  $('.recipient-uin').title = window.icqramView.contactId;
  let peerInfo = null, enterSends = true;
  const showInfo = (title, lines) => {
    window.icqram.request('window.openPanel',{kind:'info',title,lines}).catch(()=>{});
  };
  $('.user-details').addEventListener('click', () => {
    if (peerInfo) showInfo(name, [`UIN ${peerInfo.id}`, peerInfo.username ? '@' + peerInfo.username : 'Kullanıcı adı yok']);
  });
  $('.cancel-session').addEventListener('click', closeChat);
  const setMode = compose => {
    panel.classList.toggle('compose-mode', compose); $('.history-view').hidden = compose; log.hidden = compose; $('.composer').hidden = false;
    composeMode.setAttribute('aria-pressed', String(compose)); historyMode.setAttribute('aria-pressed', String(!compose));
    if (compose) input.focus();
  };
  composeMode.addEventListener('click', () => setMode(true)); historyMode.addEventListener('click', () => setMode(false));
  $('.menu-history').addEventListener('click', () => { setMode(false); userMenu.open = false; });
  $('.menu-theme').addEventListener('click', () => { window.ICQTheme?.open(); userMenu.open = false; });
  $('.peer-avatar').addEventListener('click', () => $('.user-details').click());
  document.addEventListener('pointerdown', event => { if (!userMenu.contains(event.target)) userMenu.open = false; });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') userMenu.open = false; });
  const tool = name => panel.querySelector(`[data-tool="${name}"]`);
  tool('sound').addEventListener('click', () => { window.ICQAudio?.setEnabled(!window.ICQAudio.enabled); tool('sound').setAttribute('aria-pressed', String(window.ICQAudio.enabled)); });
  tool('message').addEventListener('click', () => { enterSends = !enterSends; tool('message').setAttribute('aria-pressed', String(enterSends)); tool('message').title = enterSends ? 'Enter: gönder · Shift+Enter: yeni satır' : 'Enter: yeni satır · Send: gönder'; });
  tool('privacy').addEventListener('click', () => showInfo('Telegram sohbeti', ['Bu pencere Telegram bulut sohbetini kullanır. Gizli sohbet veya uçtan uca şifreli sohbet değildir.']));
  tool('font').addEventListener('click', () => {
    const fonts = ['Tahoma', 'Arial', 'Monaco']; const current = fonts.indexOf(input.style.fontFamily);
    input.style.fontFamily = fonts[(current + 1) % fonts.length]; tool('font').title = 'Yazı tipi: ' + input.style.fontFamily;
  });
  for (const [name, property, initial] of [['text-color', 'color', '#000000'], ['background-color', 'backgroundColor', '#ffffff']]) {
    const picker = document.createElement('input'); picker.type = 'color'; picker.value = initial; picker.className = 'session-color-picker'; picker.tabIndex = -1;
    panel.append(picker); picker.addEventListener('input', () => { input.style[property] = picker.value; }); tool(name).addEventListener('click', () => picker.click());
  }
  let restoredSize = null;
  $('.maximize').addEventListener('click', () => {
    const size = restoredSize || { width: Math.min(1000, screen.availWidth), height: Math.min(800, screen.availHeight) };
    restoredSize = restoredSize ? null : { width: window.innerWidth, height: window.innerHeight };
    window.icqram.request('window.resize', size).catch(() => {});
  });
  setMode(true);
  input.addEventListener('input', () => { draftDirty=true;++draftVersion;saveDraft();counter.textContent = String(window.ICQChatModel.countCharacters(input.value)); send.disabled = !initialized || sending || (peerInfo?.blocked || peerInfo?.canSend===false) || !input.value.trim(); notifyTyping(); commandPalette?.onInput(); });
  let queuedSize = null, resizing = false;
  const resize = async size => {
    queuedSize = size; if (resizing) return;
    resizing = true;
    while (queuedSize) {
      const next = queuedSize; queuedSize = null;
      try { await window.icqram.request('window.resize', next); } catch { queuedSize = null; }
    }
    resizing = false;
  };
  grip.addEventListener('pointerdown', event => {
    if (event.button !== 0) return; event.preventDefault();
    const start = { x: event.screenX, y: event.screenY, width: window.innerWidth, height: window.innerHeight };
    grip.setPointerCapture(event.pointerId);
    const move = e => { if (e.pointerId === event.pointerId) resize({ width: Math.round(start.width + e.screenX - start.x), height: Math.round(start.height + e.screenY - start.y) }); };
    const end = e => {
      if (e.pointerId !== event.pointerId) return;
      if (e.type === 'pointerup') move(e);
      grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', end); grip.removeEventListener('pointercancel', end); grip.removeEventListener('lostpointercapture', end);
      if (grip.hasPointerCapture(event.pointerId)) grip.releasePointerCapture(event.pointerId);
    };
    grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', end); grip.addEventListener('pointercancel', end); grip.addEventListener('lostpointercapture', end);
  });
  grip.addEventListener('keydown', event => {
    const delta = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] }[event.key];
    if (delta) { event.preventDefault(); resize({ width: window.innerWidth + delta[0], height: window.innerHeight + delta[1] }); }
  });
  let messages = [], name = 'Sohbet', initialized = false, loading = false, sending = false;
  const commandPalette = window.ICQBotCommands?.mount(panel, { input, send: sendText, refresh: () => window.icqram.request('chat.commands.refresh'), canSend: () => initialized && !sending && !switchingTopic });
  window.addEventListener('icqram-command-selected', event => {
    const command = event.detail?.command;
    if (event.detail?.topicId !== topicId || typeof command !== 'string' || !/^[A-Za-z0-9_]{1,32}$/.test(command)) return;
    if (!peerInfo?.bot) return;
    return sendText('/' + command, !/^\/[A-Za-z0-9_]{0,32}$/.test(input.value));
  });
  let oldest = 0, hasMore = false, retry = null, dirty = false, timer = 0, cooldownUntil = 0;
  $('.chat-title').textContent = '✉ Sohbet'; $('.person-name').value = 'Yükleniyor…';
  $('.person-status').textContent = `UIN ${window.icqramView.contactId}`;
  send.disabled = true;
  function render(prepend = false) {
    const distance = log.scrollHeight - log.scrollTop;
    const atBottom = !initialized || distance - log.clientHeight < 50;
    const previousTop = log.scrollTop;
    log.replaceChildren(); let day = '';
    for (const message of messages) {
      const date = new Date(message.date * 1000);
      const label = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
      if (label !== day) { log.append(make('div', 'day', label)); day = label; }
      const item = make('div', `message${message.out ? ' mine' : ''}`, ''); item.dataset.messageId = String(message.id);
      const meta = make('div', 'message-meta', '');
      const time = make('time', '', date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })); time.dateTime = date.toISOString();
      meta.append(make('span', '', message.out ? 'Ben' : message.sender || name), time);
      if(message.out && !peerInfo?.self && !peerInfo?.bot && !peerInfo?.group && !peerInfo?.channel){const receipt=make('span','receipt',message.id <= (peerInfo?.readOutboxMaxId||0) ? '✓✓ Okundu' : '✓ Gönderildi');receipt.dataset.receiptId=String(message.id);meta.append(receipt);}
      const body = make('p', '', '');
      const parts = window.ICQChatModel.commandParts(message.text || (message.file || message.photo ? '' : 'Boş mesaj'), message.commands);
      if (!parts.some(part => part.command)) body.textContent = message.text || (message.file || message.photo ? '' : 'Boş mesaj');
      for (const part of parts.some(part => part.command) ? parts : []) {
        const text = make(part.command ? 'button' : 'span', part.command ? 'bot-command' : '', part.text);
        if (part.command) { text.type = 'button'; text.title = `${part.text} komutunu gönder`; text.addEventListener('click', () => sendText(part.text, true)); }
        body.append(text);
      }
      item.append(meta, body);
      if (message.file) {
        const file = make('button', 'message-file', `${message.file.playable ? '▶' : '↓'} ${message.file.name || ({voice:'Sesli mesaj',video:'Video',audio:'Ses dosyası'}[message.file.kind] || 'Dosya')} · ${bytes(message.file.size)}`); file.type = 'button';
        file.addEventListener('click', async () => { file.disabled = true; try { if(message.file.playable){await window.icqram.request('window.openMedia',{messageId:message.id});return;} const result=await window.icqram.request('chat.file.download', {messageId:message.id}); if(!result.cancelled){dismissedTransfers.delete('download:'+message.id);transferSignature='';setMode(false);} await pollState(); } catch(error) { showError(error); } finally { file.disabled = false; } });
        item.append(file);
      }
      if(message.photo){
        const show=make('button','photo-load','▧ Fotoğrafı aç');show.type='button';
        show.addEventListener('click',async()=>{show.disabled=true;try{await window.icqram.request('window.openMedia',{messageId:message.id});}catch(error){showError(error);}finally{show.disabled=false;}});item.append(show);
      }
      log.append(item);
    }
    if (!messages.length) log.append(make('p', 'empty', peerInfo?.forum&&!topicId?'Select a topic on the left.':'No messages yet.'));
    $('.message-count').textContent = `${messages.length} messages`;
    if (prepend) log.scrollTop = log.scrollHeight - distance;
    else log.scrollTop = atBottom ? log.scrollHeight : previousTop;
  }
  const errors = {
    TOPICS_UNAVAILABLE:'Topics could not be loaded. Please retry.',
    TOPIC_UNAVAILABLE:'This topic is no longer available.',
    TOPIC_CHANGED:'The selected topic changed. Please retry.',
    CHAT_READ_ONLY:'Bu sohbette mesaj gönderme iznin yok.',
    FLOOD_WAIT: 'Telegram beklemeni istiyor. Bir süre sonra yeniden dene.',
    LOCKED: 'Uygulamanın kilidini açtıktan sonra tekrar dene.',
    SEND_UNCERTAIN: 'Gönderim onayı gecikti. Geçmişi yenile veya aynı mesajı güvenle tekrar dene.',
    TIMEOUT: 'Yanıt gecikti. Bağlantını kontrol edip yeniden dene.',
    SESSION_SEND_LIMIT: 'Bu sohbet için uygulamayı yeniden açman gerekiyor.'
  };
  Object.assign(errors, {MEDIA_LIMIT:'Bu pencerede fotoğraf sınırına ulaşıldı. Pencereyi yeniden başlatabilirsin.', MEDIA_NOT_READY:'Önce fotoğrafın yüklenmesini bekle.', FILE_SAVE_FAILED:'Fotoğraf kaydedilemedi. Hedef klasörü kontrol et.', PEER_BLOCKED:'Bu kişi engellendi. Mesaj göndermek için engeli kaldır.', INVALID_FILE:'1 bayt–2000 MB arasında okunabilir bir dosya seç.', FILE_CHANGED:'Seçilen dosya değişti. Yeniden seç.', FILE_UNAVAILABLE:'Bu dosya indirilemiyor.', BLOCK_FAILED:'Engelleme işlemi tamamlanamadı.', BUSY:'Devam eden işlemin bitmesini bekle.'});
  function showError(error) { notice.dataset.kind='action'; notice.hidden=false; notice.textContent=errors[error.code] || 'İşlem tamamlanamadı. Yeniden deneyebilirsin.'; }
  function bytes(value) { const n=Number(value)||0; return n>=1048576 ? `${(n/1048576).toFixed(1)} MB` : n>=1024 ? `${(n/1024).toFixed(1)} KB` : `${n} B`; }
  const topicRetries=new Map();
  let topicSignature='';
  function renderTopics(peer) {
    $('.topic-panel').hidden=!peer.forum;
    if(!peer.forum)return;
    const topics=(peer.topics||[]).filter(t=>Number.isInteger(t.id)&&t.id>0&&typeof t.title==='string').sort((a,b)=>a.id-b.id);
    const signature=JSON.stringify([topics,topicId,switchingTopic]);
    if(signature!==topicSignature){
      topicSignature=signature;const buttons=$('.topic-buttons');buttons.replaceChildren();
      for(const topic of topics){
        const button=make('button','topic-button','');button.type='button';button.title=topic.title+(topic.closed?' (Closed)':'');
        button.setAttribute('aria-label',button.title);button.setAttribute('aria-pressed',String(topic.id===topicId));button.disabled=switchingTopic;
        const icon=make('span','topic-folder',topic.id===1?'#':Array.from(topic.title)[0]||'#');
        icon.setAttribute('aria-hidden','true');icon.style.backgroundColor='#'+((Number(topic.color)||0xedd267)&0xffffff).toString(16).padStart(6,'0');
        button.append(icon);if(topic.closed)button.append(make('span','topic-lock','×'));
        button.addEventListener('click',()=>selectTopic(topic.id));buttons.append(button);
      }
      if(!topics.length)buttons.append(make('span','topic-empty',topicsLoading?'Loading…':'No topics'));
    }
    $('.topic-current').hidden=!topicId;$('.topic-current').textContent=peer.topicTitle||'';$('.topic-current').title=peer.topicTitle||'';
  }
  async function loadTopics() {
    if(topicsLoading||!peerInfo?.forum)return;
    topicsLoading=true;$('.topics-retry').hidden=true;
    try{
      let more=true,page=0;
      while(more){const result=await window.icqram.request('chat.topics',{reset:page===0});if(result.peer)applyPeer(result.peer);more=result.hasMore===true;if(++page>=500&&more)throw new Error('Topic limit');}
      topicsLoaded=true;
    }catch(error){$('.topics-retry').hidden=false;showError(error);}
    finally{topicsLoading=false;topicSignature='';renderTopics(peerInfo);}
  }
  $('.topics-retry').addEventListener('click',loadTopics);
  async function selectTopic(id) {
    if(switchingTopic||sending||id===topicId)return;
    switchingTopic=true;input.disabled=true;send.disabled=true;
    renderTopics(peerInfo);
    try{
      await saveDraft();
      const state=await window.icqram.request('chat.topic.select',{topicId:id});
      if(retry)topicRetries.set(topicId,retry);else topicRetries.delete(topicId);
      ++generation;clearTimeout(typingTimer);topicId=id;loading=false;dirty=false;clearTimeout(timer);
      messages=[];oldest=0;hasMore=false;initialized=false;retry=topicRetries.get(id)||null;readSent=0;cooldownUntil=0;
      draftLoaded=false;draftDirty=false;++draftVersion;input.value='';counter.textContent='0';
      log.replaceChildren();notice.hidden=true;applyPeer(state);setMode(false);
      await restoreDraft();
    }catch(error){showError(error);}
    finally{switchingTopic=false;input.disabled=false;topicSignature='';renderTopics(peerInfo);}
    await load();
  }
  function applyPeer(peer) {
    if (!peer || peer.id !== window.icqramView.contactId) return;
    if(peer.forum && Number(peer.topicId||0)!==topicId)return;
    peerInfo = {...peerInfo,...peer};
    renderTopics(peerInfo);
    const presence=window.ICQPresence.describe(peer);name=presence.name||'Telegram user';
    const status=peer.blocked?'Blocked':peer.typing||presence.text;
    $('.chat-title').textContent=peer.self?'Saved Messages - Message Session':`${name} (${status}) - Message Session`;
    $('.person-name').value=name;
    $('.recipient-uin').value=peer.id.replace(/^(chat|channel):/,'');
    input.placeholder=peer.canSend===false?(peer.forum&&!topicId?'Select a topic to view messages.':'You cannot send messages here.') : '';
    input.readOnly=peer.canSend===false;
    const oldIcon=$('.peer-status-icon');
    if (window.ICQPresence.icon && oldIcon?.replaceChildren) { const neutral=peer.bot||peer.group||peer.channel;const icon=window.ICQPresence.icon(presence.code,neutral?undefined:peer.online); oldIcon.replaceChildren(icon); }
    $('.menu-block').textContent=peer.blocked ? 'Engeli kaldır' : 'Kişiyi engelle';
    $('.menu-block').disabled=!!(peer.self||peer.group||peer.channel);
    $('.attach-file').disabled=!!peer.blocked||peer.canSendFiles===false;
    $('.menu-file').disabled=!!peer.blocked||peer.canSendFiles===false;
    commandPalette?.update(peer);
    send.disabled=!initialized || sending || peer.blocked || peer.canSend===false || !input.value.trim();
    for(const receipt of log.querySelectorAll?.('[data-receipt-id]') || [])receipt.textContent=Number(receipt.dataset.receiptId)<=(peer.readOutboxMaxId||0)?'✓✓ Okundu':'✓ Gönderildi';
  }
  let readInFlight=false, readSent=0;
  async function markVisibleRead() {
    if(switchingTopic || !initialized || document.hidden || !document.hasFocus?.() || log.hidden || readInFlight)return;
    const bounds=log.getBoundingClientRect();let id=0;
    for(const message of messages){
      if(message.out)continue;
      const element=log.querySelector(`[data-message-id="${message.id}"]`);if(!element)continue;
      const rect=element.getBoundingClientRect();
      // Long messages count only after their bottom is actually visible.
      if(rect.bottom<=bounds.bottom && rect.bottom>bounds.top && rect.top<bounds.bottom)id=Math.max(id,message.id);
    }
    if(id<=Math.max(readSent,peerInfo?.readInboxMaxId||0))return;
    readInFlight=true;const context=generation;
    try {const result=await contextRequest('chat.read',{messageId:id});if(result.accepted&&context===generation)readSent=id;}catch{}finally{readInFlight=false;}
  }
  log.addEventListener('scroll',markVisibleRead);
  let stateLoading=false, transferSignature='', completedUploads=new Set();
  const dismissedTransfers=new Set();
  async function pollState() {
    if (stateLoading || document.hidden || switchingTopic) return;
    const context=generation;
    stateLoading=true;
    try { const state=await window.icqram.request('chat.state'); if(context!==generation||switchingTopic)return;applyPeer(state); renderTransfers(state.transfers || []); markVisibleRead(); } catch {} finally { stateLoading=false; }
  }
  function renderTransfers(transfers) {
    const signature=JSON.stringify(transfers); if(signature===transferSignature)return; transferSignature=signature;
    const box=$('.chat-transfers'); box.replaceChildren();
    for(const transfer of transfers) {
      const key=transfer.direction==='upload' ? 'upload:'+transfer.token : 'download:'+transfer.messageId;
      if(transfer.direction==='upload' && transfer.state==='done' && !completedUploads.has(key)) { completedUploads.add(key); schedule(); }
      if(transfer.state==='done' || dismissedTransfers.has(key))continue;
      const row=make('div','file-transfer','');
      const labels={ready:'Gönderilmeye hazır',uploading:'Yükleniyor',sending:'Gönderim onayı bekleniyor',downloading:'İndiriliyor',done:transfer.direction==='upload'?'Gönderildi':'Kaydedildi',failed:'Aktarım başarısız',cancelled:'İptal edildi',uncertain:'Gönderim onayı belirsiz; geçmişi kontrol et'};
      const label=make('span','transfer-label',transfer.name);label.title=transfer.name;row.append(label);
      const status=make('span','transfer-status',`${labels[transfer.state] || transfer.state} · ${bytes(transfer.bytes)} / ${bytes(transfer.size)}`);status.title=status.textContent;row.append(status);
      const progress=make('progress','', ''); progress.max=Math.max(1,transfer.size||1); progress.value=Math.min(progress.max,Math.max(0,transfer.bytes||0)); row.append(progress);
      if(transfer.state==='ready') { const go=make('button','', 'Gönder');go.type='button';go.addEventListener('click',async()=>{go.disabled=true;try{await contextRequest('chat.file.send',{token:transfer.token});await pollState();}catch(error){showError(error);go.disabled=false;}});row.append(go); }
      if(['ready','uploading','downloading'].includes(transfer.state)) { const cancel=make('button','', '×');cancel.type='button';cancel.title='Aktarımı iptal et';cancel.setAttribute('aria-label','Aktarımı iptal et');cancel.addEventListener('click',async()=>{await window.icqram.request('chat.file.cancel',{messageId:transfer.messageId||0}).catch(showError);await pollState();});row.append(cancel); }
      else if(!['sending'].includes(transfer.state)) { const close=make('button','','×');close.type='button';close.setAttribute('aria-label','Aktarım bilgisini kapat');close.addEventListener('click',()=>{dismissedTransfers.add(key);transferSignature='';renderTransfers(transfers);});row.append(close); }
      box.append(row);
    }
    box.hidden=!box.children.length;
  }
  const chooseFile=async()=>{if(peerInfo?.blocked||peerInfo?.canSendFiles===false)return;userMenu.open=false;try{const file=await contextRequest('chat.file.choose');if(!file.cancelled){setMode(false);await pollState();}}catch(error){showError(error);}};
  $('.menu-file').addEventListener('click',chooseFile);
  $('.attach-file').addEventListener('click',chooseFile);
  $('.menu-block').addEventListener('click',async()=>{if(peerInfo?.self||peerInfo?.group||peerInfo?.channel)return;userMenu.open=false;try{const state=await window.icqram.request('chat.block',{blocked:!peerInfo?.blocked});applyPeer(state);}catch(error){showError(error);}});
  let typingTimer=0;
  const stopTyping=()=>{clearTimeout(typingTimer);contextRequest('chat.typing',{active:false}).catch(()=>{});};
  function notifyTyping() { if(!peerInfo?.self&&!peerInfo?.bot&&!peerInfo?.blocked&&peerInfo?.canSend!==false&&!peerInfo?.channel){contextRequest('chat.typing',{active:!!input.value}).catch(()=>{});clearTimeout(typingTimer);typingTimer=setTimeout(stopTyping,5000);} }
  input.addEventListener('blur',stopTyping);
  setInterval(()=>{if(initialized)pollState();},750);
  async function load(before = 0) {
    if(switchingTopic)return;
    if (loading) { dirty = true; return; }
    const context=generation;
    if (Date.now() < cooldownUntil) return;
    loading = true; older.disabled = true; refresh.disabled = true;
    footer.textContent = initialized ? 'Güncelleniyor…' : 'Mesajlar yükleniyor…';
    try {
      const result = await contextRequest('chat.history', { before });
      if(context!==generation||switchingTopic)return;
      if (!Array.isArray(result?.messages) || !result.peer || !result.messages.every(window.ICQChatModel.valid)) throw new Error('Invalid history');
      applyPeer(result.peer);
      $('.person-status').textContent = `${result.peer.channel?'Kanal ID':result.peer.group?'Grup ID':'UIN'} ${result.peer.id.replace(/^(chat|channel):/,'')}${result.peer.username ? ' · @' + result.peer.username : ''}`;
      const avatar = $('.avatar-photo');
      const validAvatar = typeof result.peer.avatar === 'string' && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(result.peer.avatar) && result.peer.avatar.length < 100000;
      avatar.hidden = !validAvatar; if (validAvatar) avatar.src = result.peer.avatar;
      $('.avatar-initials').textContent = name.split(/\s+/).slice(0,2).map(part => Array.from(part)[0] || '').join('').toLocaleUpperCase('tr');
      $('.avatar-initials').hidden = validAvatar;
      const newest = messages.at(-1)?.id || 0;
      const received = initialized && !before && result.messages.some(m => !m.out && m.id > newest);
      messages = window.ICQChatModel.merge(messages, result.messages, !before);
      if (!initialized || before || !oldest) { oldest = result.oldest; hasMore = result.hasMore; }
      older.hidden = !hasMore || !oldest;
      if (result.peer.forum || (!initialized && messages.length) || received) setMode(false);
      render(Boolean(before));
      if (received) log.scrollTop = log.scrollHeight;
      initialized = true; commandPalette?.update(peerInfo); send.disabled = sending || (peerInfo?.blocked || peerInfo?.canSend===false) || !input.value.trim();
      footer.textContent = 'Telegram';
      if (notice.dataset.kind === 'history') { notice.textContent = ''; notice.hidden = true; }
      const quiet = window.icqram.presence === 'DND';
      if (received && !quiet && !window.icqram.native) window.ICQAudio?.play('message');
    } catch (error) {
      if(context!==generation||switchingTopic)return;
      if (error.code === 'FLOOD_WAIT') cooldownUntil = Date.now() + 60000;
      notice.dataset.kind = 'history'; notice.hidden = false; notice.textContent = errors[error.code] || 'Mesajlar yüklenemedi. Yenile düğmesiyle tekrar dene.';
      footer.textContent = 'Bağlantı bekleniyor';
    } finally {
      if(context!==generation)return;
      loading = false; older.disabled = false; refresh.disabled = false;
      if (dirty) { dirty = false; schedule(); }
    }
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(() => load(), 350); }
  older.addEventListener('click', () => load(oldest)); refresh.addEventListener('click', async () => {await load();if(peerInfo?.forum)await loadTopics();});
  async function sendText(text, command = false) {
    if (switchingTopic || !initialized || sending || !text || peerInfo?.blocked || peerInfo?.canSend===false) return;
    if (!retry || retry.text !== text) retry = { text, nonce: crypto.randomUUID() };
    sending = true; commandPalette?.update(peerInfo); send.disabled = true; input.disabled = true;
    notice.dataset.kind = 'send'; notice.hidden = false; notice.textContent = 'Gönderiliyor…';
    try {
      const result = await contextRequest('chat.send', {...retry,preserveDraft:command});
      if (result?.sent !== true) throw Object.assign(new Error(), { code: 'SEND_UNCERTAIN' });
      if (!command) { input.value = ''; counter.textContent = '0'; ++draftVersion;await saveDraft(); }
      retry = null; send.textContent = 'Send'; stopTyping();
      notice.textContent = ''; notice.hidden = true; setMode(false); await load();
      log.scrollTop = log.scrollHeight;
    } catch (error) {
      notice.dataset.kind = 'send';
      notice.textContent = errors[error.code === 'TIMEOUT' ? 'SEND_UNCERTAIN' : error.code] || 'Mesaj gönderilemedi. Yazdıkların korundu; yeniden deneyebilirsin.';
      send.textContent = 'Tekrar dene';
    } finally { sending = false; commandPalette?.update(peerInfo); send.disabled = (peerInfo?.blocked || peerInfo?.canSend===false) || !input.value.trim(); input.disabled = false; input.focus(); }
  }
  $('.composer').addEventListener('submit', event => { event.preventDefault(); return sendText(input.value.trim()); });
  input.addEventListener('keydown', event => {
    if (commandPalette?.handleKeyDown(event)) return;
    if (enterSends && event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('.composer').requestSubmit(); }
  });
  $('.close').addEventListener('click', closeChat);
  $('.minimize').addEventListener('click', () => window.icqram.request('window.minimize').catch(() => {}));
  window.addEventListener('icqram-chat-changed', schedule);
  window.addEventListener('focus', schedule);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  document.addEventListener('icqram-session', event => { if (event.detail?.auth === 'ready') { restoreDraft().then(()=>load()).then(()=>{if(peerInfo?.forum&&!topicsLoaded)return loadTopics();}).then(openNotificationTopic); input.focus(); } });
  // Reconcile after missed events or a network reconnect without polling hidden windows.
  setInterval(() => { if (!document.hidden && initialized) load(); }, 30000);
})();


/* The native host binds this viewer to one validated message. */
(() => {
  'use strict';
  if (!window.icqram.native || window.icqramView?.kind !== 'viewer') return;
  const panel = document.querySelector('#media-viewer-template').content.firstElementChild.cloneNode(true);
  document.querySelector('#chat-windows').append(panel);
  const $ = s => panel.querySelector(s);
  const image = $('.viewer-image'), video = $('.viewer-video'), audio = $('.viewer-audio');
  const status = $('.viewer-status'), progress = $('.viewer-progress'), save = $('.viewer-save'), retry = $('.viewer-retry');
  const controls = $('.viewer-controls'), play = $('.viewer-play'), seek = $('.viewer-seek'), time = $('.viewer-time');
  const mute = $('.viewer-mute'), volume = $('.viewer-volume'), audioLabel = $('.viewer-audio-label');
  let loading = false, ready = false, stopped = false, timer = 0, started = false, deadline = 0, generation = 0, player = null;
  const clear = () => { clearTimeout(timer); progress.hidden = true; };
  const format = n => Number.isFinite(n) && n >= 0 ? `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}` : '0:00';
  const update = () => {
    if (!player) return;
    const duration = Number.isFinite(player.duration) ? player.duration : 0;
    time.textContent = `${format(player.currentTime)} / ${format(duration)}`;
    seek.disabled = duration <= 0; seek.max = Math.max(1, duration); seek.value = player.currentTime || 0;
    play.textContent = player.paused ? '▶' : 'Ⅱ';
    play.setAttribute('aria-label', player.paused ? 'Oynat' : 'Duraklat');
  };
  const stop = () => {
    stopped = true; generation++; clear();
    if (player) { player.pause(); player.removeAttribute('src'); player.load(); player.hidden = true; player = null; ready = false; save.disabled = true; }
    image.hidden = true; controls.hidden = true; audioLabel.hidden = true;
  };
  const close = async () => { stop(); await window.icqram.request('viewer.cancel').catch(() => {}); await window.icqram.request('window.close').catch(() => {}); };
  async function load() {
    if (loading || stopped || document.hidden) return;
    if (ready) { if (!player) image.hidden = false; return; }
    if (!deadline) deadline = Date.now() + 300000;
    if (Date.now() > deadline) { clear(); status.textContent = 'Yükleme zaman aşımına uğradı.'; retry.hidden = false; window.icqram.request('viewer.cancel').catch(() => {}); return; }
    const current = generation;
    loading = true; retry.hidden = true;
    try {
      const result = await window.icqram.request('viewer.load');
      if (stopped || current !== generation) return;
      if (result.loading) {
        status.textContent = 'Medya yükleniyor…'; progress.hidden = false;
        progress.max = Math.max(1, result.size || 1); progress.value = Math.max(0, result.bytes || 0); timer = setTimeout(load, 500);
      } else if (typeof result.url === 'string' && result.url.length < 3000000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(result.url)) {
        image.src = result.url; image.hidden = false; ready = true; save.disabled = false; clear(); status.textContent = `Fotoğraf · ${result.width} × ${result.height}`;
      } else if (result.url === 'icqram-ui://domain/media/playback' && ['video', 'audio'].includes(result.kind) && /^(video|audio)\/[a-z0-9.+-]+$/.test(result.mime)) {
        player = result.kind === 'video' ? video : audio;
        ready = true; save.disabled = false; clear();
        status.textContent = result.name || (result.kind === 'video' ? 'Video' : 'Sesli mesaj');
        if (!player.canPlayType(result.mime)) { status.textContent = 'Bu biçim oynatılamıyor. İndirerek açabilirsin.'; return; }
        controls.hidden = false; player.hidden = result.kind !== 'video'; audioLabel.hidden = result.kind !== 'audio';
        play.disabled = true; player.src = result.url; player.load();
      } else throw new Error('INVALID_MEDIA');
    } catch (error) {
      clear(); status.textContent = error.code === 'LOCKED' ? 'Görüntülemek için uygulamanın kilidini aç.' : error.code === 'DISK_FULL' ? 'Medya için yeterli boş alan yok.' : 'Medya yüklenemedi.'; retry.hidden = false;
    } finally { loading = false; if (current !== generation && !stopped) timer = setTimeout(load, 0); }
  }
  for (const media of [video, audio]) {
    media.addEventListener('loadedmetadata', () => { if (media === player) update(); });
    media.addEventListener('canplay', () => { if (media === player) { play.disabled = false; update(); } });
    for (const event of ['timeupdate', 'play', 'pause', 'ended', 'durationchange']) media.addEventListener(event, update);
    media.addEventListener('error', () => { if (media === player && !stopped) { play.disabled = true; status.textContent = 'Bu medya oynatılamıyor. İndirerek açabilirsin.'; } });
  }
  play.addEventListener('click', async () => {
    if (!player || play.disabled || stopped) return;
    try { if (player.paused) await player.play(); else player.pause(); update(); }
    catch { status.textContent = 'Oynatma başlatılamadı. Yeniden deneyebilirsin.'; }
  });
  seek.addEventListener('input', () => { if (player && !seek.disabled) { player.currentTime = Math.max(0, Math.min(player.duration, Number(seek.value) || 0)); update(); } });
  volume.addEventListener('input', () => { if (player) { player.volume = Math.max(0, Math.min(1, Number(volume.value) || 0)); player.muted = false; mute.textContent = '♪'; } });
  mute.addEventListener('click', () => { if (player) { player.muted = !player.muted; mute.textContent = player.muted ? '×♪' : '♪'; mute.setAttribute('aria-label', player.muted ? 'Sesi aç' : 'Sesi kapat'); } });
  save.addEventListener('click', async () => {
    if (!ready || save.disabled) return;
    save.disabled = true;
    try { const result = await window.icqram.request('viewer.save'); if (result.saved) status.textContent = 'Medya kaydedildi.'; }
    catch { status.textContent = 'Kaydedilemedi. Yeniden deneyebilirsin.'; }
    finally { save.disabled = !ready; }
  });
  for (const selector of ['.viewer-close', '.viewer-dismiss']) $(selector).addEventListener('click', close);
  $('.viewer-minimize').addEventListener('click', () => { player?.pause(); window.icqram.request('window.minimize').catch(() => {}); });
  retry.addEventListener('click', async () => { await window.icqram.request('viewer.cancel').catch(() => {}); stopped = false; deadline = 0; load(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) player?.pause(); else if (started && !stopped) load(); });
  window.addEventListener('icqram-viewer-stop', stop);
  window.addEventListener('icqram-viewer-focus', () => { stopped = false; deadline = 0; if (started) load(); });
  document.addEventListener('icqram-session', event => { if (event.detail?.auth === 'ready') { started = true; stopped = false; load(); } });
})();

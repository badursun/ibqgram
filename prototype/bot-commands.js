(() => {
  'use strict';
  const slashQuery = text => /^\/[A-Za-z0-9_]{0,32}$/.test(text);
  function normalize(values) {
    const seen = new Set();
    return (Array.isArray(values) ? values : []).slice(0, 100).filter(item => {
      if (!item || typeof item.command !== 'string' || !/^[A-Za-z0-9_]{1,32}$/.test(item.command) || seen.has(item.command)) return false;
      seen.add(item.command); return true;
    }).map(item => ({ command: item.command, description: typeof item.description === 'string' ? item.description.slice(0, 256) : '' }));
  }
  function mount(panel, { input, canSend }) {
    const toggle = panel.querySelector('.bot-commands-toggle');
    let peer = null, opening = false;
    async function open(query = '') {
      if (opening || toggle.disabled || toggle.hidden) return;
      opening = true;
      try { await window.icqram.request('window.openCommands', { query }); }
      finally { opening = false; }
    }
    toggle.addEventListener('click', () => open().catch(() => {}));
    return {
      update(value) { peer = value; toggle.hidden = peer?.bot !== true; toggle.disabled = !canSend() || !!peer?.blocked || peer?.canSend === false; },
      onInput() { if (slashQuery(input.value)) open(input.value.slice(1)).catch(() => {}); },
      handleKeyDown() { return false; },
      close() {}
    };
  }
  window.ICQBotCommands = Object.freeze({ mount, normalize });
  if (window.icqramView?.kind !== 'commands') return;
  const panel = document.querySelector('#bot-commands-dialog');
  document.documentElement.dataset.auxiliary = 'true';
  panel.classList.add('active-window', 'auxiliary-panel'); panel.show();
  const $ = selector => panel.querySelector(selector);
  const list = $('.bot-command-list'), filter = $('.bot-command-filter');
  const empty = $('.bot-command-empty'), reload = $('.bot-command-refresh'), send = $('.bot-command-send');
  let peer = null, commands = [], visible = [], selected = 0, busy = false, loading = false, signature = '', failed = false, deadline = Date.now() + 12000;
  const allowed = () => peer?.bot === true && !peer.blocked && peer.canSend !== false && !busy;
  const close = () => window.icqram.request('window.close').catch(() => {});
  function highlight(scroll = false) {
    [...list.children].forEach((row, index) => row.setAttribute('aria-selected', String(index === selected)));
    const row = list.children[selected];
    if (row) filter.setAttribute('aria-activedescendant', row.id);
    else filter.removeAttribute('aria-activedescendant');
    if (scroll) row?.scrollIntoView?.({ block: 'nearest' });
    send.disabled = !allowed() || !row;
  }
  function render() {
    const query = filter.value.trim().replace(/^\//, '').toLowerCase();
    visible = commands.filter(item => item.command.toLowerCase().includes(query) || item.description.toLowerCase().includes(query));
    selected = Math.max(0, Math.min(selected, visible.length - 1)); list.replaceChildren();
    visible.forEach((item, index) => {
      const row = document.createElement('button'); row.type = 'button'; row.className = 'bot-command-option'; row.id = 'bot-command-' + index;
      row.setAttribute('role', 'option'); row.tabIndex = -1; row.disabled = !allowed(); row.title = '/' + item.command + ' — ' + item.description;
      const command = document.createElement('span'); command.className = 'bot-command-name'; command.textContent = '/' + item.command;
      const description = document.createElement('span'); description.className = 'bot-command-description'; description.textContent = item.description;
      row.append(command, description); row.addEventListener('click', () => choose(index)); list.append(row);
    });
    empty.hidden = visible.length > 0 && !failed;
    empty.textContent = failed ? 'Could not load commands. Try Refresh.' : !peer?.commandsReady
      ? (Date.now() < deadline ? 'Loading commands…' : 'Commands are unavailable. Try Refresh.')
      : commands.length ? 'No matching commands.' : 'This bot has not published any commands.';
    highlight();
  }
  async function load(refresh = false) {
    if (loading || busy || document.hidden) return;
    loading = true; reload.disabled = true;
    try {
      const result = await window.icqram.request(refresh ? 'commands.refresh' : 'commands.load');
      const next = JSON.stringify(result);
      peer = result; failed = false;
      if (next !== signature || refresh) { signature = next; commands = normalize(peer.commands); render(); }
      else if (!peer.commandsReady) render();
    } catch { failed = true; render(); }
    finally { loading = false; reload.disabled = false; }
  }
  async function choose(index) {
    if (!allowed() || !visible[index]) return;
    const command = visible[index].command;
    busy = true; render();
    try { await window.icqram.request('commands.select', { command }); }
    catch (error) { empty.hidden = false; empty.textContent = error.code === 'TOPIC_CHANGED' ? 'The chat topic changed. Reopen commands from that chat.' : 'Could not select this command. Reopen the chat and try again.'; }
    finally { busy = false; for (const row of list.children) row.disabled = !allowed(); highlight(); }
  }
  filter.addEventListener('input', () => { selected = 0; render(); });
  panel.addEventListener('keydown', event => {
    if (event.isComposing) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    else if (event.key === 'Enter' && event.target === filter) { event.preventDefault(); choose(selected); }
    else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); selected = visible.length ? (selected + (event.key === 'ArrowDown' ? 1 : -1) + visible.length) % visible.length : 0; highlight(true);
    }
  });
  for (const name of ['.bot-command-close', '.bot-command-cancel']) $(name).addEventListener('click', close);
  send.addEventListener('click', () => choose(selected));
  reload.addEventListener('click', () => { deadline = Date.now() + 12000; return load(true); });
  const open = data => {
    $('.bot-command-title').textContent = String(data?.name || 'Bot') + ' — Commands';
    filter.value = String(data?.query || '').slice(0, 64); selected = 0; deadline = Date.now() + 12000;
    render(); load(); filter.focus();
  };
  window.addEventListener('icqram-commands-open', event => open(event.detail));
  document.addEventListener('icqram-session', event => { if (event.detail?.auth === 'ready') load(); });
  setInterval(() => load(), 1500);
  open(window.icqramView.panelData);
})();

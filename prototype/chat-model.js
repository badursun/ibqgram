(() => {
  'use strict';
  function valid(message) {
    return message && Number.isSafeInteger(message.id) && message.id > 0 && Number.isSafeInteger(message.date) && message.date > 0 && typeof message.out === 'boolean' && typeof message.text === 'string';
  }
  function merge(existing, page, latest = false) {
    const incoming = page.filter(valid);
    if (latest && !incoming.length) return [];
    const ids = incoming.map(m => m.id);
    const low = Math.min(...ids), high = Math.max(...ids);
    const map = new Map(existing.filter(m => m.id < low || (!latest && m.id > high)).map(m => [m.id, m]));
    for (const message of incoming) map.set(message.id, message);
    return [...map.values()].sort((a, b) => a.id - b.id);
  }
  function commandParts(text, entities = []) {
    const parts = []; let cursor = 0;
    for (const entity of (Array.isArray(entities) ? [...entities] : []).sort((a,b) => a.offset-b.offset)) {
      const {offset, length} = entity;
      if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < cursor || length < 2 || offset + length > text.length) continue;
      const command = text.slice(offset, offset + length);
      if (!/^\/[A-Za-z0-9_]{1,32}(?:@[A-Za-z0-9_]{5,32})?$/.test(command)) continue;
      if (offset > cursor) parts.push({text:text.slice(cursor, offset)});
      parts.push({text:command, command:true}); cursor = offset + length;
    }
    if (cursor < text.length) parts.push({text:text.slice(cursor)});
    return parts;
  }
  window.ICQChatModel = Object.freeze({ merge, valid, commandParts, countCharacters: text => Array.from(String(text)).length });
})();

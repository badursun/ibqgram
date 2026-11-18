(() => {
  const states = Object.freeze([
    { code: 'AV', label: 'Available / Connect', short: 'Online', color: '#19ed14', glyph: '' },
    { code: 'FC', label: 'Free for Chat', short: 'Free for Chat', color: '#19ed14', glyph: '☺' },
    { code: 'AW', label: 'Away', short: 'Away', color: '#19ed14', glyph: '▱' },
    { code: 'NA', label: 'N/A (Extended Away)', short: 'N/A', color: '#19ed14', glyph: 'NA' },
    { code: 'OC', label: 'Occupied (Urgent Msgs)', short: 'Occupied', color: '#19ed14', glyph: '!' },
    { code: 'DND', label: 'DND (Do Not Disturb)', short: 'DND', color: '#ed2828', glyph: '−' },
    { code: 'IV', label: 'Privacy (Invisible)', short: 'Invisible', color: '#a1a1a1', glyph: '◌' },
    { code: 'OF', label: 'Offline / Disconnect', short: 'Offline', color: '#ed2828', glyph: '' },
    { code: 'PH', label: 'On the Phone', short: 'On the Phone', color: '#19ed14', glyph: '☎' },
    { code: 'LC', label: 'Out to Lunch', short: 'Out to Lunch', color: '#19ed14', glyph: '☕' }
  ]);
  const suffix = /(?:^|\s)\[ST:(AV|FC|AW|NA|OC|DND|IV|OF|PH|LC)\]$/;
  function parse(name) {
    const text = typeof name === 'string' ? name.trim() : '';
    const match = suffix.exec(text);
    return { name: match ? text.slice(0, match.index).trimEnd() : text, code: match?.[1] || null };
  }
  function lastNameWithStatus(lastName, code) {
    if (code && !states.some(state => state.code === code)) throw new Error('PRESENCE_INVALID');
    const base = parse(lastName).name;
    return [base, code ? `[ST:${code}]` : ''].filter(Boolean).join(' ');
  }
  function describe(raw) {
    const neutral=raw.bot||raw.group||raw.channel||['bot','group','channel'].includes(raw.kind);
    const parsed=neutral?{name:raw.name,code:null}:parse(raw.name);
    const online=raw.online===true||raw.state==='online';
    const code=neutral?'IV':parsed.code||(online?'AV':'OF');
    const label=states.find(s=>s.code===code)?.short||'Offline';
    const connection=online?'Online':'Offline';
    return {name:parsed.name,code,custom:!!parsed.code,online,neutral,label,
      text:neutral?(raw.bot||raw.kind==='bot'?'Bot':raw.channel||raw.kind==='channel'?'Channel':'Group'):
        parsed.code&&label!==connection?`${label} · ${connection}`:connection};
  }
  function contact(raw) {
    if (!raw || typeof raw.id !== 'string' || !/^(?:(?:chat|channel):)?[1-9][0-9]{0,15}$/.test(raw.id) || typeof raw.name !== 'string' || !['online', 'offline'].includes(raw.state)) return null;
    const kind = raw.kind || (raw.bot ? 'bot' : 'user');
    if (!['user','bot','group','channel'].includes(kind)) return null;
    if (['user','bot'].includes(kind) !== !raw.id.includes(':')) return null;
    const parsed = kind === 'user' ? parse(raw.name) : {name:raw.name,code:null};
    const status=describe({...raw,kind});
    return { ...raw, kind, bot:kind==='bot', name:parsed.name || 'Telegram', state:kind==='user'?raw.state:'offline', statusText:status.text, customPresence:status.custom, presence:kind==='user' ? parsed.code || (raw.state==='online'?'AV':'OF') : 'IV' };
  }
  function sections(contacts) {
    const unique = [...new Map(contacts.map(c=>[c.id,c])).values()].sort((a,b)=>a.name.localeCompare(b.name,'tr'));
    const people = unique.filter(c=>(c.kind || (c.bot?'bot':'user'))==='user');
    return [
      {key:'general',label:'General',children:[
        {key:'online',label:'Online',contacts:people.filter(c=>c.state!=='offline')},
        {key:'offline',label:'Offline',contacts:people.filter(c=>c.state==='offline')}
      ]},
      {key:'bots',label:'Bots',contacts:unique.filter(c=>c.kind==='bot'||c.bot)},
      {key:'groups',label:'Groups',contacts:unique.filter(c=>c.kind==='group')},
      {key:'channels',label:'Channels',contacts:unique.filter(c=>c.kind==='channel')}
    ];
  }
  function filtered(contacts, filter='all', query='') {
    const search=String(query).trim().toLocaleLowerCase('tr');
    return contacts.filter(c=>{
      const kind=c.kind || (c.bot?'bot':'user');
      const match=filter==='all'||filter==='user'&&['user','bot'].includes(kind)||filter==='group'&&kind==='group'||filter==='channel'&&kind==='channel';
      return match && `${c.name} ${c.username||''} ${c.id}`.toLocaleLowerCase('tr').includes(search);
    });
  }
  function icon(code, online) {
    const selected = states.some(s=>s.code===code) ? code : online === false ? 'OF' : 'AV';
    const span = document.createElement('span'); span.className = 'presence-icon original-presence'; span.setAttribute('aria-hidden', 'true');
    const image=document.createElement('img');
    image.src=`assets/brand/presence/${selected}.svg`;image.alt='';image.draggable=false;
    image.setAttribute('style','display:block;width:16px;height:16px;object-fit:contain');
    span.append(image);
    if(typeof online==='boolean'){
      const dot=document.createElement('span');dot.className='presence-connection '+(online?'online':'offline');
      span.title=`${states.find(s=>s.code===selected).short} · Telegram: ${online?'Online':'Offline'}`;span.append(dot);
    }
    return span;
  }
  window.ICQPresence = Object.freeze({ states, parse, lastNameWithStatus, contact, sections, filtered, describe, icon });
})();

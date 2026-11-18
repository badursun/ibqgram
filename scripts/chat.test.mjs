import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const sources = await Promise.all(['chat-model.js', 'presence.js', 'bot-commands.js', 'chat.js'].map(n => readFile(new URL('../prototype/' + n, import.meta.url), 'utf8')));
const flush = () => new Promise(resolve => setImmediate(resolve));
const msg = (id, text = String(id)) => ({ id, date: 1700000000 + id, out: false, text });
test('history merges pages in server order, deduplicates, updates edits and removes deletions', () => {
 const window = {}; vm.runInNewContext(sources[0], { window });
 const merge = (a,b,latest) => JSON.parse(JSON.stringify(window.ICQChatModel.merge(a,b,latest)));
 assert.deepEqual(merge([msg(3),msg(4)], [msg(3),msg(1),msg(2)]), [msg(1),msg(2),msg(3),msg(4)]);
 assert.deepEqual(merge([msg(1),msg(2),msg(3),msg(4)], [msg(3,'edited'),msg(1)],true), [msg(1),msg(3,'edited')]);
 assert.deepEqual(merge([msg(1)],[],true),[]);
 assert.deepEqual(merge([], [{...msg(1),id:1.1}, {...msg(2),out:'false'}]),[]);
});
function app(responses = {}) {
 const nodes = new Map(), listeners = {}, windowListeners = {}, calls = [], pending = [], intervals = [];
 let history = [msg(1,'<script>untrusted</script>')], focused=false;
 const node = () => ({ children: [], dataset:{}, style:{}, events:{}, value:'', scrollHeight:400,scrollTop:0,clientHeight:260,classList:{add(){},toggle(){}},
 addEventListener(t,f){this.events[t]=f;},setAttribute(k,v){this.attributes??={};this.attributes[k]=v;},removeAttribute(k){if(this.attributes)delete this.attributes[k];},contains(target){return target===this||this.children.includes(target);},append(...n){this.children.push(...n);},prepend(...n){this.children.unshift(...n);},replaceChildren(...n){this.children=n;},before(...n){this.beforeNodes=n;},after(...n){this.afterNodes=n;},focus(){},querySelector:element });
 function element(s) { if (!nodes.has(s)) nodes.set(s,node()); return nodes.get(s); }
 const panel=node(); element('#classic-chat-template').content={firstElementChild:{cloneNode:()=>panel}};
 element('.chat-footer').firstElementChild=node();
 const document={hidden:false,hasFocus:()=>focused,querySelector:element,createElement:node,addEventListener(t,f){listeners[t]=f;}};
 const window={icqramView:{kind:'chat',contactId:'9007199254740993'},ICQPresence:{parse:name=>({name})},ICQAudio:{play(){}},addEventListener(t,f){windowListeners[t]=f;},icqram:{native:true,request(method,params){
 calls.push({method,params}); if(responses[method]) return responses[method](params); if(method==='chat.send')return new Promise((resolve,reject)=>pending.push({resolve,reject}));
 return Promise.resolve({messages:history,peer:{id:'9007199254740993',name:'Ada'},oldest:1,hasMore:false});
 }}};
 const context={window,document,crypto:{randomUUID},setTimeout:()=>1,clearTimeout(){},setInterval(fn,ms){intervals.push({fn,ms});}};
 sources.forEach(source=>vm.runInNewContext(source,context));
 return {element,calls,pending,document,command:detail=>windowListeners['icqram-command-selected']({detail}),notify:topicId=>windowListeners['icqram-open-notification']({detail:{topicId}}),setFocused(value){focused=value;},async poll(){intervals.find(i=>i.ms===750).fn();await flush();},setHistory(items){history=items;},async ready(){listeners['icqram-session']({detail:{auth:'ready'}});await flush();},submit(){return element('.composer').events.submit({preventDefault(){}});}};
}
test('send waits for acknowledgement, prevents double submit and clears text only after success',async()=>{
 const a=app(); await a.ready(); a.element('textarea').value='hello'; const send=a.submit();
 assert.equal(a.element('textarea').value,'hello'); assert.equal(a.element('.send').disabled,true);
 await a.submit(); assert.equal(a.pending.length,1);
 a.pending[0].resolve({sent:true}); await send;
 assert.equal(a.element('textarea').value,''); assert.equal(a.element('.send').disabled,true);
 assert.equal(a.calls.filter(c=>c.method==='chat.send').length,1);
});
test('uncertain send preserves draft and reuses nonce on explicit retry; no automatic send',async()=>{
 const a=app(); await a.ready(); a.element('textarea').value='hello'; const first=a.submit();
 a.pending[0].reject({code:'SEND_UNCERTAIN'}); await first;
 assert.equal(a.element('textarea').value,'hello'); assert.equal(a.pending.length,1);
 const again=a.submit(); a.pending[1].resolve({sent:true}); await again;
 const sends=a.calls.filter(c=>c.method==='chat.send'); assert.equal(sends[0].params.nonce,sends[1].params.nonce);
});
test('history text is rendered as text, and the peer ID remains an exact string',async()=>{
 const a=app(); await a.ready(); const item=a.element('.history').children.find(n=>n.dataset.messageId==='1');
 assert.equal(item.children[1].textContent,'<script>untrusted</script>');
 assert.match(a.element('.person-status').textContent,/9007199254740993/);
});
test('message and history modes toggle without sending',async()=>{
 const a=app(); await a.ready(); const compose=a.element('.compose-mode-button'); const history=a.element('.history-mode-button');
 compose.events.click(); assert.equal(a.element('.history').hidden,true);
 history.events.click(); assert.equal(a.element('.history').hidden,false);
 assert.equal(a.calls.filter(c=>c.method==='chat.send').length,0);
});
test('existing and incoming messages are visible while retaining the composer and draft',async()=>{
 const a=app();await a.ready();assert.equal(a.element('.history').hidden,false);assert.equal(a.element('.composer').hidden,false);
 a.element('.compose-mode-button').events.click();a.element('textarea').value='unfinished draft';
 a.setHistory([msg(1),msg(2,'incoming reply')]);await a.element('.refresh-chat').events.click();
 assert.equal(a.element('.history').hidden,false);assert.equal(a.element('.composer').hidden,false);assert.equal(a.element('textarea').value,'unfinished draft');
 assert.equal(a.element('.history').children.find(n=>n.dataset.messageId==='2').children[1].textContent,'incoming reply');
 assert.equal(a.calls.some(c=>c.method==='chat.send'),false);
});
test('acknowledged send shows the conversation instead of a sent banner',async()=>{
 const a=app();await a.ready();a.element('.compose-mode-button').events.click();a.element('textarea').value='hello';
 const sending=a.submit();a.setHistory([msg(1),{...msg(2,'hello'),out:true}]);a.pending[0].resolve({sent:true});await sending;
 assert.equal(a.element('.history').hidden,false);assert.equal(a.element('.composer').hidden,false);assert.equal(a.element('.chat-notice').hidden,true);
 assert.equal(a.element('.history').children.find(n=>n.dataset.messageId==='2').children[1].textContent,'hello');
});

test('Chars counts typing, pasted emoji/newlines, deletion and resets after acknowledged send',async()=>{
 const a=app();await a.ready();const input=a.element('textarea');
 input.value='Merhaba';input.events.input();assert.equal(a.element('.chat-chars').textContent,'7');
 input.value='A😀\nB';input.events.input();assert.equal(a.element('.chat-chars').textContent,'4');
 input.value='';input.events.input();assert.equal(a.element('.chat-chars').textContent,'0');assert.equal(a.element('.send').disabled,true);
 input.value='abc';input.events.input();assert.equal(a.element('.send').disabled,false);
 const send=a.submit();a.pending[0].resolve({sent:true});await send;assert.equal(a.element('.chat-chars').textContent,'0');
});

test('bot commands use Telegram UTF-16 ranges and reject malformed command ranges',()=>{
 const window={};vm.runInNewContext(sources[0],{window});const parts=window.ICQChatModel.commandParts;
 const text='😀 /help and /start@BotFather <img>';
 const parsed=parts(text,[{offset:3,length:5},{offset:13,length:16},{offset:0,length:2},{offset:999,length:4}]);
 assert.equal(parsed.map(p=>p.text).join(''),text);
 assert.deepEqual(Array.from(parsed.filter(p=>p.command),p=>p.text),['/help','/start@BotFather']);
 assert.equal(parts('/help',{}).some(p=>p.command),false);
 assert.equal(parts('/help',[{offset:0,length:5},{offset:1,length:4}]).filter(p=>p.command).length,1);
});
test('clicking a command sends once and preserves an existing draft',async()=>{
 const a=app();a.setHistory([{...msg(1,'/help'),commands:[{offset:0,length:5}]}]);await a.ready();
 a.element('textarea').value='my unfinished draft';
 const command=a.element('.history').children.find(n=>n.dataset.messageId==='1').children[1].children[0];
 const sent=command.events.click();await command.events.click();
 assert.equal(a.calls.filter(c=>c.method==='chat.send').length,1);assert.equal(a.calls.find(c=>c.method==='chat.send').params.text,'/help');
 a.pending[0].resolve({sent:true});await sent;
 assert.equal(a.element('textarea').value,'my unfinished draft');
});


test('file selection never uploads automatically and completed transfers leave only the history item',async()=>{
 let state={id:'9007199254740993',name:'Ada',transfers:[]};
 const a=app({
  'chat.state':()=>Promise.resolve(state),
  'chat.file.choose':()=>{state.transfers=[{direction:'upload',token:'selected-file',name:'report.txt',size:100,bytes:0,state:'ready'}];return Promise.resolve({token:'selected-file'});},
  'chat.file.send':()=>{state.transfers[0].state='uploading';return Promise.resolve({started:true});}
 });
 await a.ready();await a.element('.attach-file').events.click();
 assert.equal(a.calls.some(c=>c.method==='chat.file.send'),false);
 let row=a.element('.chat-transfers').children[0];
 await row.children.find(n=>n.textContent==='Gönder').events.click();
 assert.equal(a.calls.find(c=>c.method==='chat.file.send').params.token,'selected-file');
 state.transfers[0].bytes=100;state.transfers[0].state='sending';await a.poll();
 row=a.element('.chat-transfers').children[0];assert.match(row.children[1].textContent,/onayı bekleniyor/);
 assert.equal(a.element('.chat-transfers').hidden,false);
 state.transfers[0].state='done';await a.poll();
 assert.equal(a.element('.chat-transfers').hidden,true);
});
test('download cancellation and retry remain visible without automatic file opening',async()=>{
 const transfer={direction:'download',messageId:1,name:'report.txt',size:100,bytes:15,state:'downloading'};
 const a=app({
  'chat.state':()=>Promise.resolve({transfers:[transfer]}),
  'chat.file.download':()=>{transfer.state='downloading';return Promise.resolve({started:true});},
  'chat.file.cancel':()=>{transfer.state='cancelled';return Promise.resolve({});}
 });
 a.setHistory([{...msg(1,''),file:{name:'report.txt',size:100}}]);await a.ready();
 const file=a.element('.history').children.find(n=>n.dataset.messageId==='1').children[2];
 await file.events.click();let row=a.element('.chat-transfers').children[0];
 await row.children.find(n=>n.textContent==='×').events.click();
 assert.equal(a.calls.find(c=>c.method==='chat.file.cancel').params.messageId,1);
 row=a.element('.chat-transfers').children[0];row.children.find(n=>n.textContent==='×').events.click();
 assert.equal(a.element('.chat-transfers').hidden,true);
 await file.events.click();assert.equal(a.element('.chat-transfers').hidden,false);
 assert.equal(a.calls.some(c=>/open/i.test(c.method)),false);
});
test('live blocked and typing state controls the title, sends and attachment button',async()=>{
 let state={id:'9007199254740993',name:'Ada',online:true,typing:'yazıyor…',blocked:false};
 const a=app({'chat.state':()=>Promise.resolve(state),'chat.block':p=>{state={...state,blocked:p.blocked};return Promise.resolve(state);}});
 await a.ready();a.element('textarea').value='draft';await a.poll();
 assert.match(a.element('.chat-title').textContent,/yazıyor/);assert.equal(a.element('.send').disabled,false);
 await a.element('.menu-block').events.click();assert.equal(a.element('.send').disabled,true);assert.equal(a.element('.attach-file').disabled,true);
 assert.match(a.element('.chat-title').textContent,/Blocked/);
 await a.element('.menu-block').events.click();assert.equal(a.element('.send').disabled,false);
 assert.equal(a.element('textarea').value,'draft');
 assert.equal(a.calls.some(c=>c.method==='chat.send'),false);
});


test('draft restores without sending and each edit is persisted through the native account',async()=>{
 const a=app({'chat.draft.get':()=>Promise.resolve({text:'saved 😀 draft'})});await a.ready();
 assert.equal(a.element('textarea').value,'saved 😀 draft');assert.equal(a.element('.chat-chars').textContent,'13');
 assert.equal(a.calls.some(c=>c.method==='chat.send'),false);
 a.element('textarea').value='updated';a.element('textarea').events.input();await flush();
 assert.equal(a.calls.find(c=>c.method==='chat.draft.set').params.text,'updated');
});
test('a late draft restore cannot replace newly typed text',async()=>{
 let resolve;const a=app({'chat.draft.get':()=>new Promise(done=>{resolve=done;})});await a.ready();
 a.element('textarea').value='new typing';a.element('textarea').events.input();
 resolve({text:'old saved text'});await flush();
 assert.equal(a.element('textarea').value,'new typing');assert.equal(a.calls.find(c=>c.method==='chat.draft.set').params.text,'new typing');
});
test('failed send keeps persisted draft; command sends explicitly preserve it',async()=>{
 const a=app({'chat.draft.get':()=>Promise.resolve({text:'draft'})});a.setHistory([{...msg(1,'/help'),commands:[{offset:0,length:5}]}]);await a.ready();
 const failed=a.submit();a.pending[0].reject({code:'SEND_FAILED'});await failed;
 assert.equal(a.calls.some(c=>c.method==='chat.draft.set'&&c.params.text===''),false);
 const command=a.element('.history').children.find(n=>n.dataset.messageId==='1').children[1].children[0];
 const sent=command.events.click();a.pending[1].resolve({sent:true});await sent;
 assert.equal(a.calls.filter(c=>c.method==='chat.send').at(-1).params.preserveDraft,true);
 assert.equal(a.element('textarea').value,'draft');
});
test('read receipts require focus, visible history and visible incoming message bottom',async()=>{
 const a=app({'chat.read':()=>Promise.resolve({accepted:true})});a.setHistory([msg(1),msg(2),{...msg(3),out:true}]);await a.ready();
 a.element('.history').getBoundingClientRect=()=>({top:100,bottom:300});
 a.element('[data-message-id="1"]').getBoundingClientRect=()=>({top:110,bottom:160});
 a.element('[data-message-id="2"]').getBoundingClientRect=()=>({top:170,bottom:340});
 await a.poll();assert.equal(a.calls.some(c=>c.method==='chat.read'),false);
 a.setFocused(true);a.element('.compose-mode-button').events.click();await a.poll();assert.equal(a.calls.some(c=>c.method==='chat.read'),false);
 a.element('.history-mode-button').events.click();await a.poll();
 assert.equal(a.calls.find(c=>c.method==='chat.read').params.messageId,1);
 await a.poll();assert.equal(a.calls.filter(c=>c.method==='chat.read').length,1);
 a.element('[data-message-id="2"]').getBoundingClientRect=()=>({top:170,bottom:290});await a.poll();
 assert.equal(a.calls.filter(c=>c.method==='chat.read').at(-1).params.messageId,2);
 a.document.hidden=true;await a.poll();assert.equal(a.calls.filter(c=>c.method==='chat.read').length,2);
});
test('photo click opens a separate viewer without downloading or changing the draft',async()=>{
 const a=app();a.setHistory([{...msg(1,''),photo:true}]);await a.ready();a.element('textarea').value='draft';
 assert.equal(a.calls.some(c=>c.method==='window.openMedia'),false);
 const photo=a.element('.history').children.find(n=>n.dataset.messageId==='1').children[2];await photo.events.click();
 assert.equal(a.calls.find(c=>c.method==='window.openMedia').params.messageId,1);
 assert.equal(a.calls.some(c=>['chat.photo.get','chat.photo.save','chat.send'].includes(c.method)),false);
 assert.equal(a.element('textarea').value,'draft');
});

test('outgoing receipt starts as sent and follows only the server read boundary',async()=>{
 let read=0;
 const a=app({'chat.state':()=>Promise.resolve({id:'9007199254740993',name:'Ada',readOutboxMaxId:read})});
 a.setHistory([{...msg(8,'hello'),out:true}]);await a.ready();
 const receipt=a.element('.history').children.find(n=>n.dataset.messageId==='8').children[0].children[2];
 assert.equal(receipt.textContent,'✓ Gönderildi');
 a.element('.history').querySelectorAll=()=>[receipt];await a.poll();assert.equal(receipt.textContent,'✓ Gönderildi');
 read=8;await a.poll();assert.equal(receipt.textContent,'✓✓ Okundu');
});

test('playable video opens viewer without downloading, sending, or changing the draft',async()=>{
 const a=app();a.setHistory([{...msg(1,''),file:{name:'clip.mp4',size:1024,kind:'video',playable:true}}]);await a.ready();
 a.element('textarea').value='keep this';
 const row=a.element('.history').children.find(n=>n.dataset.messageId==='1');
 await row.children.find(n=>n.className==='message-file').events.click();
 assert.equal(a.calls.filter(c=>c.method==='window.openMedia').length,1);
 assert.equal(a.calls.some(c=>c.method==='chat.file.download'||c.method==='chat.send'),false);
 assert.equal(a.element('textarea').value,'keep this');
});

test('read-only channel shows sender and denies sending, attachment and blocking actions',async()=>{
 const peer={id:'9007199254740993',name:'Announcements',channel:true,canSend:false,canSendFiles:false};
 const a=app({'chat.history':()=>Promise.resolve({messages:[{...msg(1,'Post'),sender:'Channel author'}],peer,oldest:1,hasMore:false})});await a.ready();
 assert.equal(a.element('textarea').readOnly,true);assert.equal(a.element('.attach-file').disabled,true);assert.equal(a.element('.menu-block').disabled,true);
 a.element('textarea').value='must not send';await a.submit();await a.element('.attach-file').events.click();await a.element('.menu-block').events.click();
 assert.equal(a.calls.some(c=>['chat.send','chat.file.choose','chat.block'].includes(c.method)),false);
 const row=a.element('.history').children.find(n=>n.dataset.messageId==='1');assert.equal(row.children[0].children[0].textContent,'Channel author');
});
test('group title preserves status-like text and group sends do not claim individual read receipts',async()=>{
 const peer={id:'9007199254740993',name:'Team [ST:AW]',group:true,canSend:true,canSendFiles:false};
 const a=app({'chat.history':()=>Promise.resolve({messages:[{...msg(1,'hi'),out:true,sender:'Self'}],peer,oldest:1,hasMore:false})});await a.ready();
 assert.match(a.element('.chat-title').textContent,/Team \[ST:AW\].*Group/);
 const row=a.element('.history').children.find(n=>n.dataset.messageId==='1');assert.equal(row.children[0].children.some(n=>n.className==='receipt'),false);
 assert.equal(a.element('textarea').readOnly,false);assert.equal(a.element('.attach-file').disabled,true);
});

function forumApp() {
 let selected=0; const drafts=new Map(), topics=[{id:1,title:'General',color:0xedd267},{id:42,title:'Operations',color:0x6fb9f0},{id:99,title:'Closed',closed:true,color:0xdaa8ef}];
 const peer=()=>({id:'9007199254740993',name:'Team',forum:true,group:true,topicId:selected,topicTitle:topics.find(t=>t.id===selected)?.title,topics,canSend:selected>0&&selected!==99,canSendFiles:selected>0&&selected!==99});
 const a=app({
  'chat.topics':()=>Promise.resolve({peer:peer(),hasMore:false}),
  'chat.topic.select':({topicId})=>{selected=topicId;return Promise.resolve(peer());},
  'chat.history':({topicId})=>Promise.resolve({messages:topicId?[msg(topicId,'Topic '+topicId)]:[],peer:peer(),oldest:topicId,hasMore:false}),
  'chat.state':()=>Promise.resolve(peer()),
  'chat.draft.get':({topicId})=>Promise.resolve({text:drafts.get(topicId)||''}),
  'chat.draft.set':({topicId,text})=>{drafts.set(topicId,text);return Promise.resolve({saved:true});}
 });
 return {...a,drafts,select:async id=>{const index=topics.findIndex(t=>t.id===id);await a.element('.topic-buttons').children[index].events.click();}};
}
test('forum buttons select isolated history and restore each topic draft without sending',async()=>{
 const a=forumApp();await a.ready();
 assert.equal(a.element('.topic-panel').hidden,false);assert.equal(a.element('textarea').readOnly,true);
 assert.equal(a.element('.topic-buttons').children[1].title,'Operations');
 await a.select(42);assert.equal(a.element('.topic-current').textContent,'Operations');assert.equal(a.element('textarea').readOnly,false);
 a.element('textarea').value='ops draft';a.element('textarea').events.input();await flush();
 await a.select(1);assert.equal(a.element('textarea').value,'');
 assert.equal(a.element('.history').children.some(n=>n.dataset.messageId==='42'),false);
 a.element('textarea').value='general draft';a.element('textarea').events.input();await flush();
 await a.select(42);assert.equal(a.element('textarea').value,'ops draft');
 assert.equal(a.drafts.get(1),'general draft');assert.equal(a.calls.some(c=>c.method==='chat.send'),false);
});
test('selected topic accompanies text, command, typing and file actions; closed topic stays read-only',async()=>{
 const a=forumApp();await a.ready();await a.select(42);
 a.element('textarea').value='hello topic';a.element('textarea').events.input();await flush();
 const sending=a.submit();await flush();assert.equal(a.calls.find(c=>c.method==='chat.send').params.topicId,42);
 a.pending[0].resolve({sent:true});await sending;
 await a.element('.attach-file').events.click();assert.equal(a.calls.find(c=>c.method==='chat.file.choose').params.topicId,42);
 assert.equal(a.calls.find(c=>c.method==='chat.typing'&&c.params.active).params.topicId,42);
 await a.select(99);assert.equal(a.element('textarea').readOnly,true);assert.equal(a.element('.attach-file').disabled,true);
 a.element('textarea').value='blocked';await a.submit();assert.equal(a.calls.filter(c=>c.method==='chat.send').length,1);
});
test('topic changes are blocked while a text acknowledgement is pending',async()=>{
 const a=forumApp();await a.ready();await a.select(42);a.element('textarea').value='hello';
 const sending=a.submit();await a.select(1);
 assert.equal(a.calls.filter(c=>c.method==='chat.topic.select').length,1);
 a.pending[0].reject({code:'SEND_FAILED'});await sending;assert.equal(a.element('textarea').value,'hello');
});
test('late history from the previous topic cannot overwrite the selected thread',async()=>{
 let selected=0,pendingHistory,hold=false;
 const peer=()=>({id:'9007199254740993',name:'Team',forum:true,group:true,topicId:selected,topics:[{id:1,title:'General'},{id:42,title:'Ops'}],canSend:selected>0});
 const a=app({
  'chat.topics':()=>Promise.resolve({peer:peer(),hasMore:false}),
  'chat.topic.select':({topicId})=>{selected=topicId;return Promise.resolve(peer());},
  'chat.history':({topicId})=>{const result={messages:topicId?[msg(topicId)]:[],peer:peer(),oldest:topicId,hasMore:false};return hold?new Promise(resolve=>{pendingHistory=()=>resolve(result);hold=false;}):Promise.resolve(result);}
 });
 await a.ready();await a.element('.topic-buttons').children[0].events.click();
 hold=true;const old=a.element('.refresh-chat').events.click();await flush();
 await a.element('.topic-buttons').children[1].events.click();pendingHistory();await old;
 assert.equal(a.element('.history').children.some(n=>n.dataset.messageId==='1'),false);
 assert.equal(a.element('.history').children.some(n=>n.dataset.messageId==='42'),true);
});
test('uncertain sends keep their retry identity when leaving and returning to a topic',async()=>{
 const a=forumApp();await a.ready();await a.select(42);a.element('textarea').value='possibly delivered';
 const first=a.submit();a.pending[0].reject({code:'SEND_UNCERTAIN'});await first;
 await a.select(1);await a.select(42);assert.equal(a.element('textarea').value,'possibly delivered');
 const again=a.submit();a.pending[1].resolve({sent:true});await again;
 const sends=a.calls.filter(c=>c.method==='chat.send');assert.equal(sends[0].params.nonce,sends[1].params.nonce);assert.equal(sends[1].params.topicId,42);
});

test('notification activation opens its topic while preserving the previous draft and never sends a message',async()=>{
 const a=forumApp();await a.ready();await a.select(1);
 a.element('textarea').value='keep this draft';a.element('textarea').events.input();await flush();
 await a.notify(42);
 assert.equal(a.element('.topic-current').textContent,'Operations');
 assert.equal(a.drafts.get(1),'keep this draft');
 assert.equal(a.calls.some(c=>c.method==='chat.send'),false);
});

const botPeer = {id:'9007199254740993',name:'BotFather',bot:true,commandsReady:true,commands:[{command:'help',description:'Help'}]};
const botApp = () => app({'chat.history':()=>Promise.resolve({messages:[msg(1)],peer:botPeer,hasMore:false})});
test('bot command launcher opens a separate native window with slash query without sending',async()=>{
 const a=botApp();await a.ready();a.element('.bot-commands-toggle').events.click();await flush();
 assert.equal(a.calls.filter(c=>c.method==='window.openCommands').length,1);assert.equal(a.pending.length,0);
 a.element('textarea').value='/he';a.element('textarea').events.input();await flush();
 assert.equal(a.calls.filter(c=>c.method==='window.openCommands').at(-1).params.query,'he');assert.equal(a.pending.length,0);
});
test('native palette selection uses original chat send path once and preserves ordinary draft',async()=>{
 const a=botApp();await a.ready();a.element('textarea').value='keep draft';
 const pending=a.command({command:'help',topicId:0});await a.command({command:'help',topicId:0});assert.equal(a.pending.length,1);
 assert.equal(a.calls.find(c=>c.method==='chat.send').params.preserveDraft,true);
 a.pending[0].resolve({sent:true});await pending;assert.equal(a.element('textarea').value,'keep draft');
});
test('native palette selection clears slash query only after acknowledgement and rejects stale topic or malformed commands',async()=>{
 const a=botApp();await a.ready();a.element('textarea').value='/he';
 await a.command({command:'help',topicId:42});await a.command({command:'<bad>',topicId:0});assert.equal(a.pending.length,0);
 const pending=a.command({command:'help',topicId:0});assert.equal(a.element('textarea').value,'/he');
 a.pending[0].resolve({sent:true});await pending;assert.equal(a.element('textarea').value,'');
 const person=app();await person.ready();await person.command({command:'help',topicId:0});assert.equal(person.pending.length,0);assert.equal(person.element('.bot-commands-toggle').hidden,true);
});

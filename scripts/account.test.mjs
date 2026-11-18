import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const sources = await Promise.all(['presence.js','account.js'].map(name=>readFile(new URL('../prototype/'+name,import.meta.url),'utf8')));
const flush = () => new Promise(resolve=>setImmediate(resolve));
function account(failure,initial={}) {
 const nodes = new Map(), listeners = {}, calls = [], preferences = new Map();
 const node = () => ({ children: [], dataset:{}, attrs:{}, events:{}, checked:false, value:'', hidden:true,focus(){},contains(target){return target===this||this.children.includes(target);},querySelectorAll(){return this.children.flatMap(n=>n.children?.length?n.children:[n]);},
  addEventListener(type,fn){this.events[type]=fn;}, setAttribute(k,v){this.attrs[k]=v;}, append(...items){this.children.push(...items);}, replaceChildren(...items){this.children=items;}, showModal(){this.open=true;},close(){this.open=false;} });
 const element = selector => { if(!nodes.has(selector)) nodes.set(selector,node()); return nodes.get(selector); };
 const document = { querySelector:element,querySelectorAll:()=>[],createElement:node,createTextNode:text=>({textContent:text}),addEventListener(type,fn){listeners[type]=fn;},dispatchEvent(event){listeners[event.type]?.(event);} };
 let profile = {...initial,uin:'9007199254740993',firstName:'Ada',lastName:'Lovelace',name:'Ada Lovelace',username:'ada',...initial};
 const window = {icqramView:Object.freeze({kind:'contacts',localPresence:'AV'}),addEventListener(){},icqram:{native:true,async request(method,params){
 calls.push({method,params});
 if(method==='presence.local'){profile={...profile,localPresence:params.code};return {ok:true};}
 if(method==='presence.set'){
  if(failure)throw {code:failure};
  const base=profile.lastName.replace(/\s*\[ST:[A-Z]+\]$/,'');
  const lastName=[base,params.code?`[ST:${params.code}]`:''].filter(Boolean).join(' ');
  profile={...profile,lastName,name:profile.firstName+' '+lastName,shareStatus:params.shareChanges??profile.shareStatus};
 }
 return {profile:{...profile}};
 }}};
 const context = { window,document,localStorage:{getItem:k=>preferences.get(k),setItem:(k,v)=>preferences.set(k,v),removeItem:k=>preferences.delete(k)},CustomEvent:class{constructor(type,opts={}){this.type=type;this.detail=opts.detail;}} };
 for(const source of sources) vm.runInNewContext(source,context);
 return {element,calls,tray(code){listeners['icqram-tray-presence']({detail:{code}});},event(type,event){listeners[type]?.(event);},ready(){listeners['icqram-session']({detail:{auth:'ready'}});},click(selector){return element(selector).events.click();},choose(code){element('#presence-options').children.find(n=>n.dataset.code===code).events.click();}};
}
test('loading profile and changing a local status never writes to Telegram',async()=>{
 const app=account(); app.ready(); await flush();
 assert.equal(app.element('#account-title').textContent,'IBQgram - @9007199254740993');
 assert.equal(app.element('#account-username').textContent,'@ada');
 app.click('#presence-sharing'); app.choose('AW'); await app.click('#presence-apply');
 assert.deepEqual(app.calls.filter(c=>!['presence.local','window.openPanel'].includes(c.method)).map(c=>c.method),['profile.load']);
});
test('publishing requires an explicit action and carries the previewed name for conflict detection',async()=>{
 const app=account(); app.ready(); await flush(); app.click('#presence-sharing'); app.choose('AW');
 app.element('#presence-publish').checked=true; app.element('#presence-publish').events.change();
 assert.equal(app.element('#presence-preview').textContent,'Ada Lovelace [ST:AW]');
 assert.equal(app.calls.filter(c=>!['presence.local','window.openPanel'].includes(c.method)).length,1); await app.click('#presence-apply');
 const request=app.calls.find(c=>c.method==='presence.set'); assert.equal(request.method,'presence.set'); assert.equal(request.params.firstName,'Ada'); assert.equal(request.params.lastName,'Lovelace'); assert.equal(request.params.code,'AW'); assert.equal(request.params.publish,true);
 assert.equal(app.element('#account-name').textContent,'Ada Lovelace');
});
test('a rejected profile update remains an error and reloads the authoritative profile',async()=>{
 const app=account('PROFILE_CHANGED'); app.ready(); await flush(); app.click('#presence-sharing'); app.choose('AW'); app.element('#presence-publish').checked=true;
 await app.click('#presence-apply');
 assert.match(app.element('#presence-error').textContent,/changed elsewhere/);
 assert.equal(app.calls.filter(c=>c.method!=='presence.local').at(-1).method,'profile.load'); assert.equal(app.element('#presence-apply').disabled,false);
});

test('tray status updates the local preference without publishing a Telegram name',async()=>{
 const app=account();app.ready();await flush();app.tray('DND');await flush();
 assert.equal(app.calls.at(-1).method,'presence.local');assert.equal(app.calls.at(-1).params.code,'DND');
 assert.equal(app.calls.filter(c=>c.method==='presence.set').length,0);
 app.ready();await flush();assert.equal(app.calls.at(-1).params.code,'DND');
 const count=app.calls.length;app.tray('INVALID');assert.equal(app.calls.length,count);
});

test('status button opens upward menu and choosing a status applies locally without a modal or name write',async()=>{
 const a=account();a.ready();await flush();a.click('#presence');
 assert.equal(a.element('#presence-dropup').hidden,false);assert.equal(a.element('#presence').attrs['aria-expanded'],'true');assert.notEqual(a.element('#presence-dialog').open,true);
 const away=a.element('#status-menu-options').children.find(n=>n.dataset.code==='AW');away.events.click();await flush();
 assert.equal(a.element('#presence-dropup').hidden,true);assert.equal(a.element('#presence').attrs['aria-expanded'],'false');
 assert.equal(a.element('#presence').children[1].textContent,'Away');assert.equal(a.calls.at(-1).params.code,'AW');assert.equal(a.calls.some(c=>c.method==='presence.set'),false);
});
test('status popup dismisses on outside pointer, Escape and repeat click; Main and status are mutually exclusive',async()=>{
 const a=account();a.ready();await flush();a.click('#presence');a.event('pointerdown',{target:{}});assert.equal(a.element('#presence-dropup').hidden,true);
 a.click('#presence');a.event('keydown',{key:'Escape'});assert.equal(a.element('#presence-dropup').hidden,true);
 a.click('#presence');a.click('#presence');assert.equal(a.element('#presence-dropup').hidden,true);
 a.click('#presence');a.click('#logo-button');assert.equal(a.element('#presence-dropup').hidden,true);assert.equal(a.element('#main-dropup').hidden,false);
 assert.equal(a.calls.some(c=>c.method==='presence.set'),false);
});

test('profile avatar accepts only bounded native PNGs for the active account and clears on lock',async()=>{
 const a=account();a.ready();await flush();
 assert.equal(a.element('#account-initials').textContent,'AL');assert.equal(a.element('#account-avatar').hidden,true);
 a.event('icqram-profile-avatar',{detail:{uin:'9007199254740993',avatar:'data:image/png;base64,AA=='}});
 assert.equal(a.element('#account-avatar').hidden,false);assert.equal(a.element('#account-initials').hidden,true);
 a.event('icqram-profile-avatar',{detail:{uin:'123',avatar:'data:image/png;base64,AQ=='}});
 assert.equal(a.element('#account-avatar').src,'data:image/png;base64,AA==');
 for(const avatar of ['https://example.com/a.png','data:image/svg+xml;base64,AA==','data:image/png;base64,'+'A'.repeat(100000),'']){
  a.event('icqram-profile-avatar',{detail:{uin:'9007199254740993',avatar}});assert.equal(a.element('#account-avatar').hidden,true);assert.equal(a.element('#account-initials').hidden,false);
 }
 a.event('icqram-session',{detail:{auth:'locked'}});assert.equal(a.element('#account-avatar').src,'');
 a.event('icqram-profile-avatar',{detail:{uin:'9007199254740993',avatar:'data:image/png;base64,AA=='}});assert.equal(a.element('#account-avatar').hidden,true);
});

test('a late profile response after locking cannot restore the avatar or identity',async()=>{
 const a=account();a.ready();a.event('icqram-session',{detail:{auth:'locked'}});await flush();
 assert.equal(a.element('#account-avatar').hidden,true);assert.equal(a.element('#account-avatar').src,'');assert.equal(a.element('#account-name').textContent,undefined);
});

test('profile action opens a native account window instead of a modal in the main window',async()=>{
 const a=account();a.ready();await flush();a.click('#profile-button');await flush();assert.equal(a.calls.at(-1).method,'window.openProfile');assert.notEqual(a.element('#profile-dialog').open,true);
});


test('enabled sharing persists through profile reload and tray choices publish the selected code',async()=>{
 const a=account();a.ready();await flush();a.choose('AW');a.element('#presence-publish').checked=true;
 await a.click('#presence-apply');
 assert.equal(a.calls.find(c=>c.method==='presence.set').params.shareChanges,true);
 a.ready();await flush();a.tray('DND');await flush();
 const writes=a.calls.filter(c=>c.method==='presence.set');assert.equal(writes.length,2);assert.equal(writes[1].params.code,'DND');
 assert.equal(a.element('#presence').children[1].textContent,'DND');assert.equal(a.element('#account-name').textContent,'Ada Lovelace');
});
test('turning sharing off removes the published tag and later selections stay local',async()=>{
 const a=account(undefined,{shareStatus:true,lastName:'Lovelace [ST:AW]',name:'Ada Lovelace [ST:AW]'});
 a.ready();await flush();a.choose('FC');a.element('#presence-publish').checked=false;await a.click('#presence-apply');
 const update=a.calls.find(c=>c.method==='presence.set');assert.equal(update.params.code,'');assert.equal(update.params.shareChanges,false);
 a.tray('PH');await flush();assert.equal(a.calls.filter(c=>c.method==='presence.set').length,1);assert.equal(a.element('#presence').children[1].textContent,'On the Phone');
});
test('failed shared updates preserve the confirmed status and show the failure',async()=>{
 const a=account('FLOOD_WAIT',{shareStatus:true,lastName:'Lovelace [ST:AW]',name:'Ada Lovelace [ST:AW]'});
 a.ready();await flush();a.tray('DND');await flush();
 assert.equal(a.element('#presence').children[1].textContent,'Away');assert.match(a.element('#account-error').textContent,/wait/);
});
test('native status broadcasts synchronize without publishing or echoing to the host',async()=>{
 const a=account(undefined,{shareStatus:true});a.ready();await flush();const count=a.calls.length;
 a.event('icqram-presence-changed',{detail:{code:'DND'}});await flush();
 assert.equal(a.calls.length,count);assert.equal(a.element('#presence').children[1].textContent,'DND');
});

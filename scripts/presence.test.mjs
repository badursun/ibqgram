import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const context = { window: {} }; vm.runInNewContext(await readFile(new URL('../prototype/presence.js', import.meta.url), 'utf8'), context);
const P = context.window.ICQPresence;
test('presence strips only a known terminal marker, preserving unrelated names', () => {
  assert.equal(P.parse('Ada Lovelace [ST:AW]').name, 'Ada Lovelace');
  assert.equal(P.parse('Ada [ST:AW]').code, 'AW');
  for (const name of ['Ada [ST:XX]', 'Ada [ST:AW] Lovelace', 'Ada[ST:AW]', 'Ada [st:AW]']) assert.equal(P.parse(name).name, name);
});
test('changing and removing presence replaces one suffix without touching the base name', () => {
  assert.equal(P.lastNameWithStatus('Lovelace [ST:AW]', 'DND'), 'Lovelace [ST:DND]');
  assert.equal(P.lastNameWithStatus('Lovelace [ST:AW]', ''), 'Lovelace');
  assert.equal(P.lastNameWithStatus('', 'FC'), '[ST:FC]');
  assert.throws(() => P.lastNameWithStatus('Lovelace', 'BAD'));
});
test('an explicit self contact is retained and UIN is never rounded into a number', () => {
  const c = P.contact({ id: '9007199254740993', name: 'My account [ST:AW]', state: 'offline', self: true });
  assert.equal(c.id, '9007199254740993'); assert.equal(c.self, true);
  assert.equal(c.presence, 'AW'); assert.equal(c.state, 'offline'); assert.equal(c.name, 'My account');
  assert.equal(P.contact({ id: 123, name: 'Bad', state: 'online' }), null);
});

test('typed peer keys keep users, groups and channels distinct and preserve group titles',()=>{
 const values=[
  {id:'123',name:'Human [ST:AW]',kind:'user',state:'offline'},
  {id:'chat:123',name:'Group [ST:AW]',kind:'group',state:'online'},
  {id:'channel:123',name:'Channel',kind:'channel',state:'online'},
  {id:'456',name:'Bot',kind:'bot',state:'online'}
 ].map(P.contact);
 assert.equal(new Set(values.map(c=>c.id)).size,4);
 assert.equal(values[0].name,'Human');assert.equal(values[1].name,'Group [ST:AW]');
 assert.equal(values[1].presence,'IV');assert.equal(values[2].state,'offline');assert.equal(values[3].presence,'IV');
 assert.equal(P.contact({id:'channel:123',name:'Fake user',kind:'user',state:'online'}),null);
 assert.equal(P.contact({id:'../123',name:'Bad',kind:'group',state:'offline'}),null);
});
test('contact sections deduplicate peers and split only people into online and offline',()=>{
 const inputs=[{id:'1',name:'Online',kind:'user',state:'online'},{id:'2',name:'Offline',kind:'user',state:'offline'},
 {id:'3',name:'Bot',kind:'bot',state:'offline'},{id:'chat:1',name:'Group',kind:'group',state:'offline'},
 {id:'channel:1',name:'Channel',kind:'channel',state:'offline'}].map(P.contact);
 const sections=P.sections([...inputs,inputs[2]]);
 assert.deepEqual(Array.from(sections,s=>s.key),['general','bots','groups','channels']);
 assert.equal(sections[0].children[0].contacts[0].id,'1');assert.equal(sections[0].children[1].contacts[0].id,'2');
 assert.equal(sections[1].contacts.length,1);assert.equal(sections[2].contacts[0].id,'chat:1');assert.equal(sections[3].contacts[0].id,'channel:1');
});
test('All preserves every chat kind; User includes bots, Group and Channel stay distinct and search composes',()=>{
 const values=[{id:'1',name:'Ada',kind:'user'},{id:'2',name:'Helper',username:'helperbot',kind:'bot'},{id:'channel:3',name:'Team',kind:'group'},{id:'channel:4',name:'News',kind:'channel'}];
 const ids=(filter,query='')=>Array.from(P.filtered(values,filter,query),c=>c.id);
 assert.deepEqual(ids('all'),['1','2','channel:3','channel:4']);assert.deepEqual(ids('user'),['1','2']);assert.deepEqual(ids('group'),['channel:3']);assert.deepEqual(ids('channel'),['channel:4']);
 assert.deepEqual(ids('user','helperbot'),['2']);assert.deepEqual(ids('group','News'),[]);
});


test('custom statuses survive offline display without moving the contact into Online',()=>{
 for(const code of ['AV','FC','AW','NA','OC','DND','IV','OF','PH','LC']){
  const raw={id:'123',name:`Ada [ST:${code}]`,state:'offline'};
  const c=P.contact(raw),d=P.describe(raw);assert.equal(c.presence,code);assert.equal(c.customPresence,true);assert.equal(d.code,code);
  assert.equal(P.sections([c])[0].children[0].contacts.length,0);assert.equal(d.online,false);assert.match(d.text,/Offline/);
 }
 const d=P.describe({name:'Ada [ST:AW]',online:true});assert.equal(d.name,'Ada');assert.equal(d.text,'Away · Online');
 const bot=P.describe({name:'Bot [ST:AW]',bot:true,online:true});assert.equal(bot.name,'Bot [ST:AW]');assert.equal(bot.custom,false);assert.equal(bot.text,'Bot');
});

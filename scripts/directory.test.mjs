import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../prototype/directory.js',import.meta.url),'utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function directory() {
 const nodes=new Map(),calls=[],pending=[];
 const node=()=>({children:[],events:{},dataset:{},attrs:{},value:'',textContent:'',checked:false,
  addEventListener(n,f){this.events[n]=f;},setAttribute(n,v){this.attrs[n]=v;},getAttribute(n){return this.attrs[n];},
  append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},focus(){},click(){return this.events.click?.();},querySelector:element,querySelectorAll:all});
 function element(s){if(!nodes.has(s))nodes.set(s,node());return nodes.get(s);}
 const tabs=['email','username','uin','interests'].map(mode=>Object.assign(node(),{dataset:{mode}}));
 function all(s){return s==='[role=tab]'?tabs:s.startsWith('[role=tab]')?[...tabs,element('.directory-new'),element('.directory-pages')]:[];}
 const panel=node(); element('#directory-template').content={firstElementChild:{cloneNode:()=>panel}};
 const window={icqramView:{kind:'directory'},icqram:{request(method,params){calls.push({method,params});return new Promise((resolve,reject)=>pending.push({resolve,reject,method}));}}};
 const document={querySelector:element,createElement:node,createTextNode:text=>({textContent:text}),addEventListener(){}};
 vm.runInNewContext(source,{window,document});
 return {element,tabs,calls,pending,async search(users){element('.directory-query').value='BotFather';element('.directory-search').click();pending.at(-1).resolve({users:JSON.parse(JSON.stringify(users))});await flush();}};
}
const human={id:'9007199254740993',name:'<img onerror=alert(1)>',username:'sample_user',firstName:'Ada',lastName:'',contact:false,bot:false,online:false};
test('directory searches are read-only, IDs remain strings and names render as text',async()=>{
 const a=directory();assert.equal(a.calls.length,0);await a.search([human]);
 assert.equal(a.calls[0].method,'directory.search');assert.equal(a.calls.length,1);
 const row=a.element('tbody').children[0];row.click();
 assert.equal(row.children[0].children[1].textContent,human.id);
 assert.equal(a.element('.directory-add').textContent,'Add User');
 row.events.dblclick();assert.equal(a.calls.at(-1).method,'window.openChat');assert.equal(a.calls.at(-1).params.contactId,human.id);
});
test('contact addition waits for server acknowledgement; failure never opens a chat',async()=>{
 const a=directory();await a.search([human]);a.element('tbody').children[0].click();
 const action=a.element('.directory-add').click();assert.equal(a.calls.at(-1).method,'directory.add');assert.equal(a.element('.directory-add').disabled,true);
 a.pending.at(-1).reject({code:'TIMEOUT'});await action;
 assert.match(a.element('.directory-feedback').textContent,/onayı gecikti/);assert.equal(a.calls.filter(c=>c.method==='window.openChat').length,0);
 const again=a.element('.directory-add').click();a.pending.at(-1).resolve({added:true});await again;
 assert.equal(a.calls.at(-1).method,'window.openChat');
});
test('bots open a chat without contact writes or automatic messages; unsupported searches never call host',async()=>{
 const a=directory();await a.search([{...human,bot:true,verified:true,listed:true}]);a.element('tbody').children[0].click();
 assert.equal(a.element('.directory-add').textContent,'Open Chat');a.element('.directory-add').click();
 assert.equal(a.calls.at(-1).method,'window.openChat');assert.equal(a.calls.some(c=>c.method==='directory.add'||c.method==='chat.send'),false);
 a.pending.at(-1).resolve({ok:true});await flush();
 a.tabs[0].click();assert.equal(a.element('.directory-search').disabled,true);const count=a.calls.length;a.element('.directory-search').click();assert.equal(a.calls.length,count);
});
test('online filter removes selection and failed searches keep results empty',async()=>{
 const a=directory();await a.search([human]);a.element('tbody').children[0].click();
 a.element('.directory-online input').checked=true;a.element('.directory-online input').events.change();assert.equal(a.element('tbody').children.length,0);assert.equal(a.element('.directory-add').disabled,true);
 a.element('.directory-search').click();a.pending.at(-1).reject({code:'TIMEOUT'});await flush();assert.equal(a.element('tbody').children.length,0);assert.match(a.element('.directory-feedback').textContent,/gecikti/);
});
test('an unlisted bot must be explicitly added before becoming Open Chat',async()=>{
 const a=directory();await a.search([{...human,bot:true,listed:false}]);a.element('tbody').children[0].click();
 assert.equal(a.element('.directory-add').textContent,'Add User');
 const added=a.element('.directory-add').click();assert.equal(a.calls.at(-1).method,'directory.add');
 a.pending.at(-1).resolve({added:true,listed:true});await added;
 assert.equal(a.element('.directory-add').textContent,'Open Chat');
 assert.equal(a.calls.at(-1).method,'window.openChat');
});

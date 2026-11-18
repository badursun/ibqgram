import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const sources=await Promise.all(['presence.js','app.js'].map(n=>readFile(new URL('../prototype/'+n,import.meta.url),'utf8')));
const flush=()=>new Promise(r=>setImmediate(r));
function app(){
 const nodes=new Map(),events={},calls=[],timers=[];
 const node=(tag='div')=>{
  const n={tag,children:[],dataset:{},attrs:{},events:{},value:'',style:{},className:'',isConnected:true,focus(){n.focused=true;},setAttribute(k,v){n.attrs[k]=v;},addEventListener(k,f){n.events[k]=f;},append(...children){for(const c of children){c.parent=n;n.children.push(c);}},replaceChildren(...children){n.children=[];n.append(...children);},querySelector(s){return element(s);},querySelectorAll(s){const all=[];const walk=p=>{for(const c of p.children){if(s==='.contact'&&c.className.split(' ').includes('contact'))all.push(c);walk(c);}};walk(n);return all;},closest(s){let p=n.parent;while(p){if(s==='details'&&p.tag==='details')return p;p=p.parent;}return null;}};
  n.classList={add(c){n.className+=' '+c;},remove(c){n.className=n.className.split(' ').filter(v=>v!==c).join(' ');},toggle(c,on){this.remove(c);if(on)this.add(c);}};return n;
 };
 const element=s=>{if(!nodes.has(s))nodes.set(s,node());return nodes.get(s);};
 const filters=['all','user','group','channel'].map(value=>{const n=node('button');n.dataset.contactFilter=value;return n;});
 const document={hidden:false,querySelector:element,createElement:node,addEventListener(k,f){events[k]=f;},querySelectorAll(s){return s==='[data-contact-filter]'?filters:s==='#contact-list .contact'?element('#contact-list').querySelectorAll('.contact'):[];}};
 const contacts=[{id:'1',name:'Ada',kind:'user',state:'online'},{id:'2',name:'Helper',kind:'bot',state:'offline'},{id:'channel:3',name:'Team',kind:'group',state:'offline'},{id:'channel:4',name:'News',kind:'channel',state:'offline'}];
 const window={ICQAudio:{enabled:true},addEventListener(k,f){events[k]=f;},icqramView:{kind:'contacts'},icqram:{native:true,async request(method,params){calls.push({method,params});return {contacts,hasMoreDialogs:false};}}};
 for(const source of sources)vm.runInNewContext(source,{window,document,setInterval(f,ms){timers.push({f,ms});},Date});
 return {element,calls,filters,rows:()=>element('#contact-list').querySelectorAll('.contact'),async ready(){events['icqram-session']({detail:{auth:'ready'}});await flush();},filter(value){filters.find(b=>b.dataset.contactFilter===value).events.click();}};
}
test('single clicks select in place; double click and Enter activate one conversation',async()=>{
 const a=app();await a.ready();const bot=a.rows().find(n=>n.dataset.contactId==='2');
 bot.events.click();assert.equal(bot.attrs['aria-pressed'],'true');assert.equal(a.calls.some(c=>c.method==='window.openChat'),false);
 bot.events.click();assert.equal(a.rows().find(n=>n.dataset.contactId==='2'),bot);
 bot.events.dblclick();await flush();assert.equal(a.calls.filter(c=>c.method==='window.openChat').length,1);assert.equal(a.calls.at(-1).params.contactId,'2');
 const person=a.rows().find(n=>n.dataset.contactId==='1');person.events.keydown({key:'Enter',preventDefault(){}});await flush();assert.equal(a.calls.at(-1).params.contactId,'1');
});
test('filters preserve All groups and selection; a hidden selection cannot be opened through message buttons',async()=>{
 const a=app();await a.ready();a.rows().find(n=>n.dataset.contactId==='2').events.click();
 a.filter('group');assert.deepEqual(a.rows().map(n=>n.dataset.contactId),['channel:3']);assert.equal(a.element('#quick-message').disabled,false);assert.equal(a.element('#open-first').disabled,true);
 a.element('#quick-message').events.click();assert.equal(a.calls.some(c=>c.method==='window.openChat'),false);assert.equal(a.calls.at(-1).method,'window.openPanel');assert.equal(a.calls.at(-1).params.kind,'now');
 a.filter('user');assert.deepEqual(a.rows().map(n=>n.dataset.contactId),['1','2']);assert.equal(a.rows()[1].attrs['aria-pressed'],'true');
 a.filter('channel');assert.deepEqual(a.rows().map(n=>n.dataset.contactId),['channel:4']);
 a.filter('all');assert.equal(a.element('#contact-list').children.filter(n=>n.tag==='details').length,4);assert.equal(a.rows().length,4);assert.equal(a.rows()[1].attrs['aria-pressed'],'true');
});

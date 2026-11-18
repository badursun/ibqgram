import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const read=name=>readFile(new URL('../prototype/'+name,import.meta.url),'utf8');
const source=await read('auxiliary.js');
function panel(kind,data={}){
 const calls=[],events={},nodes=new Map();
 const node=()=>({children:[],classList:{add(){}},events:{},show(){this.open=true;},querySelectorAll(){return [];},addEventListener(n,f){this.events[n]=f;},append(n){this.children.push(n);}});
 const get=s=>{if(!nodes.has(s))nodes.set(s,node());return nodes.get(s);};
 const root={dataset:{}};
 vm.runInNewContext(source,{window:{icqramView:{kind,panelData:data},icqram:{request(method){calls.push(method);return Promise.resolve();}}},document:{documentElement:root,querySelector:get,createElement:node,addEventListener(n,f){events[n]=f;}}});
 return {get,root,calls,events};
}
test('auxiliary panels mount independently and Escape closes their native window',()=>{
 for(const [kind,selector]of Object.entries({settings:'#settings-dialog',about:'#about',presence:'#presence-dialog',info:'#info-dialog'})){
  const p=panel(kind);assert.equal(p.get(selector).open,true);assert.equal(p.root.dataset.auxiliary,'true');
  p.events.keydown({key:'Escape',preventDefault(){}});assert.deepEqual(p.calls,['window.close']);
 }
 assert.equal(panel('contacts').root.dataset.auxiliary,undefined);
});
test('information passed from chats is displayed as text, never executable markup',()=>{
 const p=panel('info',{title:'<img src=x>',lines:['<script>alert(1)</script>','@user']});
 assert.equal(p.get('#info-title').textContent,'<img src=x>');
 assert.equal(p.get('#info-lines').children[0].textContent,'<script>alert(1)</script>');
 assert.equal(p.get('#info-lines').children[0].innerHTML,undefined);
});
test('ICQ Now retains about:blank, renders only local content and allows no frame scripts or forms',async()=>{
 const html=await read('now.html'),js=await read('now.js');
 assert.match(html,/src="about:blank" sandbox="allow-same-origin"/);
 assert.match(html,/value="icq:now"/);assert.doesNotMatch(html,/<(?:script|img)[^>]*src="https?:/);
 assert.match(html,/connect-src 'none'/);assert.match(html,/form-action 'none'/);
 const nodes=new Map(),events={},calls=[],writes=[];
 for(const id of ['#now-refresh','#now-home','#now-minimize','#now-resize'])nodes.set(id,{addEventListener(n,f){events[id+n]=f;}});
 nodes.set('#now-frame',{contentDocument:{open(){},write(x){writes.push(x);},close(){}}});
 nodes.set('#now-page-template',{innerHTML:'<link href="now-page.css"><img src="assets/brand/static/icqram-flower.svg">'});
 vm.runInNewContext(js,{URL,window:{icqramView:{kind:'now'},icqram:{request(method){calls.push(method);return Promise.resolve();}}},document:{baseURI:'file:///app/ui/now.html',querySelector:s=>nodes.get(s),addEventListener(){}}});
 assert.match(writes[0],/href="file:\/\/\/app\/ui\/now-page.css"/);assert.match(writes[0],/src="file:\/\/\/app\/ui\/assets/);
 events['#now-refreshclick']();assert.equal(writes.length,2);assert.deepEqual(calls,[]);
});

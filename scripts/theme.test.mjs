import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('../prototype/native.js',import.meta.url),'utf8')).split('/* Native window operations. */')[0];
function theme(saved='system',dark=true) {
 const listeners={},calls=[],storage=new Map([['icqram.theme',saved]]), root={dataset:{}};
 const node=()=>({events:{},value:'',addEventListener(n,f){this.events[n]=f;},showModal(){this.open=true;},close(){this.open=false;}});
 const nodes=new Map(['#theme-choice','#settings-dialog','#settings-button','#system-menu'].map(s=>[s,node()]));
 const media={matches:dark,addEventListener(n,f){this.changed=f;}};
 const window={icqram:{native:true,request(method,params){calls.push({method,params});return Promise.resolve({ok:true});}},addEventListener(n,f){listeners[n]=f;}};
 vm.runInNewContext(source,{window,document:{documentElement:root,querySelector:s=>nodes.get(s),querySelectorAll:()=>[]},matchMedia:()=>media,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}});
 return {root,nodes,media,calls,storage,window,listeners,select(value){const select=nodes.get('#theme-choice');select.value=value;select.events.change();}};
}
test('theme preference overrides system, persists and synchronizes without echo loops',()=>{
 const t=theme();assert.equal(t.root.dataset.theme,'dark');
 t.select('light');assert.equal(t.root.dataset.theme,'light');assert.equal(t.storage.get('icqram.theme'),'light');assert.equal(t.calls[0].params.theme,'light');
 t.media.matches=true;t.media.changed();assert.equal(t.root.dataset.theme,'light');
 t.listeners['icqram-theme']({detail:{theme:'dark'}});assert.equal(t.root.dataset.theme,'dark');assert.equal(t.calls.length,1);
 t.listeners['icqram-theme']({detail:{theme:'invalid'}});assert.equal(t.root.dataset.theme,'dark');
 t.select('system');t.media.matches=false;t.media.changed();assert.equal(t.root.dataset.theme,'light');
});
test('settings opens from toolbar or service menu and restores saved theme',()=>{
 const t=theme('dark',false);assert.equal(t.root.dataset.theme,'dark');
 t.nodes.get('#settings-button').events.click();assert.equal(t.calls.at(-1).method,'window.openPanel');assert.equal(t.calls.at(-1).params.kind,'settings');
 t.nodes.get('#system-menu').events.click();assert.equal(t.calls.at(-1).params.kind,'settings');assert.notEqual(t.nodes.get('#settings-dialog').open,true);
 const invalid=theme('invalid',false);assert.equal(invalid.root.dataset.theme,'light');
});

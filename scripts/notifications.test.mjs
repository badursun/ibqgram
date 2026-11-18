import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../prototype/notifications.js',import.meta.url),'utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function setup({authorization='authorized',alerts=true,banner=true,sound=true}={}){
 const nodes=new Map(),events={},calls=[];
 const node=()=>({disabled:false,hidden:false,textContent:'',checked:false,value:'',dataset:{},events:{},addEventListener(k,f){this.events[k]=f;}});
 const get=s=>{if(!nodes.has(s))nodes.set(s,node());return nodes.get(s);};
 const controls=['enabled','sound','preview','private','groups','channels','pauseInDnd'].map(key=>{const n=get('#'+key);n.dataset.notify=key;return n;});
 let state={enabled:true,sound:true,preview:0,private:true,groups:true,channels:true,pauseInDnd:true};
 const os={authorization,alerts,banner,sound};let failSave=false;
 const request=async(method,params)=>{
  calls.push({method,params});
  if(method==='notifications.load'||method==='notifications.authorize')return {...state,system:{...os}};
  if(method==='notifications.save'){if(failSave)throw {code:'TIMEOUT'};state={...state,...params};return {...state};}
  return {ok:true};
 };
 vm.runInNewContext(source,{window:{icqramView:{kind:'settings'},icqram:{native:true,request},addEventListener(k,f){events[k]=f;}},document:{querySelector:get,querySelectorAll(){return controls;}}});
 return {get,controls,events,calls,os,state:()=>state,failSave:()=>{failSave=true;}};
}
test('opening settings reads real permission without changing preferences or requesting consent',async()=>{
 const p=setup();await settle();
 assert.deepEqual(p.calls.map(c=>c.method),['notifications.load']);
 assert.equal(p.get('#notification-options').disabled,false);
 assert.equal(p.get('#notify-test').disabled,false);
 assert.match(p.get('#notification-permission').textContent,/allowed/);
});
test('disabled notifications preserve individual choices and disable their controls',async()=>{
 const p=setup();await settle();
 p.get('#enabled').checked=false;p.get('#enabled').events.change();await settle();
 assert.equal(p.state().enabled,false);assert.equal(p.state().private,true);
 assert.equal(p.get('#private').disabled,true);assert.equal(p.get('#enabled').disabled,false);
 assert.equal(p.get('#notify-test').disabled,true);
 assert.equal(p.calls.filter(c=>c.method==='notifications.save').length,1);
});
test('preview changes use numeric privacy values; failed saves restore the last confirmed selection',async()=>{
 const p=setup();await settle();
 p.get('#preview').value='2';p.get('#preview').events.change();await settle();
 assert.equal(p.state().preview,2);
 p.failSave();p.get('#preview').value='0';p.get('#preview').events.change();await settle();
 assert.equal(p.get('#preview').value,'2');assert.match(p.get('#notification-feedback').textContent,/timed out/);
});
test('denied permission is reported and returning from macOS settings refreshes authorization',async()=>{
 const p=setup({authorization:'denied'});await settle();
 assert.match(p.get('#notification-permission').textContent,/blocked/);
 assert.equal(p.get('#notify-test').disabled,true);
 p.os.authorization='authorized';p.os.banner=false;p.events.focus();await settle();
 assert.match(p.get('#notification-permission').textContent,/banners are off/);
});
test('permission and test notifications require explicit separate actions',async()=>{
 const p=setup({authorization:'notDetermined'});await settle();
 assert.equal(p.get('#notify-authorize').hidden,false);
 p.get('#notify-authorize').events.click();await settle();
 assert.equal(p.calls.at(-1).method,'notifications.authorize');
 p.os.authorization='authorized';p.events.focus();await settle();
 p.get('#notify-test').events.click();await settle();
 assert.equal(p.calls.at(-1).method,'notifications.test');
 assert.match(p.get('#notification-feedback').textContent,/Test sent to macOS/);
 assert.equal(p.calls.some(c=>c.method.startsWith('chat.')),false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../prototype/native.js',import.meta.url),'utf8');
const flush = () => new Promise(resolve=>setImmediate(resolve));
test('restored sessions resize to the visible contacts surface even when the host started as login',async()=>{
 const frames=[],calls=[],events={},observed=[];
 const login={hidden:false,getBoundingClientRect:()=>({width:320,height:370})};
 const desktop={getBoundingClientRect:()=>({width:236,height:418})};
 let resolve;
 const grip={addEventListener(){}};
 const document={documentElement:{dataset:{}},querySelector:s=>s==='#desktop'?desktop:s==='.contacts-resize-grip'?grip:login,querySelectorAll:()=>[],addEventListener:(n,f)=>events[n]=f};
 const window={icqramView:{kind:'login'},addEventListener(){},icqram:{request(method,params){calls.push({method,params}); return new Promise(done=>{resolve=done;});}}};
 vm.runInNewContext(source.split('/* Native window operations. */')[1],{window,document,requestAnimationFrame:f=>frames.push(f),ResizeObserver:class{observe(el){observed.push(el);}}});
 frames.shift()(); assert.equal(calls[0].params.width,320);
 login.hidden=true; events['icqram-session'](); frames.shift()(); assert.equal(calls.length,1);
 resolve({ok:true}); await flush(); frames.shift()();
 assert.equal(calls[1].params.width,236); assert.equal(calls[1].params.height,418); assert.equal(observed.length,2);
 resolve({ok:true}); await flush(); frames.shift()(); assert.equal(calls.length,2);
});
test('contact size restores and keyboard resizing persists without auto-fit shrinking it',async()=>{
 const frames=[],calls=[],events={},gripEvents={},root={dataset:{}};
 const login={hidden:true},desktop={getBoundingClientRect:()=>({width:236,height:418})};
 let stored=JSON.stringify({width:360,height:500});
 const grip={addEventListener:(n,f)=>gripEvents[n]=f};
 const document={documentElement:root,querySelector:s=>s==='#desktop'?desktop:s==='.contacts-resize-grip'?grip:login,querySelectorAll:()=>[],addEventListener(){}};
 const window={innerWidth:360,innerHeight:500,icqramView:{kind:'contacts'},addEventListener:(n,f)=>events[n]=f,icqram:{request:async(method,params)=>{calls.push({method,params});return {ok:true};}}};
 vm.runInNewContext(source.split('/* Native window operations. */')[1],{window,document,localStorage:{getItem:()=>stored,setItem:(key,value)=>stored=value},requestAnimationFrame:f=>frames.push(f),ResizeObserver:class{observe(){}}});
 frames.shift()();await flush();assert.equal(calls[0].params.width,360);assert.equal(root.dataset.contactsResizable,'true');
 frames.shift()();events.resize();frames.shift()();assert.equal(calls.length,1);
 gripEvents.keydown({key:'ArrowRight',preventDefault(){}});await flush();assert.equal(calls[1].params.width,376);assert.equal(JSON.parse(stored).width,376);
});

test('native saved size wins over stale web storage and survives storage write failure',async()=>{
 const frames=[],calls=[],events={},gripEvents={};
 const login={hidden:true,getBoundingClientRect:()=>({width:320,height:370})},desktop={getBoundingClientRect:()=>({width:236,height:418})};
 const grip={addEventListener:(n,f)=>gripEvents[n]=f};
 const document={documentElement:{dataset:{}},querySelector:s=>s==='#desktop'?desktop:s==='.contacts-resize-grip'?grip:login,querySelectorAll:()=>[],addEventListener:(n,f)=>events[n]=f};
 const window={innerWidth:420,innerHeight:600,icqramView:{kind:'contacts',contactsSize:{width:420,height:600}},addEventListener(){},icqram:{request:async(method,params)=>{calls.push({method,params});return {ok:true};}}};
 vm.runInNewContext(source.split('/* Native window operations. */')[1],{window,document,localStorage:{getItem:()=>JSON.stringify({width:236,height:300}),setItem(){throw Error('unavailable');}},requestAnimationFrame:f=>frames.push(f),ResizeObserver:class{observe(){}}});
 frames.shift()();await flush();assert.equal(calls[0].params.width,420);assert.equal(calls[0].params.height,600);assert.equal(calls[0].params.surface,'contacts');
 gripEvents.keydown({key:'ArrowRight',preventDefault(){}});await flush();assert.equal(calls.at(-1).params.width,436);assert.equal(calls.at(-1).params.remember,true);
 login.hidden=false;events['icqram-session']();while(frames.length){frames.shift()();await flush();}
 assert.equal(calls.at(-1).params.surface,'login');assert.equal(calls.at(-1).params.remember,false);
 login.hidden=true;events['icqram-session']();while(frames.length){frames.shift()();await flush();}
 assert.equal(calls.at(-1).params.width,436);assert.equal(calls.at(-1).params.height,600);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../prototype/bot-commands.js',import.meta.url),'utf8');
const flush=()=>new Promise(r=>setImmediate(r));
const peer={bot:true,commandsReady:true,canSend:true,commands:[{command:'help',description:'Get help'},{command:'settings',description:'Change options'}]};
function palette(responses={}){
 const nodes=new Map(),calls=[],events={},intervals=[];let state=peer;
 const node=()=>({children:[],events:{},attributes:{},value:'',hidden:false,classList:{add(){}},show(){},focus(){},scrollIntoView(){},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},append(...v){this.children.push(...v);},replaceChildren(...v){this.children=v;},addEventListener(k,v){this.events[k]=v;},querySelector:element});
 const element=key=>{if(!nodes.has(key))nodes.set(key,node());return nodes.get(key);};
 const document={hidden:false,documentElement:{dataset:{}},querySelector:element,createElement:node,addEventListener(){}};
 const window={icqramView:{kind:'commands',panelData:{name:'BotFather'}},addEventListener(k,v){events[k]=v;},icqram:{request(method,params){calls.push({method,params});return responses[method]?.(params)||Promise.resolve(state);}}};
 vm.runInNewContext(source,{window,document,setInterval:f=>intervals.push(f)});
 return {element,calls,window,document,async ready(){await flush();},async poll(value){state=value;await intervals[0]();},reopen:()=>events['icqram-commands-open']({detail:{name:'BotFather',query:''}})};
}
const key=(key,target,extra={})=>({key,target,preventDefault(){this.prevented=true;},...extra});
test('native command window filters descriptions and renders untrusted descriptions as text',async()=>{
 const p=palette();await p.ready();const filter=p.element('.bot-command-filter');filter.value='options';filter.events.input();
 assert.equal(p.element('.bot-command-list').children[0].children[0].textContent,'/settings');
 await p.poll({...peer,commands:[{command:'help',description:'<script>bad</script>'},{command:'help'},{command:'../bad'}]});filter.value='';filter.events.input();
 assert.equal(p.element('.bot-command-list').children.length,1);assert.equal(p.element('.bot-command-list').children[0].children[1].textContent,'<script>bad</script>');
});
test('keyboard selection sends only selected published command once and ignores IME Enter',async()=>{
 let resolve;const p=palette({'commands.select':()=>new Promise(r=>resolve=r)});await p.ready();
 const box=p.element('#bot-commands-dialog'),filter=p.element('.bot-command-filter');
 box.events.keydown(key('Enter',filter,{isComposing:true}));assert.equal(p.calls.filter(c=>c.method==='commands.select').length,0);
 box.events.keydown(key('ArrowDown',filter));box.events.keydown(key('Enter',filter));box.events.keydown(key('Enter',filter));
 const calls=p.calls.filter(c=>c.method==='commands.select');assert.equal(calls.length,1);assert.equal(calls[0].params.command,'settings');resolve({ok:true});await flush();
});
test('empty, no-match, refresh and close never send commands; blocked bots disable selection',async()=>{
 const p=palette();await p.ready();const filter=p.element('.bot-command-filter');filter.value='unknown';filter.events.input();
 p.element('#bot-commands-dialog').events.keydown(key('Enter',filter));assert.equal(p.calls.some(c=>c.method==='commands.select'),false);
 assert.equal(p.element('.bot-command-empty').textContent,'No matching commands.');
 await p.poll({...peer,commands:[]});assert.match(p.element('.bot-command-empty').textContent,/not published/);
 await p.poll({...peer,blocked:true});filter.value='';filter.events.input();assert.equal(p.element('.bot-command-send').disabled,true);
 await p.element('.bot-command-refresh').events.click();p.element('#bot-commands-dialog').events.keydown(key('Escape',filter));
 assert.equal(p.calls.at(-1).method,'window.close');assert.equal(p.calls.some(c=>c.method==='commands.select'),false);
});
test('failed selection remains retryable and reopening refreshes its command list',async()=>{
 let attempts=0;const p=palette({'commands.select':()=>{attempts++;return attempts===1?Promise.reject({code:'TOPIC_CHANGED'}):Promise.resolve({ok:true});}});await p.ready();
 await p.element('.bot-command-list').children[0].events.click();assert.match(p.element('.bot-command-empty').textContent,/topic changed/);
 assert.equal(p.element('.bot-command-list').children[0].disabled,false);
 p.reopen();await flush();await p.element('.bot-command-list').children[0].events.click();assert.equal(attempts,2);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../prototype/chat.js',import.meta.url),'utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function viewer(response){
 const nodes=new Map(),events={},calls=[],timers=[];
 const element=s=>{if(!nodes.has(s))nodes.set(s,{events:{},disabled:true,hidden:true,paused:true,currentTime:0,duration:60,volume:1,muted:false,canPlayType(){return 'probably';},setAttribute(k,v){this[k]=v;},removeAttribute(k){delete this[k];},load(){this.loads=(this.loads||0)+1;},pause(){this.paused=true;},async play(){this.paused=false;this.plays=(this.plays||0)+1;},addEventListener(t,f){this.events[t]=f;},append(){},querySelector:element});return nodes.get(s);};
 element('#media-viewer-template').content={firstElementChild:{cloneNode:()=>element('panel')}};
 const document={hidden:false,querySelector:element,addEventListener(t,f){events[t]=f;}};
 const window={icqramView:{kind:'viewer'},addEventListener(t,f){events[t]=f;},icqram:{native:true,async request(method,params){calls.push({method,params});if(method==='viewer.load')return response();return {saved:true};}}};
 vm.runInNewContext(source,{window,document,Date,setTimeout:f=>{timers.push(f);return timers.length;},clearTimeout(){}});
 return {element,calls,events,timers,async ready(){events['icqram-session']({detail:{auth:'ready'}});await flush();}};
}
test('viewer fits a valid photo and saves only after the download button is clicked',async()=>{
 const v=viewer(()=>({url:'data:image/jpeg;base64,/9j/2Q==',width:2560,height:1920}));await v.ready();
 assert.equal(v.element('.viewer-image').hidden,false);assert.equal(v.element('.viewer-save').disabled,false);
 assert.match(v.element('.viewer-status').textContent,/2560 × 1920/);assert.equal(v.calls.some(c=>c.method==='viewer.save'),false);
 await v.element('.viewer-save').events.click();assert.equal(v.calls.filter(c=>c.method==='viewer.save').length,1);
 assert.equal(v.calls.every(c=>c.params===undefined),true);
});
test('viewer shows real progress and stops loading when closed without sending or saving',async()=>{
 const v=viewer(()=>({loading:true,bytes:128,size:512}));await v.ready();
 assert.equal(v.element('.viewer-progress').value,128);assert.equal(v.element('.viewer-save').disabled,true);
 await v.element('.viewer-close').events.click();await v.timers[0]();
 assert.equal(v.calls.filter(c=>c.method==='viewer.load').length,1);
 assert.deepEqual(v.calls.slice(-2).map(c=>c.method),['viewer.cancel','window.close']);
});
test('viewer rejects non-image and script URLs and permits an explicit retry',async()=>{
 let result={url:'javascript:alert(1)'};const v=viewer(()=>result);await v.ready();
 assert.equal(v.element('.viewer-image').src,undefined);assert.equal(v.element('.viewer-save').disabled,true);assert.equal(v.element('.viewer-retry').hidden,false);
 result={url:'data:image/jpeg;base64,/9j/2Q==',width:20,height:10};await v.element('.viewer-retry').events.click();await flush();
 assert.equal(v.element('.viewer-save').disabled,false);
});

test('video waits for explicit play, supports seek and volume, then stops and releases source on close', async()=>{
 const v=viewer(()=>({url:'icqram-ui://domain/media/playback',kind:'video',mime:'video/mp4',name:'video.mp4'}));await v.ready();
 const player=v.element('.viewer-video');
 assert.equal(player.src,'icqram-ui://domain/media/playback');assert.equal(player.plays,undefined);
 assert.equal(v.element('.viewer-controls').hidden,false);assert.equal(v.element('.viewer-save').disabled,false);
 player.events.canplay();await v.element('.viewer-play').events.click();assert.equal(player.paused,false);
 v.element('.viewer-seek').value='20';v.element('.viewer-seek').events.input();assert.equal(player.currentTime,20);
 v.element('.viewer-volume').value='0.35';v.element('.viewer-volume').events.input();assert.equal(player.volume,0.35);
 v.element('.viewer-mute').events.click();assert.equal(player.muted,true);
 await v.element('.viewer-close').events.click();assert.equal(player.paused,true);assert.equal(player.src,undefined);
 assert.equal(v.calls.some(c=>/send|save/.test(c.method)),false);
 v.events['icqram-viewer-focus']();await flush();assert.equal(player.src,'icqram-ui://domain/media/playback');assert.equal(player.paused,true);
});
test('audio decode failure retains download; lock/hide removes playing source', async()=>{
 const v=viewer(()=>({url:'icqram-ui://domain/media/playback',kind:'audio',mime:'audio/ogg'}));await v.ready();
 const player=v.element('.viewer-audio');assert.equal(v.element('.viewer-audio-label').hidden,false);
 player.events.error();assert.match(v.element('.viewer-status').textContent,/İndirerek/);assert.equal(v.element('.viewer-save').disabled,false);
 v.events['icqram-viewer-stop']();assert.equal(player.src,undefined);assert.equal(v.element('.viewer-save').disabled,true);
});
test('viewer rejects remote media URLs and foreign local resources',async()=>{
 for(const url of ['https://example.com/video.mp4','file:///etc/passwd','icqram-ui://domain/media/other']){
  const v=viewer(()=>({url,kind:'video',mime:'video/mp4'}));await v.ready();
  assert.equal(v.element('.viewer-video').src,undefined);assert.equal(v.element('.viewer-save').disabled,true);
 }
});
test('late media result cannot restart playback after close',async()=>{
 let resolve;const v=viewer(()=>new Promise(r=>{resolve=r;}));await v.ready();
 await v.element('.viewer-close').events.click();resolve({url:'icqram-ui://domain/media/playback',kind:'audio',mime:'audio/ogg'});await flush();
 assert.equal(v.element('.viewer-audio').src,undefined);assert.equal(v.element('.viewer-save').disabled,true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../prototype/brand.js',import.meta.url),'utf8');
function surface(theme, systemDark, paths) {
  const root = {dataset:{theme}};
  const images = paths.map(src=>({src,writes:0,getAttribute(){return this.src;},setAttribute(key,value){assert.equal(key,'src');this.src=value;this.writes++;}}));
  const media = {matches:systemDark,addEventListener(type,fn){this.change=fn;}};
  let changed;
  const window = {};
  vm.runInNewContext(source, {
    window,matchMedia:()=>media,
    document:{documentElement:root,querySelectorAll:()=>images,querySelector:()=>null},
    MutationObserver:class{constructor(fn){changed=fn;}observe(){}},
  });
  return {images,root,media,changed};
}

test('brand follows explicit app theme even when macOS appearance is different',()=>{
  const s=surface('dark',false,['assets/brand/static/icqram-logo.svg']);
  assert.equal(s.images[0].src,'assets/brand/static/ibqgram-logo-dark.svg');
  s.root.dataset.theme='light';s.changed();
  assert.equal(s.images[0].src,'assets/brand/static/ibqgram-logo-light.svg');
});
test('theme updates preserve message replay identity and do not restart unchanged animations',()=>{
  const s=surface('dark',false,['assets/brand/animations/icqram-flower-message.svg?replay=123']);
  assert.equal(s.images[0].src,'assets/brand/animations/ibqgram-icon-dark-message.svg?replay=123');
  s.changed();assert.equal(s.images[0].writes,1);
  s.root.dataset.theme='light';s.changed();
  assert.equal(s.images[0].src,'assets/brand/animations/ibqgram-icon-light-message.svg?replay=123');
});
test('system appearance is used when the standalone brand page has no app theme',()=>{
  const s=surface(undefined,false,['assets/brand/static/icqram-flower.svg']);
  assert.equal(s.images[0].src,'assets/brand/static/ibqgram-icon-light.svg');
  s.media.matches=true;s.media.change();
  assert.equal(s.images[0].src,'assets/brand/static/ibqgram-icon-dark.svg');
});
test('brand updates leave presence assets and account images unchanged',()=>{
  const paths=['assets/brand/presence/OF.svg','data:image/png;base64,AA==','icqram-ui://domain/avatar/123'];
  const s=surface('dark',true,paths);
  assert.deepEqual(s.images.map(x=>x.src),paths);
  assert.ok(s.images.every(x=>x.writes===0));
});

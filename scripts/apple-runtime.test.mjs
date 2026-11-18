import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const script=fileURLToPath(new URL('../desktop/tdesktop/Telegram/cmake/icqram_apple_runtime.cmake',import.meta.url));
function run(command,args) { const r=spawnSync(command,args,{encoding:'utf8'}); assert.equal(r.status,0,r.stderr); return r.stdout.trim(); }
test('arm64 packaging removes an unused Intel Swift core and keeps the matching runtime', {skip:process.platform!=='darwin'}, async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'icqram-runtime-'));
 try {
  const bin=path.join(dir,'Contents/MacOS'), libs=path.join(dir,'Contents/Frameworks'); await mkdir(bin,{recursive:true}); await mkdir(libs,{recursive:true});
  const source=path.join(dir,'sample.c'); await writeFile(source,'int icqram_fixture(void) { return 1; }\n');
  const compile=(arch,out,extra=[])=>run('xcrun',['clang','-arch',arch,'-dynamiclib','-mmacosx-version-min=13.0',source,...extra,'-o',out]);
  const exe=path.join(bin,'icqram'); compile('arm64',exe);
  const core=path.join(libs,'libswiftCore.dylib'); compile('x86_64',core);
  const arm=path.join(dir,'arm.dylib'), intel=path.join(dir,'intel.dylib'); compile('arm64',arm); compile('x86_64',intel);
  const runtime=path.join(libs,'libswift_Concurrency.dylib'); run('lipo',['-create',arm,intel,'-output',runtime]);
  run('cmake',[`-DICQRAM_EXECUTABLE=${exe}`,'-P',script]);
  await assert.rejects(access(core)); assert.equal(run('lipo',['-archs',runtime]),'arm64');
  compile('arm64',core,['-Wl,-install_name,@rpath/libswiftCore.dylib']);
  await writeFile(source,'extern int icqram_fixture(void); int dependent(void) { return icqram_fixture(); }\n');
  compile('arm64',runtime,[core]);
  await writeFile(source,'int icqram_fixture(void) { return 1; }\n'); compile('x86_64',core);
  const rejected=spawnSync('cmake',[`-DICQRAM_EXECUTABLE=${exe}`,'-P',script],{encoding:'utf8'});
  assert.notEqual(rejected.status,0); await access(core);
  assert.match(rejected.stderr,/still requires/);
 } finally { await rm(dir,{recursive:true,force:true}); }
});

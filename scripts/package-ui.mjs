import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
async function writeIfChanged(file, content) {
  try { if ((await readFile(file)).equals(Buffer.from(content))) return; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await writeFile(file, content);
}
const files = ['bot-commands.js','notifications.js','auxiliary.js','now.html','now.js','now.css','now-page.css', 'startup.html','startup.css', 'assets/classic/add-users.png', 'assets/classic/icq-now.png', 'assets/classic/contact-filters.png', 'index.html', 'style.css', 'classic-chat.css', 'directory.css', 'directory.js', 'app.js', 'audio.js', 'bridge.js', 'native.js', 'presence.js', 'account.js', 'chat-model.js', 'chat.js', 'boot.js', 'brand.html', 'brand.css', 'brand.js'];
for (const name of ['directory','directory-mascot','session','status','sound','message','privacy','font','text-color','background-color','user-menu','user-details','corner']) files.push(`assets/classic/${name}.svg`);
for (const folder of ['static','animations','presence']) {
  for (const name of await readdir(path.join(root,'prototype/assets/brand',folder))) {
    if (/\.(svg|png)$/.test(name)) files.push(`assets/brand/${folder}/${name}`);
  }
}
const sounds = ['icq-startup-sfx','icq-message-received-sfx','icq-system-message-sfx','icq-url-ribbit-sfx','icq-auth-sound','icq-user-online','icq-chat-beep','icq-chat-request-from','icq-incoming-contact-from','icq-incoming-file-from','icq-incoming-file-transfer','icq-incoming-web-page-from','icq-phone-request-from','icq-phone-sfx'];
const output = path.join(root, 'build/ui');
const manifest = { version: 1, files: {} };
const resources = [];
const xml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
for (const file of [...files, ...sounds.map(name => `sounds/${name}.mp3`)]) {
  const source = path.join(root, file.startsWith('sounds/') ? file : `prototype/${file}`);
  let content;
  try { content = await readFile(source); }
  catch (error) { if (file.startsWith('sounds/') && error.code === 'ENOENT') continue; throw error; }
  const destination = path.join(output, file);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeIfChanged(destination, content);
  manifest.files[file] = createHash('sha256').update(content).digest('hex');
  resources.push(`    <file alias="${xml(file)}">${xml(path.relative(path.join(root, 'build'), source))}</file>`);
}
await writeIfChanged(path.join(output, 'ui-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
await writeIfChanged(path.join(root, 'build/icqram-ui.qrc'), `<RCC>\n  <qresource prefix="/icqram">\n${resources.join('\n')}\n  </qresource>\n</RCC>\n`);
console.log(`Packaged ${Object.keys(manifest.files).length} shared assets.`);

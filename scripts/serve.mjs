import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../prototype/', import.meta.url));
const assets = new Map([['/', ['index.html', 'text/html']], ['/index.html', ['index.html', 'text/html']], ['/app.js', ['app.js', 'text/javascript']], ['/style.css', ['style.css', 'text/css']]]);
for (const file of ['audio.js', 'boot.js', 'brand.js', 'bridge.js', 'native.js', 'presence.js', 'account.js', 'chat-model.js', 'chat.js', 'directory.js','auxiliary.js','now.js']) assets.set('/' + file, [file, 'text/javascript']);
assets.set('/now.html', ['now.html','text/html']);
assets.set('/now.css', ['now.css','text/css']);
assets.set('/now-page.css', ['now-page.css','text/css']);
assets.set('/brand.html', ['brand.html', 'text/html']);
assets.set('/directory.css', ['directory.css', 'text/css']);
assets.set('/classic-chat.css', ['classic-chat.css', 'text/css']);
assets.set('/brand.css', ['brand.css', 'text/css']);
for (const name of ['directory','directory-mascot','session','status','sound','message','privacy','font','text-color','background-color','user-menu','user-details','corner']) assets.set(`/assets/classic/${name}.svg`, [`assets/classic/${name}.svg`, 'image/svg+xml']);
for(const name of ['contact-filters','add-users','icq-now']) assets.set(`/assets/classic/${name}.png`,[`assets/classic/${name}.png`,'image/png']);
for (const folder of ['static','animations','presence']) {
  for (const name of await readdir(path.join(root,'assets/brand',folder))) {
    if (!/\.(svg|png)$/.test(name)) continue;
    const file=`assets/brand/${folder}/${name}`;
    assets.set('/'+file,[file,name.endsWith('.svg')?'image/svg+xml':'image/png']);
  }
}
for (const file of ['icq-startup-sfx.mp3','icq-message-received-sfx.mp3','icq-system-message-sfx.mp3','icq-url-ribbit-sfx.mp3','icq-auth-sound.mp3','icq-user-online.mp3','icq-chat-beep.mp3','icq-chat-request-from.mp3','icq-incoming-contact-from.mp3','icq-incoming-file-from.mp3','icq-incoming-file-transfer.mp3','icq-incoming-web-page-from.mp3','icq-phone-request-from.mp3','icq-phone-sfx.mp3']) {
  assets.set('/sounds/' + file, ['../sounds/' + file, 'audio/mpeg']);
}
export function createPreviewServer() {
  return createServer(async (req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return; }
    const asset = assets.get((req.url || '/').split('?')[0]);
    if (!asset) { res.writeHead(404); res.end('Not found'); return; }
    try {
      const content = await readFile(path.join(root, asset[0]));
      const headers = { 'Content-Type': asset[1], 'Content-Length': content.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "frame-ancestors 'none'" };
      if (asset[1] === 'audio/mpeg') {
        headers['Accept-Ranges'] = 'bytes';
        if (req.headers.range) {
          const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
          const start = match ? Number(match[1]) : -1;
          const end = match && match[2] ? Math.min(Number(match[2]), content.length - 1) : content.length - 1;
          if (!Number.isSafeInteger(start) || start < 0 || start >= content.length || end < start) {
            res.writeHead(416, { 'Content-Range': `bytes */${content.length}` }); res.end(); return;
          }
          res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${content.length}`, 'Content-Length': end - start + 1 });
          res.end(req.method === 'HEAD' ? undefined : content.subarray(start, end + 1)); return;
        }
      }
      res.writeHead(200, headers);
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch { res.writeHead(500); res.end('Preview asset unavailable'); }
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 1999);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be 1–65535');
  const server = createPreviewServer();
  server.on('error', error => { console.error(`Preview could not start: ${error.message}. Try PORT=2000 npm run dev.`); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`icqram preview: http://127.0.0.1:${port} — Ctrl+C to stop`));
}

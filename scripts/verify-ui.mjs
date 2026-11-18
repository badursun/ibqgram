import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, 'build/ui/ui-manifest.json')));
const native = process.argv.includes('--native');
for (const [file, expected] of Object.entries(manifest.files)) {
  const source = path.join(root, file.startsWith('sounds/') ? file : `prototype/${file}`);
  const items = [source, path.join(root, 'build/ui', file), path.join(root, 'build/icqram.app/Contents/Resources', file)];
  if (native) items.push(path.join(root, 'desktop/tdesktop/out/Debug/icqram.app/Contents/Resources/ui', file));
  for (const item of items) {
    const actual = createHash('sha256').update(await readFile(item)).digest('hex');
    if (actual !== expected) throw new Error(`UI differs: ${item}`);
  }
}
console.log(`Verified ${Object.keys(manifest.files).length} assets: source, Qt staging, Swift bundle${native ? ' and Telegram native bundle' : ''} match byte for byte.`);

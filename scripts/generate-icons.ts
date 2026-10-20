// Renders src-tauri/icons/logo.svg into the icon files tauri.conf.json, the tray
// and the phone remote use. `tauri icon` also emits Android/iOS/Store icons we
// don't ship, so it writes to a temp dir and only the used files are copied.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

const iconsDir = path.resolve('src-tauri/icons');
const source = path.join(iconsDir, 'logo.svg');
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oxitune-icons-'));

const result = spawnSync('bun', ['run', 'tauri', 'icon', source, '--output', outDir], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (result.status !== 0) process.exit(result.status ?? 1);

for (const file of ['32x32.png', '128x128.png', '128x128@2x.png', 'icon.png', 'icon.ico', 'icon.icns']) {
  fs.copyFileSync(path.join(outDir, file), path.join(iconsDir, file));
}
fs.rmSync(outDir, { recursive: true, force: true });
console.log('Icons generated from logo.svg.');

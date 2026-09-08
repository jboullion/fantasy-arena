import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const children = [
  spawn(process.execPath, [require.resolve('tsx/cli'), 'watch', 'apps/server/src/main.ts'], { stdio: 'inherit', windowsHide: true }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0'], { stdio: 'inherit', windowsHide: true }),
];
let closing = false;
function close(code = 0) { if (closing) return; closing = true; children.forEach(child => child.kill()); process.exitCode = code; }
for (const child of children) { child.on('error', error => { console.error(error); close(1); }); child.on('exit', code => close(code ?? 0)); }
process.on('SIGINT', () => close()); process.on('SIGTERM', () => close());

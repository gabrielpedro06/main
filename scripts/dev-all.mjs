import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const nodeExecutable = process.execPath;
const viteEntry = resolve(__dirname, '../node_modules/vite/bin/vite.js');
const serverEntry = resolve(__dirname, '../server/index.js');

const children = [];
let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }

  process.exit(exitCode);
}

function startProcess(label, entryPoint) {
  const child = spawn(nodeExecutable, [entryPoint], {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;

    if (signal) {
      console.error(`[dev:${label}] exited due to ${signal}`);
      shutdown(1);
      return;
    }

    if (code !== 0) {
      console.error(`[dev:${label}] exited with code ${code}`);
      shutdown(code || 1);
    }
  });

  children.push(child);
  return child;
}

startProcess('server', serverEntry);
startProcess('client', viteEntry);

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
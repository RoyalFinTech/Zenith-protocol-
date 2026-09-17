import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = path.resolve(backendDir, '..');
const frontendDir = path.join(repoDir, 'frontend');
const frontendDist = path.join(frontendDir, 'dist');
const bundledFrontendDir = path.join(backendDir, 'frontend-dist');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('npx', ['tsc', '-p', 'tsconfig.json'], backendDir);

if (!existsSync(path.join(frontendDir, 'package.json'))) {
  throw new Error('Frontend package.json not found');
}

run(npm, ['install', '--no-package-lock', '--no-audit', '--no-fund'], frontendDir);
run(npm, ['run', 'build'], frontendDir);

if (!existsSync(path.join(frontendDist, 'index.html'))) {
  throw new Error('Frontend build did not produce frontend/dist/index.html');
}

rmSync(bundledFrontendDir, { recursive: true, force: true });
mkdirSync(bundledFrontendDir, { recursive: true });
cpSync(frontendDist, bundledFrontendDir, { recursive: true });

console.log(`Frontend bundled into ${path.relative(repoDir, bundledFrontendDir)}`);

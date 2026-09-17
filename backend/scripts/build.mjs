import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

const builtIndex = path.join(frontendDist, 'index.html');
if (!existsSync(builtIndex)) {
  throw new Error('Frontend build did not produce frontend/dist/index.html');
}

// The production frontend keeps the matrix UI in the existing index.html.
// Preserve that UI, but correct the backend-node mapping before the bundled
// artifact is served. Matrix positions are global descendant positions:
// level 1 starts at position 1, level 2 at 3, level 3 at 7, etc.
// Therefore the zero-based index within a level is position - (2^level - 1).
const indexHtml = readFileSync(builtIndex, 'utf8');
const brokenNodeMapping = 'index:0,parentId:n.level>1?';
const legacyFixedNodeMapping = 'index:n.position-(2**(n.level-1)),parentId:n.level>1?';
const fixedNodeMapping = 'index:n.position-(2**n.level-1),parentId:n.level>1?';
let patchedIndex = indexHtml;
if (patchedIndex.includes(brokenNodeMapping)) {
  patchedIndex = patchedIndex.replaceAll(brokenNodeMapping, fixedNodeMapping);
}
if (patchedIndex.includes(legacyFixedNodeMapping)) {
  patchedIndex = patchedIndex.replaceAll(legacyFixedNodeMapping, fixedNodeMapping);
}
if (patchedIndex !== indexHtml) {
  writeFileSync(builtIndex, patchedIndex, 'utf8');
  console.log('Patched matrix node indices in frontend/dist/index.html');
}

rmSync(bundledFrontendDir, { recursive: true, force: true });
mkdirSync(bundledFrontendDir, { recursive: true });
cpSync(frontendDist, bundledFrontendDir, { recursive: true });

console.log(`Frontend bundled into ${path.relative(repoDir, bundledFrontendDir)}`);

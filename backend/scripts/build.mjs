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
// Preserve that UI, but correct the binary-tree indexing before the bundled
// artifact is served. The root "YOU" is outside the numbered matrix nodes:
// positions 1-2 are level 1, 3-6 level 2, 7-14 level 3, etc.
const indexHtml = readFileSync(builtIndex, 'utf8');
let patchedIndex = indexHtml;

// Backend rows must use the zero-based index within their binary level.
const legacyFixedNodeMapping = 'index:n.position-(2**(n.level-1)),parentId:n.level>1?';
const brokenNodeMapping = 'index:0,parentId:n.level>1?';
const fixedNodeMapping = 'index:n.position-(2**n.level-1),parentId:n.level>1?';
patchedIndex = patchedIndex.replaceAll(legacyFixedNodeMapping, fixedNodeMapping);
patchedIndex = patchedIndex.replaceAll(brokenNodeMapping, fixedNodeMapping);

// The frontend's structural fallback must match the same 2xN numbering:
// position 1/2 are level 1 and parented to YOU; every later node has parent
// floor((position - 1) / 2). This also prevents a final partial level from
// being omitted or producing an undefined SVG coordinate.
patchedIndex = patchedIndex.replaceAll(
  'const level=Math.floor(Math.log2(position))+1;const firstAtLevel=(2**(level-1));',
  'const level=Math.floor(Math.log2(position+1));const firstAtLevel=(2**level-1);'
);
patchedIndex = patchedIndex.replaceAll(
  'parentId:level===1?null:Math.floor(index/2)+firstAtLevel/2',
  'parentId:level===1?null:Math.floor((position-1)/2)'
);

// Matrix rendering must include the actual deepest node level. Program metadata
// (2x4/2x6) describes the named program, while capacity determines the number
// of descendant positions. For 30 and 126 positions this produces 4 and 6
// numbered levels respectively.
patchedIndex = patchedIndex.replaceAll(
  'const levels=p.levels, maxCount=2**levels;',
  'const levels=Math.max(p.levels, nodes.reduce((max,n)=>Math.max(max,n.level),0)), maxCount=2**levels;'
);

if (patchedIndex !== indexHtml) {
  writeFileSync(builtIndex, patchedIndex, 'utf8');
  console.log('Patched binary matrix structure in frontend/dist/index.html');
}

rmSync(bundledFrontendDir, { recursive: true, force: true });
mkdirSync(bundledFrontendDir, { recursive: true });
cpSync(frontendDist, bundledFrontendDir, { recursive: true });

console.log(`Frontend bundled into ${path.relative(repoDir, bundledFrontendDir)}`);

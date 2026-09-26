import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

assert.equal((html.match(/function openReturningLogin\(\)/g) ?? []).length, 1);
assert.match(html, /window\.zenitOpenReturningLogin=openReturningLogin;/);
assert.match(html, /window\.zenitOpenExistingLogin=\(\)=>openReturningLogin\(\);/);
assert.match(html, /\.modal-backdrop \{ position: fixed; z-index: 110;/);
assert.doesNotMatch(html, /event\.stopImmediatePropagation\(\);openReturningLogin\(\);return;/);

console.log('✓ onboarding login wiring regression checks passed');

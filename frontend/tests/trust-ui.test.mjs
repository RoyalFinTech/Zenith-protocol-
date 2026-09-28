import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

assert.match(html, /function formatWalletAddress\(address\)/);
assert.match(html, /data-action="copy"/);
assert.match(html, /Copy full wallet address/);
assert.doesNotMatch(html, /wallet-address-value" title="\$\{esc\(appState\.wallet\.address\)\}">\$\{esc\(appState\.wallet\.address\)\}/);

assert.match(html, /class="username-input-prefix"[^>]*>@<\/span>/);
assert.match(html, /registrationUsername/);
assert.match(html, /replace\(\/\[\^a-z0-9_\]\/g,""\)/);

assert.match(html, /\/api\/packages\/catalog/);
assert.match(html, /Backend package catalog/);
assert.doesNotMatch(html, /packages\.starter\?\.price\?\?\(/);
assert.doesNotMatch(html, /\b20% direct referral, 70% matrix pool and 10% platform administration\b/);

assert.match(html, /leaderboard/);
assert.match(html, /settlement-flow/);
assert.match(html, /settlementFlowMarkup\(\)/);

assert.match(html, /aria-expanded="false" aria-controls="sidebar"/);
assert.match(html, /if\(e\.key==="Escape"&&window\.innerWidth<=820/);

assert.match(html, /data-action="compact-toggle"/);
assert.match(html, /data-action="activity-toggle"/);
assert.match(html, /data-action="motion-toggle"/);
assert.match(html, /data-density="compact"/);
assert.match(html, /data-reduced-motion="true"/);

console.log('✓ trust UI regression checks passed');

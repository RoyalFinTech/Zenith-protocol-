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
assert.doesNotMatch(html, /const starterPrice=p\.levels===4\?10:30/);
assert.match(html, /const starter=\(p\.packages\|\|\[\]\)\.find/);
assert.match(html, /matrix_distribution/);

assert.doesNotMatch(html, /\b20% direct referral, 70% matrix pool and 10% platform administration\b/);

assert.match(html, /leaderboard/);
assert.match(html, /settlement-flow/);
assert.match(html, /settlementFlowMarkup\(\)/);
assert.match(html, /src="\$\{ZENIT_LOGO\}"/);
assert.match(html, /dash-hero/);
assert.match(html, /dash-package-grid/);
assert.match(html, /dash-3d-scene/);
assert.match(html, /function wallet3DVisual\(\)/);
assert.match(html, /wallet-premium-hero/);
assert.match(html, /wallet-3d-stage/);

assert.match(html, /data-action="package-preview"/);
assert.match(html, /function withdrawalModal\(\)/);
assert.match(html, /data-action="withdraw-submit"/);
assert.doesNotMatch(html, /const amount=prompt\("Withdrawal amount in USDT"\)/);
assert.doesNotMatch(html, /const address=prompt\("Destination BNB Smart Chain address"\)/);

assert.match(html, /action==="package-preview"/);
assert.doesNotMatch(html, /images\.unsplash\.com/);


assert.match(html, /aria-expanded="false" aria-controls="sidebar"/);
assert.match(html, /document\.addEventListener\("click",async e=>\{/);
assert.match(html, /@media \(max-width:820px\)\s*\{\s*\.mobile-menu \{ display:grid; flex:0 0 auto; \}/);
assert.match(html, /if\(e\.key==="Escape"&&window\.innerWidth<=820/);

assert.match(html, /data-action="compact-toggle"/);
assert.match(html, /data-action="activity-toggle"/);
const staticActions = [...html.matchAll(/data-action="([a-z0-9-]+)"/g)].map(match => match[1]);
const handledActions = new Set([...html.matchAll(/action===["']([a-z0-9-]+)["']/g)].map(match => match[1]));
for (const action of staticActions) {
  assert.ok(handledActions.has(action), "No click handler branch found for data-action="+action);
}
assert.match(html, /data-action="motion-toggle"/);
assert.match(html, /data-density="compact"/);
assert.match(html, /data-reduced-motion="true"/);


const inlineScripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(match => !match[1].toLowerCase().includes("src="))
  .map(match => match[2])
  .filter(Boolean);

assert.ok(inlineScripts.length >= 3, "Expected the application inline scripts to be present");
for (const [index, script] of inlineScripts.entries()) {
  assert.doesNotThrow(() => new Function(script), "Inline frontend script "+index+" must parse");
}

const expectedBackendPaths = [
  "/config/public",
  "/api/dashboard/summary",
  "/api/dashboard/team",
  "/api/dashboard/matrix/2x4",
  "/api/dashboard/matrix/2x6",
  "/api/dashboard/leaderboard",
  "/api/dashboard/referrals",
  "/api/me",
  "/api/me/profile",
  "/api/me/notifications",
  "/api/me/notifications/read-all",
  "/api/me/preferences",
  "/api/me/push/subscriptions",
  "/api/packages/catalog",
  "/api/transactions",
  "/api/transactions/withdrawals"
];
for (const route of expectedBackendPaths) {
  assert.match(html, new RegExp(route.replaceAll("/", "\\/")), "Frontend must retain backend route "+route);
}

console.log('✓ trust UI regression checks passed');

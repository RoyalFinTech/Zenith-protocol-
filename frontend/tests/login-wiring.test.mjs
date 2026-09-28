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
const walletBridge = readFileSync(resolve(process.cwd(), 'src/wallet-bridge.ts'), 'utf8');
assert.match(html, /id="onboardExistingLogin"[^>]*data-action="existing-wallet-login"/);
assert.match(html, /if\(action==="existing-wallet-login"\)\{void openExistingWalletLogin\(\);return;\}/);
assert.doesNotMatch(html, /fetch\(api\s*\+\s*["']\/api\/auth\/webauthn/);
assert.match(html, /backendBase\(\)\+["']\/api\/auth\/webauthn\/login\/options/);
assert.match(html, /backendBase\(\)\+["']\/api\/auth\/webauthn\/login\/verify/);
assert.match(html, /requestAnimationFrame\(\(\)=>backdrop\.classList\.add\(["']open["']\)\)/);
assert.match(walletBridge, /open\(\{ view: ['"]Connect['"] \}\)/);
assert.match(walletBridge, /zenit:wallet-ready/);


assert.match(html, /params\.delete\("wallet_handoff"\);/);
assert.match(html, /params\.delete\("email_verified"\);/);
assert.match(html, /history\.replaceState\(\{\},'',location\.pathname/);
assert.match(html, /localStorage\.setItem\("zenitWalletHandoffToken",walletHandoff\)/);

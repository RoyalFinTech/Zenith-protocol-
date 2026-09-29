import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
assert.equal((html.match(/<style\b/gi) ?? []).length, 1);
assert.equal((html.match(/<\/style>/gi) ?? []).length, 1);
assert.match(html, /<div class="splash-logo"><img src="\/zenit-logo\.png\?zenit-official-20260928"/);
assert.match(html, /minimum=1800/);
assert.match(html, /maximum=4200/);
assert.match(html, /zenit:splash-ready/);
assert.doesNotMatch(html, /SPLASH_DURATION\s*=\s*8000/);
assert.doesNotMatch(html, /setTimeout\(releaseSplash/);
assert.match(html, /@media \(max-width:820px\)[\s\S]*?\.onboard-art \{\s*display:flex;/);

assert.equal((html.match(/function openReturningLogin\(\)/g) ?? []).length, 1);
assert.match(html, /window\.zenitOpenReturningLogin=openReturningLogin;/);
assert.match(html, /window\.zenitOpenExistingLogin=\(\)=>openReturningLogin\(\);/);
assert.match(html, /\.modal-backdrop \{ position: fixed; z-index: 110;/);
assert.doesNotMatch(html, /event\.stopImmediatePropagation\(\);openReturningLogin\(\);return;/);

console.log('✓ onboarding login wiring regression checks passed');
const walletBridge = readFileSync(resolve(process.cwd(), 'src/wallet-bridge.ts'), 'utf8');
assert.match(html, /id="onboardExistingLogin"[^>]*data-action="existing-wallet-login"/);
assert.match(html, /if\(action==="existing-wallet-login"\)\{localStorage\.setItem\("zenitAuthMode","existing"\);const openReturning=window\.zenitOpenReturningLogin/);
assert.doesNotMatch(html, /fetch\(api\s*\+\s*["']\/api\/auth\/webauthn/);
assert.match(html, /backendBase\(\)\+["']\/api\/auth\/webauthn\/login\/options/);
assert.match(html, /backendBase\(\)\+["']\/api\/auth\/webauthn\/login\/verify/);
assert.match(html, /requestAnimationFrame\(\(\)=>backdrop\.classList\.add\(["']open["']\)\)/);
assert.match(walletBridge, /await kit\.open\(\)/);
assert.match(walletBridge, /zenit:wallet-ready/);


assert.match(html, /params\.delete\("wallet_handoff"\);/);
assert.match(html, /params\.delete\("email_verified"\);/);
assert.match(html, /history\.replaceState\(\{\},'',location\.pathname/);
assert.match(html, /localStorage\.setItem\("zenitWalletHandoffToken",walletHandoff\)/);

assert.match(html, /grid-template-columns:1fr;\s*grid-template-rows:minmax\(250px,42dvh\)/);
assert.match(html, /@media \(max-width:820px\)/);
assert.match(html, /window\.__zenitAppReady=true/);
assert.match(html, /zenit:app-ready/);
assert.match(html, /maximum=3600/);
assert.match(walletBridge, /function setWalletButtonsBusy\(busy: boolean\)/);
assert.match(walletBridge, /await kit\.open\(\)/);
assert.doesNotMatch(walletBridge, /await \(appKit as any\)\.open\(\{ view: ['"]Connect['"] \}\)/);

console.log('✓ cross-device onboarding, splash, and wallet-open regression checks passed');

assert.match(html, /window\.zenitOpenReturningLogin=openReturningLogin/);
assert.match(html, /if\(typeof openReturning==="function"\)\{openReturning\(\);\}else\{toast\("Login is still loading"/);
assert.doesNotMatch(html, /async function openExistingWalletLogin\(\)\{/);
assert.match(html, /id="connectReturningWallet"/);
assert.match(html, /id="useBiometricLogin"/);
console.log('✓ returning-member gateway is centralized and biometric/wallet choices are wired');

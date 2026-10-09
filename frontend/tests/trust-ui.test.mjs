import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
const whatsappSvg = readFileSync(resolve(process.cwd(), 'public/whatsapp.svg'), 'utf8');
assert.match(whatsappSvg, /<path fill="#ffffff" d="/);
assert.match(whatsappSvg, /<title>WhatsApp<\/title>/);

assert.match(html, /function formatWalletAddress\(address\)/);
assert.match(html, /data-action="copy"/);
assert.match(html, /Copy full wallet address/);
assert.doesNotMatch(html, /wallet-address-value" title="\$\{esc\(appState\.wallet\.address\)\}">\$\{esc\(appState\.wallet\.address\)\}/);

assert.match(html, /class="username-input-prefix"[^>]*>@<\/span>/);
assert.match(html, /registrationUsername/);
assert.match(html, /registrationEmail/);
assert.match(html, /registrationWhatsapp/);
assert.match(html, /id="registrationWhatsappCountry"/);

const registrationSelectStart = html.indexOf('<select id="registrationWhatsappCountry"');
const registrationSelectEnd = html.indexOf('</select>', registrationSelectStart);
const registrationSelect = registrationSelectStart >= 0 && registrationSelectEnd > registrationSelectStart
  ? html.slice(registrationSelectStart, registrationSelectEnd)
  : "";
const staticCountryOptions = [...registrationSelect.matchAll(/<option value="[A-Z]{2}" data-dial="\d+"(?: selected)?>([^<]+)<\/option>/g)];
assert.ok(staticCountryOptions.length >= 200, "Registration picker must render a broad country list before runtime initialization");
assert.match(registrationSelect, /<option value="PK" data-dial="92" selected>Pakistan \(\+92\)<\/option>/);
assert.match(html, /select\.addEventListener\("change", sync\)/);
assert.match(html, /Pakistan \(\+92\)/);
assert.match(html, /placeholder="3XX XXXXXXX"/);
assert.doesNotMatch(html, /placeholder="\+220/);
assert.match(html, /function whatsappCountryOptions\(selected="PK"\)/);
const whatsappOptionsLine = html.slice(html.indexOf("function whatsappCountryOptions"), html.indexOf("function setWhatsAppPicker"));
assert.ok(whatsappOptionsLine.includes('return WHATSAPP_COUNTRIES.map(c=>`<option value="${c.iso}"${c.iso===selected?" selected":""}>${c.name} (+${c.dial})</option>`).join("");'), "Country options must be emitted as valid HTML with correct selected attributes");
assert.doesNotMatch(whatsappOptionsLine, /selected\?"selected":""\)\+['"]>/, "Country option selected attribute must be emitted as valid HTML");
assert.match(html, /function countryFlagUrl\(iso\)/);
assert.match(html, /https:\/\/flagcdn\.com\/w40\/pk\.png/);
const countryBlockStart = html.indexOf("const WHATSAPP_COUNTRIES = [");
const countryBlockEnd = html.indexOf("].map(([iso,name,dial])=>", countryBlockStart);
const countryBlock = countryBlockStart >= 0 && countryBlockEnd > countryBlockStart ? html.slice(countryBlockStart, countryBlockEnd) : "";
assert.ok((countryBlock.match(/\["[A-Z]{2}"/g) ?? []).length >= 200, "WhatsApp country picker must retain a broad country list");
assert.match(html, /function bindWhatsAppPicker\(/);
assert.match(html, /registrationWhatsappUpdates/);
assert.match(html, /WhatsApp number <em class="muted">\(optional\)<\/em>/);
assert.match(html, /showRegistrationWhatsAppReminder/);
assert.match(html, /Continue without WhatsApp/);
assert.match(html, /An unregistered number cannot be used to reset your PIN/);
assert.match(html, /class="whatsapp-glyph"/);
assert.match(html, /<path fill="currentColor" d="/);
assert.match(html, /id="whatsappPickerFallback"/);
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
assert.match(html, /images\.unsplash\.com\/photo-1762341121210-6bd877d766b0/);
assert.match(html, /images\.unsplash\.com\/photo-1494790108377-be9c29b29330/);
assert.match(html, /images\.unsplash\.com\/photo-1551288049-bebda4e38f71/);
assert.match(html, /images\.unsplash\.com\/photo-1556761175-b413da4baf72/);
assert.match(html, /images\.unsplash\.com\/photo-1556761175-4b46a572b786/);
assert.ok(html.includes('const hasSession=Boolean(localStorage.getItem("zenitToken"))'));
assert.ok(html.includes('fetch(`${backendBase()}/api/me`'));
assert.doesNotMatch(html, /response\.getPublicKey\?\(\)/);
assert.doesNotMatch(html, /showVerificationSentModal/);
assert.doesNotMatch(html, /modalVerificationTimer/);
assert.doesNotMatch(html, /api\/auth\/register\/resend/);
assert.match(html, /FORGOT PIN \/ ACCESS HELP/);
assert.match(html, /api\/auth\/pin\/reset\/request/);
assert.match(html, /api\/auth\/pin\/reset\/verify/);
assert.doesNotMatch(html, /SEND VERIFICATION EMAIL/);
assert.match(html, /function internationalWhatsAppValid\(value\)/);
assert.doesNotMatch(html, /EMAIL VERIFICATION/);
assert.doesNotMatch(html, /email_verified/);
assert.doesNotMatch(html, /email_verification/);
assert.doesNotMatch(html, /zenitPendingRegistrationDraft",JSON\.stringify\(\{[^}]*pin/);
assert.ok(html.includes('pubKeyCredParams:[{type:"public-key",alg:-7}]'));


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
  "/api/auth/register/request",
  "/api/auth/pin/reset/request",
  "/api/auth/pin/reset/verify",
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

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
const walletBridgeSource = readFileSync(path.join(frontendDir, 'src', 'wallet-bridge.ts'), 'utf8');

const connectedWalletResumeContract = [
  'let appHandoffComplete = false;',
  'function hasAppKitConnection()',
  'async function tryExistingWalletLogin()',
  'let existing = await waitForConnectedAccount(1800);',
  'if (appHandoffComplete) return true;',
  '(window as any).zenitTryExistingWalletLogin = () => tryExistingWalletLogin();'
];
const missingWalletResumeContract = connectedWalletResumeContract.filter(fragment => !walletBridgeSource.includes(fragment));
if (missingWalletResumeContract.length > 0) {
  throw new Error(`Connected-wallet login contract failed: missing ${missingWalletResumeContract.join(', ')}`);
}
if (/if \(account\?\.isConnected && account\.address\) break;/.test(walletBridgeSource)) {
  throw new Error('Connected-wallet login contract failed: wallet connection must not short-circuit authentication/dashboard handoff');
}
const returningLoginUiContract = [
  'id="returningLoginStatus"',
  'Checking whether your wallet is already connected',
  'without reopening the wallet selector',
  'RETRY WALLET SIGN-IN'
];
const missingReturningLoginUi = returningLoginUiContract.filter(fragment => !indexHtml.includes(fragment));
if (missingReturningLoginUi.length > 0) {
  throw new Error(`Returning-login UI contract failed: missing ${missingReturningLoginUi.join(', ')}`);
}

// The Render service's rootDir is backend, but this build intentionally bundles the
// sibling frontend directory. Guard that the registration WhatsApp country picker
// contract is present before publishing the bundled HTML; otherwise a stale or
// partially updated selector can ship as a one-option Pakistan fallback.
const countryDataStart = indexHtml.indexOf('const WHATSAPP_COUNTRIES = [');
const countryDataEnd = indexHtml.indexOf('].map(([iso,name,dial])=>', countryDataStart);
const countryCount = countryDataStart >= 0 && countryDataEnd > countryDataStart
  ? (indexHtml.slice(countryDataStart, countryDataEnd).match(/\["[A-Z]{2}"/g) ?? []).length
  : 0;
const pickerFunctionIndex = indexHtml.indexOf('function bindWhatsAppPicker(');
const registrationBindingIndex = indexHtml.indexOf('bindWhatsAppPicker("#registrationWhatsappCountry"');

const registrationSelectStart = indexHtml.indexOf('<select id="registrationWhatsappCountry"');
const registrationSelectEnd = indexHtml.indexOf('</select>', registrationSelectStart);
const registrationSelectHtml = registrationSelectStart >= 0 && registrationSelectEnd > registrationSelectStart
  ? indexHtml.slice(registrationSelectStart, registrationSelectEnd)
  : '';
const staticOptionCount = (registrationSelectHtml.match(/<option value="[A-Z]{2}" data-dial="\d+"/g) ?? []).length;
if (countryCount < 200) {
  throw new Error(`Frontend country picker contract failed: expected at least 200 countries, found ${countryCount}`);
}
if (staticOptionCount < 200) {
  throw new Error(`Frontend country picker contract failed: expected at least 200 static registration options, found ${staticOptionCount}`);
}
if (!indexHtml.includes('id="whatsappPickerFallback"') || !indexHtml.includes('class="whatsapp-glyph"') || !indexHtml.includes('<path fill="currentColor" d="')) {
  throw new Error('Frontend country picker contract failed: resilient inline picker or WhatsApp glyph is missing');
}
if (pickerFunctionIndex < 0 || registrationBindingIndex <= pickerFunctionIndex) {
  throw new Error('Frontend country picker contract failed: registration binding must follow picker initialization helpers');
}
if (!indexHtml.includes('function countryFlagUrl(iso)') || !indexHtml.includes('https://flagcdn.com/w40/pk.png')) {
  throw new Error('Frontend country picker contract failed: image-based country flag rendering is missing');
}

const registrationHandoffContract = [
  '<form id="registrationForm" novalidate>',
  '<button type="submit" class="btn primary registration-submit" id="registrationSubmit" data-action="registration-submit">',
  'getElementById("registrationForm")?.addEventListener("submit",event=>{',
  '<button type="button" class="btn primary registration-submit" data-action="registration-wallet">',
  'const openWallet=window.zenitOpenWallet;if(typeof openWallet!=="function")'
];
const missingRegistrationHandoffContract = registrationHandoffContract.filter(fragment => !indexHtml.includes(fragment));
if (missingRegistrationHandoffContract.length > 0) {
  throw new Error(`Frontend registration-to-wallet handoff contract failed: missing ${missingRegistrationHandoffContract.join(', ')}`);
}
if (/showRegistrationWhatsAppReminder|registrationWhatsappReminderShown/.test(indexHtml)) {
  throw new Error('Frontend registration-to-wallet handoff contract failed: optional WhatsApp reminder must not block submission');
}
const optionalAuthContract = [
  'id="skipOptionalPin"',
  'id="skipBiometric"',
  'data-action="enable-biometric"',
  'data-action="profile-pin-save"',
  'id="profilePinConfirm"',
  '/api/auth/pin/change',
  'window.zenitEnrollBiometric=async',
  'PIN and device passkeys are optional sign-in options'
];
const missingOptionalAuthContract = optionalAuthContract.filter(fragment => !indexHtml.includes(fragment));
if (missingOptionalAuthContract.length > 0) {
  throw new Error(`Frontend wallet-auth contract failed: missing ${missingOptionalAuthContract.join(', ')}`);
}
const bundledWhatsAppSvg = readFileSync(path.join(frontendDist, 'whatsapp.svg'), 'utf8');
if (!bundledWhatsAppSvg.includes('<title>WhatsApp</title>') || !bundledWhatsAppSvg.includes('<path fill="#ffffff" d="')) {
  throw new Error('Frontend country picker contract failed: official WhatsApp glyph asset is missing or malformed');
}
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

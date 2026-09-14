import { createAppKit } from '@reown/appkit';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { bsc } from '@reown/appkit/networks';
import { getAccount, signMessage, watchAccount, disconnect as wagmiDisconnect } from '@wagmi/core';

const API = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const PROJECT_ID = import.meta.env.VITE_REOWN_PROJECT_ID || '';
let appKit: ReturnType<typeof createAppKit> | null = null;
let adapter: WagmiAdapter | null = null;
let authToken = localStorage.getItem('zenitToken') || '';

async function loadPublicConfig() {
  const base = API || window.location.origin;
  const response = await fetch(`${base}/config/public`, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error('Unable to load wallet configuration');
  return response.json() as Promise<{ walletConnectProjectId: string; metadata: { name: string; description: string; url: string; icons: string[] } }>;
}

async function init() {
  const cfg = await loadPublicConfig().catch(() => null);
  const projectId = PROJECT_ID || cfg?.walletConnectProjectId || '';
  if (!projectId) throw new Error('Reown project ID is not configured');
  const metadata = cfg?.metadata || { name: 'Zenit Protocol', description: 'Decentralized Wealth Network', url: window.location.origin, icons: [] };
  adapter = new WagmiAdapter({ projectId, networks: [bsc] });
  appKit = createAppKit({ adapters: [adapter], projectId, networks: [bsc], defaultNetwork: bsc, themeMode: 'dark', metadata, features: { analytics: false, email: false, socials: false } } as any);
  window.addEventListener('zenit:wallet-select', () => appKit?.open());
}

async function authenticate(address: `0x${string}`) {
  const base = API || window.location.origin;
  const nonceR = await fetch(`${base}/api/auth/nonce`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address }) });
  if (!nonceR.ok) throw new Error('Unable to create wallet challenge');
  const { nonce, message } = await nonceR.json() as { nonce: string; message: string };
  if (!adapter) throw new Error('Wallet adapter unavailable');
  const signature = await signMessage(adapter.wagmiConfig, { message });
  const verifyR = await fetch(`${base}/api/auth/verify`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address, nonce, signature }) });
  const data = await verifyR.json().catch(() => ({}));
  if (!verifyR.ok) throw new Error(data.error || 'Wallet authentication failed');
  authToken = data.token;
  localStorage.setItem('zenitToken', authToken);
  window.dispatchEvent(new CustomEvent('zenit:authenticated', { detail: data.user }));
  (window as any).zenitSetWallet?.(true, address);
  await (window as any).zenitLoadBackend?.(authToken);
}

function setupWatchers() {
  if (!adapter) return;
  let lastAddress = '';
  const unsubscribe = watchAccount(adapter.wagmiConfig, { onChange: (account) => {
    if (account.isConnected && account.address && account.address !== lastAddress) {
      lastAddress = account.address;
      authenticate(account.address).catch((error) => (window as any).zenitToast?.('Wallet authentication failed', error instanceof Error ? error.message : String(error), 'error'));
    }
    if (!account.isConnected) {
      authToken = '';
      localStorage.removeItem('zenitToken');
      (window as any).zenitSetWallet?.(false, 'Not connected');
    }
  }});
  window.addEventListener('beforeunload', () => unsubscribe());
}

async function openWallet() { if (!appKit) { await init(); setupWatchers(); } appKit?.open(); }

async function disconnect() {
  const base = API || window.location.origin;
  if (authToken) await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${authToken}` } }).catch(() => undefined);
  if (adapter) await wagmiDisconnect(adapter.wagmiConfig).catch(() => undefined);
  authToken = '';
  localStorage.removeItem('zenitToken');
  (window as any).zenitSetWallet?.(false, 'Not connected');
}

(window as any).zenitAuthFetch = (input: string, init: RequestInit = {}) => fetch(input, { ...init, headers: { ...(init.headers || {}), ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) } });
window.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-action="wallet"]') || target.closest('[data-wallet-select]')) { event.preventDefault(); event.stopImmediatePropagation(); openWallet().catch((e) => (window as any).zenitToast?.('Wallet unavailable', e instanceof Error ? e.message : String(e), 'error')); }
    if (target.closest('[data-action="disconnect"]')) { event.preventDefault(); event.stopImmediatePropagation(); disconnect().catch((e) => console.error(e)); }
  }, true);
  init().then(() => { setupWatchers(); const token = localStorage.getItem('zenitToken'); if (token) (window as any).zenitLoadBackend?.(token); }).catch((e) => console.warn('Wallet initialization deferred:', e));
});

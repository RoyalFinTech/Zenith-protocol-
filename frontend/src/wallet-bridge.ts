import { createAppKit } from '@reown/appkit';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { bsc } from '@reown/appkit/networks';
import { getAccount, signMessage, watchAccount } from '@wagmi/core';

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

async function init() {
  const cfg = await loadPublicConfig().catch(() => null);
  const projectId = PROJECT_ID || cfg?.walletConnectProjectId || '';
  if (!projectId) throw new Error('Reown project ID is not configured');
  const metadata = cfg?.metadata || { name: 'Zenit Protocol', description: 'Decentralized Wealth Network', url: window.location.origin, icons: [] };
  adapter = new WagmiAdapter({ projectId, networks: [bsc] });
  appKit = createAppKit({ adapters: [adapter], projectId, networks: [bsc], defaultNetwork: bsc, themeMode: 'dark', metadata, features: { analytics: false, email: false, socials: false } } as any);
  watchAccount(adapter.wagmiConfig, (account) => {
    if (account.isConnected && account.address) {
      authenticate(account.address).catch((error) => (window as any).zenitToast?.('Wallet authentication failed', error instanceof Error ? error.message : String(error), 'error'));
    } else {
      authToken = '';
      localStorage.removeItem('zenitToken');
      (window as any).zenitSetWallet?.(false, 'Not connected');
    }
  });
}

async function openWallet() {
  if (!appKit) await init();
  if (!appKit) throw new Error('WalletConnect project ID is not configured');
  appKit.open();
}

async function disconnectWallet() {
  try {
    const base = API || window.location.origin;
    if (authToken) await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${authToken}` } });
    if (adapter) await import('@wagmi/core').then(({ disconnect }) => disconnect(adapter!.wagmiConfig));
  } finally {
    authToken = '';
    localStorage.removeItem('zenitToken');
    (window as any).zenitSetWallet?.(false, 'Not connected');
  }
}

function interceptWalletClicks() {
  document.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-action="wallet"], [data-wallet-select]')) {
      event.preventDefault(); event.stopImmediatePropagation();
      try { await openWallet(); } catch (error) { (window as any).zenitToast?.('Wallet connection unavailable', error instanceof Error ? error.message : String(error), 'error'); }
    }
    if (target.closest('[data-action="disconnect"]')) {
      event.preventDefault(); event.stopImmediatePropagation();
      await disconnectWallet();
    }
  }, true);
}

(window as any).zenitAuthFetch = (input: string, initReq: RequestInit = {}) => fetch(input, { ...initReq, headers: { ...(initReq.headers || {}), ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) } });
window.addEventListener('DOMContentLoaded', () => { interceptWalletClicks(); init().catch(console.error); });

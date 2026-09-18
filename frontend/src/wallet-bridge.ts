import { createAppKit } from '@reown/appkit';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { bsc } from '@reown/appkit/networks';
import { getAccount, signMessage, watchAccount, disconnect as wagmiDisconnect } from '@wagmi/core';

const API = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const PROJECT_ID = import.meta.env.VITE_REOWN_PROJECT_ID || '';
const BSC_CHAIN_ID = 56;

let appKit: ReturnType<typeof createAppKit> | null = null;
let adapter: WagmiAdapter | null = null;
let authToken = localStorage.getItem('zenitToken') || '';
let stopWatching: (() => void) | null = null;
let initPromise: Promise<void> | null = null;
let lastAddress = '';
let authInFlightAddress = '';

async function loadPublicConfig() {
  const base = API || window.location.origin;
  const response = await fetch(`${base}/config/public`, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error('Unable to load wallet configuration');
  return response.json() as Promise<{
    chainId: number;
    walletConnectProjectId: string;
    metadata: { name: string; description: string; url: string; icons: string[] };
  }>;
}

async function init() {
  if (appKit && adapter) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const cfg = await loadPublicConfig().catch(() => null);
    const projectId = PROJECT_ID || cfg?.walletConnectProjectId || '';
    if (!projectId) throw new Error('Reown project ID is not configured');

    const metadata = cfg?.metadata || {
      name: 'Zenit Protocol',
      description: 'Decentralized Wealth Network',
      url: window.location.origin,
      icons: []
    };

    adapter = new WagmiAdapter({ projectId, networks: [bsc] });
    appKit = createAppKit({
      adapters: [adapter],
      projectId,
      networks: [bsc],
      defaultNetwork: bsc,
      themeMode: 'dark',
      metadata,
      features: { analytics: false, email: false, socials: false }
    } as any);

    // AppKit is the authoritative source for wallet connection state.
    // This is important on mobile because WalletConnect can finish the
    // connection after the browser returns from the wallet app.
    appKit.subscribeAccount((state: any) => {
      const address = state?.address as string | undefined;
      const chainId = state?.chainId == null ? undefined : Number(state.chainId);

      if (!state?.isConnected || !address) {
        if (authToken || lastAddress) clearLocalSession();
        (window as any).zenitSetWallet?.(false, 'Not connected');
        return;
      }

      if (chainId && chainId !== BSC_CHAIN_ID) {
        (window as any).zenitSetWallet?.(false, 'Wrong network');
        (window as any).zenitToast?.(
          'Wrong network',
          'Please switch your wallet to BNB Smart Chain (BSC) before authenticating.',
          'warning'
        );
        return;
      }

      if (address.toLowerCase() === lastAddress.toLowerCase() && authToken) {
        (window as any).zenitSetWallet?.(true, address);
        return;
      }

      if (authInFlightAddress.toLowerCase() === address.toLowerCase()) return;
      authInFlightAddress = address;
      void (async () => {
        try {
          const typedAddress = address as `0x${string}`;
          if (await restoreSession(typedAddress)) return;
          await authenticate(typedAddress);
        } catch (error) {
          (window as any).zenitSetWallet?.(false, 'Not connected');
          (window as any).zenitToast?.(
            'Wallet authentication failed',
            error instanceof Error ? error.message : String(error),
            'error'
          );
        } finally {
          authInFlightAddress = '';
        }
      })();
    });

    window.addEventListener('zenit:wallet-select', () => appKit?.open());
  })();

  try {
    await initPromise;
  } catch (error) {
    initPromise = null;
    throw error;
  }
}

function clearLocalSession() {
  authToken = '';
  lastAddress = '';
  localStorage.removeItem('zenitToken');
}

async function restoreSession(address: `0x${string}`) {
  if (!authToken) return false;

  const base = API || window.location.origin;
  try {
    const response = await fetch(`${base}/api/me`, {
      headers: { Authorization: `Bearer ${authToken}`, accept: 'application/json' }
    });
    if (!response.ok) {
      clearLocalSession();
      return false;
    }

    const data = await response.json() as { user?: { wallet_address?: string } };
    if (data.user?.wallet_address?.toLowerCase() !== address.toLowerCase()) {
      clearLocalSession();
      return false;
    }

    lastAddress = address;
    (window as any).zenitSetWallet?.(true, address);
    await (window as any).zenitLoadBackend?.(authToken);
    return true;
  } catch {
    return false;
  }
}

async function authenticate(address: `0x${string}`) {
  const base = API || window.location.origin;
  const nonceR = await fetch(`${base}/api/auth/nonce`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ address })
  });
  if (!nonceR.ok) throw new Error('Unable to create wallet challenge');

  const { nonce, message } = await nonceR.json() as { nonce: string; message: string };
  if (!adapter) throw new Error('Wallet adapter unavailable');

  const signature = await signMessage(adapter.wagmiConfig, { message });

  const verifyR = await fetch(`${base}/api/auth/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ address, nonce, signature })
  });
  const data = await verifyR.json().catch(() => ({})) as { token?: string; user?: unknown; error?: string };
  if (!verifyR.ok || !data.token) throw new Error(data.error || 'Wallet authentication failed');

  authToken = data.token;
  localStorage.setItem('zenitToken', authToken);

  const bindR = await fetch(`${base}/api/wallets/bind`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({ address })
  });
  if (!bindR.ok) {
    const bindData = await bindR.json().catch(() => ({})) as { error?: string };
    clearLocalSession();
    throw new Error(bindData.error || 'Unable to save connected wallet');
  }

  lastAddress = address;
  (window as any).zenitSetWallet?.(true, address);
  window.dispatchEvent(new CustomEvent('zenit:authenticated', { detail: data.user }));
  await (window as any).zenitLoadBackend?.(authToken);
}

async function syncCurrentAccount() {
  if (!adapter) return;

  const account = getAccount(adapter.wagmiConfig);
  if (!account.isConnected || !account.address) {
    if (authToken || lastAddress) clearLocalSession();
    (window as any).zenitSetWallet?.(false, 'Not connected');
    return;
  }

  if (account.chainId && Number(account.chainId) !== BSC_CHAIN_ID) {
    (window as any).zenitSetWallet?.(false, 'Wrong network');
    (window as any).zenitToast?.(
      'Wrong network',
      'Please switch your wallet to BNB Smart Chain (BSC) before authenticating.',
      'warning'
    );
    return;
  }

  if (account.address === lastAddress && authToken) {
    (window as any).zenitSetWallet?.(true, account.address);
    return;
  }

  if (await restoreSession(account.address)) return;

  try {
    await authenticate(account.address);
  } catch (error) {
    (window as any).zenitToast?.(
      'Wallet authentication failed',
      error instanceof Error ? error.message : String(error),
      'error'
    );
  }
}

function setupWatchers() {
  if (!adapter || stopWatching) return;

  stopWatching = watchAccount(adapter.wagmiConfig, {
    onChange: (account) => {
      if (account.isConnected && account.address) {
        if (account.chainId && Number(account.chainId) !== BSC_CHAIN_ID) {
          (window as any).zenitSetWallet?.(false, 'Wrong network');
          (window as any).zenitToast?.(
            'Wrong network',
            'Please switch your wallet to BNB Smart Chain (BSC).',
            'warning'
          );
          return;
        }
        if (account.address !== lastAddress || !authToken) {
          syncCurrentAccount().catch((error) =>
            (window as any).zenitToast?.(
              'Wallet sync failed',
              error instanceof Error ? error.message : String(error),
              'error'
            )
          );
        } else {
          (window as any).zenitSetWallet?.(true, account.address);
        }
      } else {
        clearLocalSession();
        (window as any).zenitSetWallet?.(false, 'Not connected');
      }
    }
  });

  void syncCurrentAccount();
}

async function openWallet() {
  await init();
  setupWatchers();
  appKit?.open();

  // Mobile wallets often return to the browser after the AppKit connection
  // is completed. Poll briefly here as a fallback to the wagmi watcher so
  // the ZENIT UI is updated even when the provider emits its event late.
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 500));
    await syncCurrentAccount();
    const account = adapter ? getAccount(adapter.wagmiConfig) : null;
    if (account?.isConnected && account.address && authToken) break;
  }
}

async function disconnect() {
  const base = API || window.location.origin;

  if (authToken) {
    await fetch(`${base}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    }).catch(() => undefined);
  }

  if (appKit && typeof (appKit as any).disconnect === 'function') {
    await (appKit as any).disconnect().catch(() => undefined);
  }
  if (adapter) {
    await wagmiDisconnect(adapter.wagmiConfig).catch(() => undefined);
  }

  clearLocalSession();
  authInFlightAddress = '';
  (window as any).zenitSetWallet?.(false, 'Not connected');
  (window as any).zenitLoadBackend?.('').catch?.(() => undefined);
}

(window as any).zenitOpenWallet = () => openWallet();
(window as any).zenitDisconnectWallet = () => disconnect();

(window as any).zenitAuthFetch = (input: string, init: RequestInit = {}) =>
  fetch(input, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    }
  });

window.addEventListener('focus', () => {
  if (adapter) syncCurrentAccount().catch(() => undefined);
});
window.addEventListener('pageshow', () => {
  if (adapter) syncCurrentAccount().catch(() => undefined);
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && adapter) syncCurrentAccount().catch(() => undefined);
});

window.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;

    if (target.closest('[data-action="wallet"]') || target.closest('[data-wallet-select]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openWallet().catch((error) =>
        (window as any).zenitToast?.(
          'Wallet unavailable',
          error instanceof Error ? error.message : String(error),
          'error'
        )
      );
    }

    if (target.closest('[data-action="disconnect"]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      disconnect().catch((error) => console.error(error));
    }
  }, true);

  init()
    .then(() => setupWatchers())
    .catch((error) => console.warn('Wallet initialization deferred:', error));
});

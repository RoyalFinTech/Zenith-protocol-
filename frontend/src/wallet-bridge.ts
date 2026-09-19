import { createAppKit } from '@reown/appkit';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { bsc } from '@reown/appkit/networks';
import { getAccount, signMessage, writeContract, waitForTransactionReceipt } from '@wagmi/core';
import { erc20Abi, parseUnits } from 'viem';

const API = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const PROJECT_ID = import.meta.env.VITE_REOWN_PROJECT_ID || '';
const BSC_CHAIN_ID = 56;

let appKit: ReturnType<typeof createAppKit> | null = null;
let adapter: WagmiAdapter | null = null;
let authToken = localStorage.getItem('zenitToken') || '';
let initPromise: Promise<void> | null = null;
let lastAddress = '';
let authInFlightAddress = '';
let purchaseInFlight = false;
let syncInFlight: Promise<void> | null = null;
let authRetryAt = 0;

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

    adapter = new WagmiAdapter({ projectId, networks: [bsc], enableReconnect: true } as any);
    appKit = createAppKit({
      adapters: [adapter],
      projectId,
      networks: [bsc],
      defaultNetwork: bsc,
      themeMode: 'dark',
      enableWalletGuide: false,
      metadata,
      features: { analytics: false, email: false, socials: false, connectMethodsOrder: ['wallet'] }
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

      // The provider connection is real even while backend authentication is
      // completing. Reflect it immediately so the UI never falls back to
      // "Connect wallet" merely because the API is slow or temporarily busy.
      (window as any).zenitSetWallet?.(true, address);
      syncCurrentAccount().catch(() => undefined);
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

function connectorIsReady(account: ReturnType<typeof getAccount>) {
  const connector = (account as any)?.connector;
  return Boolean(account?.isConnected && account?.address && connector && typeof connector.getChainId === 'function');
}

async function waitForConnectorReady(address: string, timeoutMs = 6000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (!adapter) return false;
    const account = getAccount(adapter.wagmiConfig);
    if (
      account.isConnected &&
      account.address &&
      account.address.toLowerCase() === address.toLowerCase() &&
      connectorIsReady(account)
    ) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return false;
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
  const connectorReady = await waitForConnectorReady(address);
  if (!connectorReady) throw new Error('Wallet provider is still initializing; please try again');

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
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    const account = getAccount(adapter!.wagmiConfig);

    if (!account.isConnected || !account.address) {
      if (authToken || lastAddress) clearLocalSession();
      (window as any).zenitSetWallet?.(false, 'Not connected');
      return;
    }

    if (account.chainId && Number(account.chainId) !== BSC_CHAIN_ID) {
      (window as any).zenitSetWallet?.(false, 'Wrong network');
      return;
    }

    // AppKit may report the address a moment before Wagmi has a usable
    // connector object, especially when returning from MetaMask mobile.
    // Never call signMessage/writeContract during that gap: Wagmi will throw
    // "connector.getChainId is not a function".
    (window as any).zenitSetWallet?.(true, account.address);
    const ready = await waitForConnectorReady(account.address);
    if (!ready) {
      (window as any).zenitToast?.(
        'Wallet connection is syncing',
        'The wallet is connected, but its provider is still initializing. Please wait a moment.',
        'info'
      );
      return;
    }

    const readyAccount = getAccount(adapter!.wagmiConfig);
    if (!readyAccount.isConnected || !readyAccount.address) {
      (window as any).zenitSetWallet?.(false, 'Not connected');
      return;
    }
    if (readyAccount.chainId && Number(readyAccount.chainId) !== BSC_CHAIN_ID) {
      (window as any).zenitSetWallet?.(false, 'Wrong network');
      return;
    }

    (window as any).zenitSetWallet?.(true, readyAccount.address);

    if (readyAccount.address === lastAddress && authToken) return;
    if (Date.now() < authRetryAt) return;

    if (await restoreSession(readyAccount.address)) {
      authRetryAt = 0;
      return;
    }

    try {
      await authenticate(readyAccount.address);
      authRetryAt = 0;
    } catch (error) {
      // Do not turn a real provider connection into a fake "disconnected"
      // state when backend authentication is temporarily unavailable.
      const now = Date.now();
      authRetryAt = Math.min(
        Math.max(authRetryAt || now, now) + 15000,
        now + 60000
      );
      (window as any).zenitToast?.(
        'Wallet authentication pending',
        error instanceof Error ? error.message : String(error),
        'warning'
      );
      (window as any).zenitSetWallet?.(true, readyAccount.address);
    }
  })().finally(() => { syncInFlight = null; });

  return syncInFlight;
}

function setupWatchers() {
  // AppKit's account subscription is the single wallet-state authority.
  // A second wagmi watchAccount listener caused duplicate mobile sync/auth
  // attempts and could race AppKit while its connector was still initializing.
  void syncCurrentAccount();
}

async function openWallet() {
  await init();
  setupWatchers();
  appKit?.open({ view: 'Connect' } as any);

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
  const token = authToken;

  // Reset ZENIT immediately. A mobile wallet/relay disconnect call can hang
  // when there is no active WalletConnect session. The UI must never wait for it.
  clearLocalSession();
  authInFlightAddress = '';
  authRetryAt = 0;
  (window as any).zenitSetWallet?.(false, 'Not connected');
  (window as any).zenitLoadBackend?.('').catch?.(() => undefined);

  // Best-effort backend logout; never block the wallet UI on the API.
  if (token) {
    void fetch(`${base}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => undefined);
  }

  // Best-effort AppKit disconnect. If there is no WalletConnect session,
  // AppKit has nothing to terminate; ZENIT is already safely disconnected.
  if (appKit && typeof (appKit as any).disconnect === 'function') {
    const disconnectPromise = Promise.resolve()
      .then(() => (appKit as any).disconnect())
      .catch(() => undefined);

    await Promise.race([
      disconnectPromise,
      new Promise(resolve => setTimeout(resolve, 2500))
    ]);
  }

  try {
    (appKit as any)?.close?.();
  } catch {
    // Modal cleanup must not affect the disconnected application state.
  }

  (window as any).zenitToast?.(
    'Wallet disconnected',
    'ZENIT wallet state has been cleared.',
    'info'
  );
}


async function buyPackage(packageCode: string, referralCode = '') {
  if (purchaseInFlight) throw new Error('A package payment is already in progress');
  purchaseInFlight = true;
  try {
    await init();
    setupWatchers();
    if (!adapter) throw new Error('Wallet adapter unavailable');

    let account = getAccount(adapter.wagmiConfig);
    if (!account.isConnected || !account.address) {
      await openWallet();
      account = getAccount(adapter.wagmiConfig);
    }
    if (!account.isConnected || !account.address) throw new Error('Connect your wallet before purchasing a package');
    if (!account.chainId || Number(account.chainId) !== BSC_CHAIN_ID) throw new Error('Switch your wallet to BNB Smart Chain');
    if (!(await waitForConnectorReady(account.address))) throw new Error('Wallet provider is still initializing; please try again');

    if (!authToken) await authenticate(account.address);
    if (!authToken) throw new Error('Wallet authentication is required');

    const base = API || window.location.origin;
    const quoteR = await fetch(`${base}/api/packages/purchases`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ packageCode, referralCode: referralCode || undefined })
    });
    const quoteData = await quoteR.json().catch(() => ({})) as {
      purchase?: { id:string; amount:string; token:`0x${string}`; receiver:`0x${string}`; decimals:number };
      error?: string;
    };
    if (!quoteR.ok || !quoteData.purchase) throw new Error(quoteData.error || 'Unable to prepare package payment');

    const purchase = quoteData.purchase;
    (window as any).zenitToast?.('Payment ready', `Confirm ${purchase.amount} USDT in your wallet.`, 'info');

    const hash = await writeContract(adapter.wagmiConfig, {
      account: account.address,
      address: purchase.token,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [purchase.receiver, parseUnits(purchase.amount, purchase.decimals)],
      chainId: BSC_CHAIN_ID
    });

    (window as any).zenitToast?.('Payment submitted', 'Waiting for BNB Smart Chain confirmation.', 'info');
    await waitForTransactionReceipt(adapter.wagmiConfig, { hash, chainId: BSC_CHAIN_ID, confirmations: 2 });

    const confirmR = await fetch(`${base}/api/packages/purchases/${purchase.id}/confirm`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ txHash: hash })
    });
    const confirmData = await confirmR.json().catch(() => ({})) as { status?:string; purchase?:unknown; error?:string };
    if (!confirmR.ok) throw new Error(confirmData.error || 'Payment was not accepted by the settlement verifier');

    await (window as any).zenitLoadBackend?.(authToken);
    (window as any).zenitToast?.('Package activated', 'Payment verified and your matrix position is now active.', 'success');
    return confirmData;
  } finally {
    purchaseInFlight = false;
  }
}

(window as any).zenitBuyPackage = (packageCode: string, referralCode = '') => buyPackage(packageCode, referralCode);

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

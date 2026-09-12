import { createAppKit } from '@reown/appkit';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { bsc } from '@reown/appkit/networks';
import { getAccount, watchAccount, signMessage } from '@wagmi/core';

const API = import.meta.env.VITE_API_BASE_URL || '/api';
const PROJECT_ID = import.meta.env.VITE_REOWN_PROJECT_ID || '';

let appKit: ReturnType<typeof createAppKit> | null = null;
let adapter: WagmiAdapter | null = null;
let authToken = localStorage.getItem('zenitToken') || '';

async function publicConfig(){
  const r=await fetch(`${API.replace(/\/api$/,'')}/config/public`);
  if(!r.ok) throw new Error('Unable to load wallet configuration');
  return r.json() as Promise<{chainId:number;chainName:string;primaryAsset:string;appOrigin:string;walletConnectProjectId:string;metadata:{name:string;description:string;url:string;icons:string[]}}>;
}

async function init(){
  const cfg=await publicConfig().catch(()=>null);
  const projectId=PROJECT_ID || cfg?.walletConnectProjectId || '';
  if(!projectId) return;
  const metadata=cfg?.metadata || {name:'Zenit Protocol',description:'Decentralized Wealth Network',url:window.location.origin,icons:[]};
  adapter=new WagmiAdapter({projectId,networks:[bsc]});
  appKit=createAppKit({adapters:[adapter],projectId,networks:[bsc],defaultNetwork:bsc,themeMode:'dark',metadata,features:{analytics:false,email:false,socials:false}} as any);
  watchAccount(adapter.wagmiConfig, async (account)=>{
    if(account.isConnected && account.address){ await authenticate(account.address); }
    else if((window as any).zenitSetWallet) (window as any).zenitSetWallet(false,'Not connected');
  });
}

async function authenticate(address:`0x${string}`){
  const base=API.replace(/\/api$/,'');
  const nonceR=await fetch(`${base}/api/auth/nonce`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({address})});
  if(!nonceR.ok) throw new Error('Unable to create wallet challenge');
  const {nonce,message}=await nonceR.json();
  if(!adapter) return;
  const signature=await signMessage(adapter.wagmiConfig,{message});
  const verifyR=await fetch(`${base}/api/auth/verify`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({address,nonce,signature})});
  if(!verifyR.ok) throw new Error('Wallet authentication failed');
  const data=await verifyR.json(); authToken=data.token; localStorage.setItem('zenitToken',authToken);
  if((window as any).zenitSetWallet) (window as any).zenitSetWallet(true,address);
  if((window as any).zenitLoadBackend) await (window as any).zenitLoadBackend(authToken);
}

export async function openWallet(){ if(!appKit){await init();} if(!appKit) throw new Error('WalletConnect project ID is not configured'); appKit.open(); }

function interceptWalletClicks(){
  document.addEventListener('click',async(e)=>{
    const target=e.target as HTMLElement;
    if(target.closest('[data-action="wallet"]') || target.closest('[data-wallet-select]')){
      e.preventDefault(); e.stopImmediatePropagation();
      try{await openWallet();}catch(err){console.error(err); (window as any).zenitToast?.('Wallet connection unavailable',String(err instanceof Error?err.message:err),'error');}
    }
    if(target.closest('[data-action="disconnect"]')){
      e.preventDefault(); e.stopImmediatePropagation();
      try{
        if(authToken) await fetch(`${API.replace(/\/api$/,'')}/api/auth/logout`,{method:'POST',headers:{Authorization:`Bearer ${authToken}`}});
        if(appKit) await appKit.disconnect();
      }catch(err){console.error(err);
      }finally{ authToken=''; localStorage.removeItem('zenitToken'); (window as any).zenitSetWallet?.(false,'Not connected'); }
    }
  },true);
}

(window as any).zenitAuthFetch=async(input:string,initReq:RequestInit={})=>fetch(input,{...initReq,headers:{...(initReq.headers||{}),...(authToken?{Authorization:`Bearer ${authToken}`}:{})}});
window.addEventListener('DOMContentLoaded',()=>{interceptWalletClicks(); init().catch(console.error);});

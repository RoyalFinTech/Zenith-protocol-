import 'dotenv/config';

const required = (name: string, fallback?: string) => {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 8787),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  appOrigin: required('APP_ORIGIN', 'http://localhost:5173'),
  apiPublicUrl: required('API_PUBLIC_URL', 'http://localhost:8787'),
  chainId: Number(process.env.CHAIN_ID ?? 56),
  chainName: process.env.CHAIN_NAME ?? 'BNB Smart Chain',
  nativeCurrency: process.env.NATIVE_CURRENCY ?? 'BNB',
  primaryAsset: process.env.PRIMARY_ASSET ?? 'USDT',
  walletConnectProjectId: required('WALLETCONNECT_PROJECT_ID', ''),
  walletConnectMetadataName: process.env.WALLETCONNECT_METADATA_NAME ?? 'Zenit Protocol',
  walletConnectMetadataDescription: process.env.WALLETCONNECT_METADATA_DESCRIPTION ?? 'Decentralized Wealth Network',
  walletConnectMetadataUrl: process.env.WALLETCONNECT_METADATA_URL ?? 'http://localhost:5173',
  walletConnectMetadataIcon: process.env.WALLETCONNECT_METADATA_ICON ?? '',
  sessionTtlMinutes: Number(process.env.SESSION_TTL_MINUTES ?? 10080),
  nonceTtlMinutes: Number(process.env.NONCE_TTL_MINUTES ?? 10),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',').map(v => v.trim()).filter(Boolean)
};

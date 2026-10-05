import 'dotenv/config';

const required = (name: string, fallback?: string) => {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
};

const nodeEnv = process.env.NODE_ENV ?? 'development';
const port = Number(process.env.PORT ?? 8787);
const chainId = Number(process.env.CHAIN_ID ?? 56);
const paymentConfirmations = Number(process.env.PAYMENT_CONFIRMATIONS ?? 2);
const sessionTtlMinutes = Number(process.env.SESSION_TTL_MINUTES ?? 10080);
const nonceTtlMinutes = Number(process.env.NONCE_TTL_MINUTES ?? 10);
const vapidSubject = process.env.VAPID_SUBJECT ?? '';
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY ?? '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY ?? '';
const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',').map(v => v.trim()).filter(Boolean);
const appOrigin = required('APP_ORIGIN', 'http://localhost:5173');
const apiPublicUrl = required('API_PUBLIC_URL', appOrigin);
const jwtSecret = required('JWT_SECRET');
const emailProvider = (process.env.EMAIL_PROVIDER ?? 'resend').trim().toLowerCase();

if (emailProvider !== 'resend' && emailProvider !== 'mailersend') {
  throw new Error('EMAIL_PROVIDER must be either resend or mailersend');
}

if (nodeEnv === 'production') {
  if (jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters in production');
  if (!/^https:\/\//i.test(appOrigin)) throw new Error('APP_ORIGIN must use HTTPS in production');
  if (!/^https:\/\//i.test(apiPublicUrl)) throw new Error('API_PUBLIC_URL must use HTTPS in production');
  if (corsOrigins.length === 0 || corsOrigins.some(origin => !/^https:\/\//i.test(origin))) {
    throw new Error('CORS_ORIGINS must contain only HTTPS origins in production');
  }
  if (chainId !== 56) throw new Error('CHAIN_ID must be 56 for production BNB Smart Chain');
  if (!Number.isInteger(paymentConfirmations) || paymentConfirmations < 1) {
    throw new Error('PAYMENT_CONFIRMATIONS must be a positive integer');
  }
  if (!Number.isInteger(sessionTtlMinutes) || sessionTtlMinutes < 5) {
    throw new Error('SESSION_TTL_MINUTES must be at least 5 minutes');
  }
  if (!Number.isInteger(nonceTtlMinutes) || nonceTtlMinutes < 1) {
    throw new Error('NONCE_TTL_MINUTES must be at least 1 minute');
  }
  if (emailProvider === 'resend' && ((Boolean(process.env.RESEND_API_KEY) || Boolean(process.env.RESEND_FROM)) &&
      (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM))) {
    throw new Error('RESEND_API_KEY and RESEND_FROM must be configured together in production');
  }
  if (emailProvider === 'mailersend' && ((Boolean(process.env.MAILERSEND_API_KEY) || Boolean(process.env.MAILERSEND_FROM)) &&
      (!process.env.MAILERSEND_API_KEY || !process.env.MAILERSEND_FROM))) {
    throw new Error('MAILERSEND_API_KEY and MAILERSEND_FROM must be configured together in production');
  }
  if (emailProvider === 'mailersend' && (!process.env.MAILERSEND_API_KEY || !process.env.MAILERSEND_FROM)) {
    throw new Error('MailerSend is selected but MAILERSEND_API_KEY/MAILERSEND_FROM are not configured');
  }
  if (emailProvider === 'resend' && (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM)) {
    throw new Error('Resend is selected but RESEND_API_KEY/RESEND_FROM are not configured');
  }
}

export const env = {
  nodeEnv,
  port,
  databaseUrl: required('DATABASE_URL'),
  jwtSecret,
  appOrigin,
  apiPublicUrl,
  chainId,
  chainName: process.env.CHAIN_NAME ?? 'BNB Smart Chain',
  nativeCurrency: process.env.NATIVE_CURRENCY ?? 'BNB',
  primaryAsset: process.env.PRIMARY_ASSET ?? 'USDT',
  walletConnectProjectId: process.env.WALLETCONNECT_PROJECT_ID ?? '',
  walletConnectMetadataName: process.env.WALLETCONNECT_METADATA_NAME ?? 'Zenit Protocol',
  walletConnectMetadataDescription: process.env.WALLETCONNECT_METADATA_DESCRIPTION ?? 'Decentralized Wealth Network',
  walletConnectMetadataUrl: process.env.WALLETCONNECT_METADATA_URL ?? appOrigin,
  walletConnectMetadataIcon: process.env.WALLETCONNECT_METADATA_ICON ?? '',
  bscRpcUrl: process.env.BSC_RPC_URL ?? 'https://bsc-dataseed.bnbchain.org',
  usdtContractAddress: process.env.USDT_CONTRACT_ADDRESS ?? '0x55d398326f99059ff775485246999027b3197955',
  paymentReceiverAddress: process.env.PAYMENT_RECEIVER_ADDRESS ?? '',
  payoutSenderAddress: process.env.PAYOUT_SENDER_ADDRESS ?? '',
  paymentConfirmations,
  sessionTtlMinutes,
  nonceTtlMinutes,
  corsOrigins,
  vapidSubject,
  vapidPublicKey,
  vapidPrivateKey,
  pushEnabled: Boolean(vapidSubject && vapidPublicKey && vapidPrivateKey),
  emailProvider: emailProvider as 'resend' | 'mailersend',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  resendFrom: process.env.RESEND_FROM ?? '',
  mailersendApiKey: process.env.MAILERSEND_API_KEY ?? '',
  mailersendFrom: process.env.MAILERSEND_FROM ?? '',
  mailersendFromName: process.env.MAILERSEND_FROM_NAME ?? 'ZENIT Protocol'
};

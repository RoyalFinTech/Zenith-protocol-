import { createHmac, createPrivateKey, createPublicKey, diffieHellman, generateKeyPairSync, randomBytes, createCipheriv } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { SignJWT } from 'jose';
import { env } from '../config.js';

export type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  notificationId?: string;
};

type PushResult = {
  ok: boolean;
  stale: boolean;
  status: number;
};

const VAPID_MAX_TTL_SECONDS = 12 * 60 * 60;
const PUSH_RECORD_SIZE = 4096;

function b64urlDecode(value: string): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid base64url value');
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  return Buffer.from(padded, 'base64');
}

function b64urlEncode(value: Uint8Array): string {
  return Buffer.from(value).toString('base64url');
}

function hkdfExpand(prk: Buffer, info: Buffer, length: number): Buffer {
  const blocks: Buffer[] = [];
  let previous = Buffer.alloc(0);
  for (let counter = 1; Buffer.concat(blocks).length < length; counter += 1) {
    previous = createHmac('sha256', prk)
      .update(Buffer.concat([previous, info, Buffer.from([counter])]))
      .digest();
    blocks.push(previous);
  }
  return Buffer.concat(blocks).subarray(0, length);
}

function assertPushSubscription(subscription: PushSubscriptionInput): {
  endpoint: URL;
  uaPublicKey: Buffer;
  authSecret: Buffer;
} {
  const endpoint = new URL(subscription.endpoint);
  if (endpoint.protocol !== 'https:') throw new Error('Push endpoint must use HTTPS');
  if (endpoint.username || endpoint.password) throw new Error('Push endpoint credentials are not allowed');
  if (endpoint.port && endpoint.port !== '443') throw new Error('Push endpoint must use the default HTTPS port');

  const uaPublicKey = b64urlDecode(subscription.p256dh);
  const authSecret = b64urlDecode(subscription.auth);

  if (uaPublicKey.length !== 65 || uaPublicKey[0] !== 0x04) {
    throw new Error('Push subscription p256dh key is invalid');
  }
  if (authSecret.length !== 16) throw new Error('Push subscription auth secret is invalid');

  return { endpoint, uaPublicKey, authSecret };
}

function ipv4IsPrivate(host: string): boolean {
  const octets = host.split('.').map(Number);
  if (octets.length !== 4 || octets.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const a=octets[0]!, b=octets[1]!, c=octets[2]!;
  if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254)) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  if (a === 192 && b === 0 && (c === 0 || c === 9 || c === 0)) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  return false;
}

function normalizeIpv6(host: string): string {
  return host.toLowerCase().replace(/^\[|\]$/g, '');
}

function ipv6IsPrivate(host: string): boolean {
  const value = normalizeIpv6(host);
  if (!value.includes(':')) return false;
  if (value === '::1' || value === '::') return true;
  if (value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe8') || value.startsWith('fe9') || value.startsWith('fea') || value.startsWith('feb')) return true;
  if (value.startsWith('ff')) return true;
  if (value.startsWith('2001:db8:')) return true;
  return false;
}

async function assertSafeEndpoint(endpoint: URL): Promise<void> {
  const hostname = endpoint.hostname;
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new Error('Push endpoint hostname is not allowed');
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length) throw new Error('Push endpoint hostname did not resolve');

  for (const address of addresses) {
    if (address.family === 4 && ipv4IsPrivate(address.address)) {
      throw new Error('Push endpoint resolves to a private or reserved address');
    }
    if (address.family === 6 && ipv6IsPrivate(address.address)) {
      throw new Error('Push endpoint resolves to a private or reserved address');
    }
  }
}

function vapidKeyMaterial() {
  const publicKey = b64urlDecode(env.vapidPublicKey);
  const privateKey = b64urlDecode(env.vapidPrivateKey);

  if (publicKey.length !== 65 || publicKey[0] !== 0x04) {
    throw new Error('Configured VAPID public key is invalid');
  }
  if (privateKey.length !== 32) throw new Error('Configured VAPID private key is invalid');

  return { publicKey, privateKey };
}

function buildVapidPrivateKey(rawPrivateKey: Buffer, rawPublicKey: Buffer) {
  const x = rawPublicKey.subarray(1, 33);
  const y = rawPublicKey.subarray(33, 65);
  return createPrivateKey({
    key: {
      kty: 'EC',
      crv: 'P-256',
      x: b64urlEncode(x),
      y: b64urlEncode(y),
      d: b64urlEncode(rawPrivateKey)
    },
    format: 'jwk'
  });
}

async function createVapidAuthorization(audience: string): Promise<string> {
  if (!env.vapidSubject) throw new Error('VAPID subject is not configured');
  const { publicKey, privateKey } = vapidKeyMaterial();
  const key = buildVapidPrivateKey(privateKey, publicKey);
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
    .setAudience(audience)
    .setExpirationTime(Math.floor(Date.now() / 1000) + VAPID_MAX_TTL_SECONDS)
    .setSubject(env.vapidSubject)
    .sign(key);

  return `vapid t=${token}, k=${b64urlEncode(publicKey)}`;
}

function deriveEncryptionMaterial(uaPublicKey: Buffer, authSecret: Buffer) {
  const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const serverPublicJwk = pair.publicKey.export({ format: 'jwk' }) as { x?: string; y?: string };
  if (!serverPublicJwk.x || !serverPublicJwk.y) throw new Error('Unable to export the server push public key');
  const serverPublic = Buffer.concat([
    Buffer.from([0x04]),
    Buffer.from(serverPublicJwk.x, 'base64url'),
    Buffer.from(serverPublicJwk.y, 'base64url')
  ]);

  const ua = createPublicKey({
    key: {
      kty: 'EC',
      crv: 'P-256',
      x: b64urlEncode(uaPublicKey.subarray(1, 33)),
      y: b64urlEncode(uaPublicKey.subarray(33, 65))
    },
    format: 'jwk'
  });

  const ecdhSecret = diffieHellman({ privateKey: pair.privateKey, publicKey: ua });
  const keyInfo = Buffer.concat([
    Buffer.from('WebPush: info', 'utf8'),
    Buffer.from([0]),
    uaPublicKey,
    serverPublic
  ]);
  const prkKey = createHmac('sha256', authSecret).update(ecdhSecret).digest();
  const ikm = hkdfExpand(prkKey, keyInfo, 32);
  const salt = randomBytes(16);
  const prk = createHmac('sha256', salt).update(ikm).digest();
  const cek = hkdfExpand(prk, Buffer.from('Content-Encoding: aes128gcm\\0', 'utf8'), 16);
  const nonce = hkdfExpand(prk, Buffer.from('Content-Encoding: nonce\\0', 'utf8'), 12);

  return { cek, nonce, salt, serverPublic };
}

async function encryptPayload(subscription: PushSubscriptionInput, payload: PushPayload): Promise<Buffer> {
  const { uaPublicKey, authSecret } = assertPushSubscription(subscription);
  const { cek, nonce, salt, serverPublic } = deriveEncryptionMaterial(uaPublicKey, authSecret);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  if (plaintext.length > 3900) throw new Error('Push notification payload is too large');

  const padded = Buffer.concat([plaintext, Buffer.from([0x02])]);
  const cipher = createCipheriv('aes-128-gcm', cek, nonce);
  const ciphertext = Buffer.concat([cipher.update(padded), cipher.final(), cipher.getAuthTag()]);
  const header = Buffer.alloc(16 + 4 + 1 + 65);
  salt.copy(header, 0);
  header.writeUInt32BE(PUSH_RECORD_SIZE, 16);
  header.writeUInt8(65, 20);
  serverPublic.copy(header, 21);
  return Buffer.concat([header, ciphertext]);
}

export const pushEnabled = () => Boolean(env.vapidSubject && env.vapidPublicKey && env.vapidPrivateKey);

export function validatePushSubscriptionInput(value: unknown): PushSubscriptionInput {
  if (!value || typeof value !== 'object') throw new Error('Push subscription is required');
  const row = value as Record<string, unknown>;
  const endpoint = typeof row.endpoint === 'string' ? row.endpoint.trim() : '';
  const keys = row.keys && typeof row.keys === 'object' ? row.keys as Record<string, unknown> : {};
  const p256dh = typeof keys.p256dh === 'string' ? keys.p256dh.trim() : '';
  const auth = typeof keys.auth === 'string' ? keys.auth.trim() : '';
  if (!endpoint || endpoint.length > 4096) throw new Error('Valid push endpoint required');
  if (!p256dh || p256dh.length > 256) throw new Error('Valid push p256dh key required');
  if (!auth || auth.length > 256) throw new Error('Valid push auth secret required');
  assertPushSubscription({ endpoint, p256dh, auth });
  return { endpoint, p256dh, auth };
}

export async function sendPushToSubscription(subscription: PushSubscriptionInput, payload: PushPayload): Promise<PushResult> {
  if (!pushEnabled()) return { ok: false, stale: false, status: 0 };

  const { endpoint } = assertPushSubscription(subscription);
  await assertSafeEndpoint(endpoint);
  const body = await encryptPayload(subscription, payload);
  const authorization = await createVapidAuthorization(endpoint.origin);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      TTL: '60',
      Urgency: 'high',
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      Authorization: authorization
    },
    body: new Uint8Array(body) as unknown as BodyInit,
    redirect: 'error',
    signal: AbortSignal.timeout(10000)
  });

  return {
    ok: response.ok,
    stale: response.status === 404 || response.status === 410,
    status: response.status
  };
}

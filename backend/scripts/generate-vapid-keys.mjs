import { generateKeyPairSync } from 'node:crypto';

const encode = value => Buffer.from(value).toString('base64url');
const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const publicJwk = publicKey.export({ format: 'jwk' });
const privateJwk = privateKey.export({ format: 'jwk' });

const publicRaw = Buffer.concat([
  Buffer.from([0x04]),
  Buffer.from(publicJwk.x, 'base64url'),
  Buffer.from(publicJwk.y, 'base64url')
]);

console.log('Generate a subject separately, for example: VAPID_SUBJECT=mailto:notifications@example.com');
console.log('VAPID_PUBLIC_KEY=' + encode(publicRaw));
console.log('VAPID_PRIVATE_KEY=' + encode(Buffer.from(privateJwk.d, 'base64url')));

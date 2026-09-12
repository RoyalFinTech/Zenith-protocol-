import { SignJWT, jwtVerify } from 'jose';
import { env } from '../config.js';

const secret = new TextEncoder().encode(env.jwtSecret);

export type SessionClaims = { userId: string; walletAddress: string; role: string; sessionId: string };

export async function issueSession(claims: SessionClaims) {
  return new SignJWT({ walletAddress: claims.walletAddress, role: claims.role, sessionId: claims.sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.userId)
    .setIssuedAt()
    .setExpirationTime(`${env.sessionTtlMinutes}m`)
    .sign(secret);
}

export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
  if (!payload.sub || typeof payload.walletAddress !== 'string' || typeof payload.sessionId !== 'string') throw new Error('Invalid session');
  return { userId: payload.sub, walletAddress: payload.walletAddress, role: String(payload.role ?? 'Member'), sessionId: payload.sessionId } as SessionClaims;
}

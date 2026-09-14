import { Router } from 'express';
import { getAddress, verifyMessage } from 'viem';
import { query, pool } from '../db.js';
import { env } from '../config.js';
import { randomNonce, randomReferralCode } from '../utils/crypto.js';
import { issueSession } from '../services/jwt.js';
import { HttpError } from '../utils/http.js';
import { v4 as uuid } from 'uuid';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function buildMessage(address: string, nonce: string, issuedAt: Date, expiresAt: Date) {
  const domain = new URL(env.appOrigin).host;
  return `${domain} wants you to sign in with your Ethereum account:\n${address}\n\nSign in to Zenit Protocol.\n\nURI: ${env.appOrigin}\nVersion: 1\nChain ID: ${env.chainId}\nNonce: ${nonce}\nIssued At: ${issuedAt.toISOString()}\nExpiration Time: ${expiresAt.toISOString()}`;
}

router.post('/nonce', async (req, res, next) => {
  try {
    const raw = String(req.body?.address ?? '');
    if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) throw new HttpError(400, 'Valid EVM wallet address required');
    const address = getAddress(raw);
    const nonce = randomNonce();
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + env.nonceTtlMinutes * 60_000);
    await query(`insert into auth_nonces (nonce,address,issued_at,expires_at,message) values ($1,$2,$3,$4,$5)`, [nonce,address,issuedAt,expiresAt,buildMessage(address,nonce,issuedAt,expiresAt)]);
    res.json({ nonce, address, message: buildMessage(address, nonce, issuedAt, expiresAt), expiresAt });
  } catch (e) { next(e); }
});

router.post('/verify', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const raw = String(req.body?.address ?? '');
    const signature = String(req.body?.signature ?? '');
    const nonce = String(req.body?.nonce ?? '');
    if (!/^0x[a-fA-F0-9]{40}$/.test(raw) || !/^0x[0-9a-fA-F]+$/.test(signature) || !nonce) throw new HttpError(400, 'address, signature and nonce are required');
    const address = getAddress(raw);
    await client.query('begin');
    const nonceResult = await client.query<{ id: string; message: string; expires_at: Date; used_at: Date | null }>(`select id,message,expires_at,used_at from auth_nonces where nonce=$1 and address=$2 for update`, [nonce,address]);
    const record = nonceResult.rows[0];
    if (!record) throw new HttpError(400, 'Nonce not found');
    if (record.used_at) throw new HttpError(409, 'Nonce already used');
    if (new Date(record.expires_at).getTime() < Date.now()) throw new HttpError(400, 'Nonce expired');
    const valid = await verifyMessage({ address, message: record.message, signature: signature as `0x${string}` });
    if (!valid) throw new HttpError(401, 'Wallet signature verification failed');

    let user = (await client.query<{ id:string; role:string }>(`select id,role from app_users where wallet_address=$1`, [address])).rows[0];
    if (!user) {
      user = (await client.query<{ id:string; role:string }>(`insert into app_users (wallet_address,display_name,role,referral_code) values ($1,$2,'Member',$3) returning id,role`, [address, `Member ${address.slice(0,6)}…${address.slice(-4)}`, randomReferralCode()])).rows[0]!;
    }
    const sessionId = uuid();
    await client.query(`update auth_nonces set used_at=now() where id=$1`, [record.id]);
    await client.query(`insert into user_sessions (id,user_id,wallet_address,expires_at,ip_address,user_agent) values ($1,$2,$3,now()+make_interval(mins => $4),$5,$6)`, [sessionId,user.id,address,env.sessionTtlMinutes,req.ip,req.get('user-agent') ?? null]);
    await client.query('commit');
    const token = await issueSession({userId:user.id,walletAddress:address,role:user.role,sessionId});
    res.json({ token, user: { id:user.id, role:user.role, walletAddress:address } });
  } catch (e) { await client.query('rollback').catch(()=>{}); next(e); } finally { client.release(); }
});

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const auth = req.auth;
    if (auth) await query(`update user_sessions set revoked_at=now() where id=$1`, [auth.sessionId]);
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;

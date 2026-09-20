import { Router } from 'express';
import { getAddress, verifyMessage } from 'viem';
import { query, pool } from '../db.js';
import { env } from '../config.js';
import { randomNonce, randomReferralCode } from '../utils/crypto.js';
import { issueSession } from '../services/jwt.js';
import { HttpError } from '../utils/http.js';
import { v4 as uuid } from 'uuid';
import { createHash } from 'node:crypto';
import { sendVerificationEmail, sendWelcomeEmail } from '../services/email.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function buildMessage(address: string, nonce: string, issuedAt: Date, expiresAt: Date) {
  const domain = new URL(env.appOrigin).host;
  return `${domain} wants you to sign in with your Ethereum account:\n${address}\n\nSign in to Zenit Protocol.\n\nURI: ${env.appOrigin}\nVersion: 1\nChain ID: ${env.chainId}\nNonce: ${nonce}\nIssued At: ${issuedAt.toISOString()}\nExpiration Time: ${expiresAt.toISOString()}`;
}

router.get('/register/check', async (req, res, next) => {
  try {
    const username = String(req.query?.username ?? '').trim().toLowerCase();
    const email = String(req.query?.email ?? '').trim().toLowerCase();
    const displayName = String(req.query?.displayName ?? '').trim().toLowerCase();
    const result = await query<{username_taken:boolean; email_taken:boolean; display_name_taken:boolean}>(
      `select
        exists(select 1 from app_users where lower(username)=nullif($1,'')) as username_taken,
        exists(select 1 from app_users where lower(email)=nullif($2,'')) as email_taken,
        exists(select 1 from app_users where lower(display_name)=nullif($3,'')) as display_name_taken`,
      [username,email,displayName]
    );
    const row=result.rows[0] ?? { username_taken: false, email_taken: false, display_name_taken: false };
    res.json({
      username: username ? {available: !row.username_taken} : {available:false},
      email: email ? {available: !row.email_taken} : {available:false},
      displayName: displayName ? {available: !row.display_name_taken} : {available:false}
    });
  } catch (e) { console.error('ZENIT registration availability failed', e instanceof Error ? e.message : String(e)); next(e); }
});

router.post('/register/request', async (req, res, next) => {
  try {
    const username = String(req.body?.username ?? '').trim().toLowerCase();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const displayName = String(req.body?.displayName ?? '').trim();
    if (!/^[a-z0-9_]{3,24}$/.test(username)) throw new HttpError(400, 'Username must be 3–24 characters using lowercase letters, numbers or underscores');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Valid email address required');
    if (displayName.length < 2 || displayName.length > 80) throw new HttpError(400, 'Display name must be 2–80 characters');

    const conflict = await query<{username:string; email:string|null}>(`select username,email from app_users where lower(username)=lower($1) or lower(email)=lower($2) limit 1`, [username,email]);
    if (conflict.rows[0]) {
      if (conflict.rows[0].username?.toLowerCase() === username) throw new HttpError(409, 'That username is already in use');
      throw new HttpError(409, 'That email address is already registered');
    }

    await query(`delete from pending_registrations where verified_at is null and (lower(username)=lower($1) or lower(email)=lower($2))`, [username,email]);

    const token = randomNonce() + randomNonce();
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const id = uuid();
    await query(`insert into pending_registrations (id,username,email,display_name,token_hash,expires_at) values ($1,$2,$3,$4,$5,now()+interval '30 minutes')`, [id,username,email,displayName,tokenHash]);
    const verifyUrl = `${env.apiPublicUrl}/api/auth/register/verify?token=${encodeURIComponent(token)}`;
    try {
      await sendVerificationEmail({to:email,username,verifyUrl,registrationId:id,appOrigin:env.appOrigin});
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('ZENIT verification email send failed', message);
      await query(`delete from pending_registrations where id=$1`, [id]);
      if (message.includes('403')) {
        throw new HttpError(403, 'Resend is in testing mode. Use the Resend account test recipient, or verify a sending domain before sending to other email addresses.');
      }
      throw new HttpError(502, 'Verification email service is temporarily unavailable');
    }
    res.status(202).json({registrationId:id,email});
  } catch (e) { console.error('ZENIT registration request failed', e instanceof Error ? e.message : String(e)); next(e); }
});

router.get('/register/verify', async (req, res, next) => {
  try {
    const token = String(req.query?.token ?? '');
    if (!token) throw new HttpError(400, 'Verification token is required');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const row = (await query<{id:string}>(`update pending_registrations set verified_at=now(),updated_at=now() where token_hash=$1 and verified_at is null and expires_at > now() returning id`, [tokenHash])).rows[0];
    if (!row) throw new HttpError(400, 'This verification link is invalid or expired');
    const target = new URL(env.appOrigin);
    target.searchParams.set('registration', row.id);
    target.searchParams.set('email_verified', '1');
    res.redirect(target.toString());
  } catch (e) { next(e); }
});

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
    const registrationId = String(req.body?.registrationId ?? '');
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

    let user = (await client.query<{ id:string; role:string; username:string; email:string|null; display_name:string }>(`select id,role,username,email,display_name from app_users where wallet_address=$1`, [address])).rows[0];
    let registration: { id:string; username:string; email:string; display_name:string } | undefined;
    if (registrationId) {
      registration = (await client.query<{ id:string; username:string; email:string; display_name:string }>(`select id,username,email,display_name from pending_registrations where id=$1 and verified_at is not null and expires_at > now() and consumed_at is null for update`, [registrationId])).rows[0];
      if (!registration) throw new HttpError(400, 'Email verification is required before wallet authentication');
    }
    if (!user) {
      const username = registration?.username ?? `zenit_${address.slice(2,10).toLowerCase()}`;
      const email = registration?.email ?? null;
      const displayName = registration?.display_name ?? `Member ${address.slice(0,6)}…${address.slice(-4)}`;
      user = (await client.query<{ id:string; role:string; username:string; email:string|null; display_name:string }>(`insert into app_users (wallet_address,username,email,display_name,role,referral_code) values ($1,$2,$3,$4,'Member',$5) returning id,role,username,email,display_name`, [address,username,email,displayName,randomReferralCode()])).rows[0]!;
    } else if (registration) {
      try {
        user = (await client.query<{ id:string; role:string; username:string; email:string|null; display_name:string }>(`update app_users set username=$1,email=$2,display_name=$3,updated_at=now() where id=$4 returning id,role,username,email,display_name`, [registration.username,registration.email,registration.display_name,user.id])).rows[0]!;
      } catch (error:any) {
        if (error?.code === '23505') throw new HttpError(409, 'That username or email is already in use');
        throw error;
      }
    }
    if (registration) {
      await client.query(`update pending_registrations set consumed_at=now(),updated_at=now() where id=$1`, [registration.id]);
    }
    const sessionId = uuid();
    await client.query(`update auth_nonces set used_at=now() where id=$1`, [record.id]);
    await client.query(`insert into user_sessions (id,user_id,wallet_address,expires_at,ip_address,user_agent) values ($1,$2,$3,now()+make_interval(mins => $4),$5,$6)`, [sessionId,user.id,address,env.sessionTtlMinutes,req.ip,req.get('user-agent') ?? null]);
    await client.query('commit');
    if (registration) void sendWelcomeEmail({to: registration.email, username: registration.username, appOrigin: env.appOrigin}).catch(error => console.error('ZENIT welcome email failed', error));
    const token = await issueSession({userId:user.id,walletAddress:address,role:user.role,sessionId});
    res.json({ token, user: { id:user.id, role:user.role, username:(user as any).username||'', email:(user as any).email||null, displayName:(user as any).display_name||'', walletAddress:address } });
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

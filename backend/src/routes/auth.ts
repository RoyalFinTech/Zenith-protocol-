import { Router } from 'express';
import { getAddress, verifyMessage } from 'viem';
import { query, pool } from '../db.js';
import { env } from '../config.js';
import { randomNonce, randomReferralCode } from '../utils/crypto.js';
import { issueSession } from '../services/jwt.js';
import { HttpError } from '../utils/http.js';
import { v4 as uuid } from 'uuid';
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { sendVerificationEmail, sendWelcomeEmail } from '../services/email.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const PIN_PATTERN = /^\d{4}$/;
async function derivePin(pin:string,salt:string){
  return await new Promise<Buffer>((resolve,reject)=>scryptCb(pin,salt,64,{N:16384,r:8,p:1,maxmem:64*1024*1024},(error,key)=>error?reject(error):resolve(key as Buffer));
}
async function hashPin(pin:string){ const salt=randomBytes(16).toString('hex'); const derived=await derivePin(pin,salt); return 'scrypt$16384$8$1$'+salt+'$'+derived.toString('hex'); }
async function verifyPin(pin:string,encoded:string){ const parts=encoded.split('$'); if(parts.length!==7||parts[0]!=='scrypt') return false; const [,n,r,p,salt,expectedHex]=parts; const derived=await new Promise<Buffer>((resolve,reject)=>scryptCb(pin,salt,64,{N:Number(n),r:Number(r),p:Number(p),maxmem:64*1024*1024},(error,key)=>error?reject(error):resolve(key as Buffer))); const expected=Buffer.from(expectedHex,'hex'); return expected.length===derived.length && timingSafeEqual(expected,derived); }
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
    const pin = String(req.body?.pin ?? '');
    if (!/^[a-z0-9_]{3,24}$/.test(username)) throw new HttpError(400, 'Username must be 3–24 characters using lowercase letters, numbers or underscores');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Valid email address required');
    if (displayName.length < 2 || displayName.length > 80) throw new HttpError(400, 'Display name must be 2–80 characters');
    if (!PIN_PATTERN.test(pin)) throw new HttpError(400, 'A 4-digit PIN is required');

    const conflict = await query<{username:string; email:string|null}>(`select username,email from app_users where lower(username)=lower($1) or lower(email)=lower($2) limit 1`, [username,email]);
    if (conflict.rows[0]) {
      if (conflict.rows[0].username?.toLowerCase() === username) throw new HttpError(409, 'That username is already in use');
      throw new HttpError(409, 'That email address is already registered');
    }

    await query(`delete from pending_registrations where verified_at is null and (lower(username)=lower($1) or lower(email)=lower($2))`, [username,email]);

    const pinHash = await hashPin(pin);
    const token = randomNonce() + randomNonce();
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const id = uuid();
    await query(`insert into pending_registrations (id,username,email,display_name,pin_hash,token_hash,expires_at) values ($1,$2,$3,$4,$5,$6,now()+interval '30 minutes')`, [id,username,email,displayName,pinHash,tokenHash]);
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

    let user = (await client.query<{ id:string; role:string; username:string; email:string|null; display_name:string; pin_hash:string|null }>(`select u.id,u.role,u.username,u.email,u.display_name,u.pin_hash from app_users u where u.wallet_address=$1 or exists (select 1 from wallet_accounts wa where wa.user_id=u.id and lower(wa.address)=lower($1) and wa.chain_id=$2) limit 1`, [address, env.chainId])).rows[0];
    let registration: { id:string; username:string; email:string; display_name:string; pin_hash:string|null } | undefined;
    if (registrationId) {
      registration = (await client.query<{ id:string; username:string; email:string; display_name:string; pin_hash:string|null }>(`select id,username,email,display_name,pin_hash from pending_registrations where id=$1 and verified_at is not null and expires_at > now() and consumed_at is null for update`, [registrationId])).rows[0];
      if (!registration) throw new HttpError(400, 'Email verification is required before wallet authentication');
    }
    if (!user) {
      const username = registration?.username ?? `zenit_${address.slice(2,10).toLowerCase()}`;
      const email = registration?.email ?? null;
      const displayName = registration?.display_name ?? `Member ${address.slice(0,6)}…${address.slice(-4)}`;
      user = (await client.query<{ id:string; role:string; username:string; email:string|null; display_name:string; pin_hash:string|null }>(`insert into app_users (wallet_address,username,email,display_name,pin_hash,role,referral_code) values ($1,$2,$3,$4,$5,'Member',$6) returning id,role,username,email,display_name,pin_hash`, [address,username,email,displayName,registration?.pin_hash ?? null,randomReferralCode()])).rows[0]!;
    } else if (registration) {
      try {
        user = (await client.query<{ id:string; role:string; username:string; email:string|null; display_name:string; pin_hash:string|null }>(`update app_users set username=$1,email=$2,display_name=$3,updated_at=now() where id=$4 returning id,role,username,email,display_name,pin_hash`, [registration.username,registration.email,registration.display_name,user.id])).rows[0]!;
      } catch (error:any) {
        if (error?.code === '23505') throw new HttpError(409, 'That username or email is already in use');
        throw error;
      }
    }
    if (!user) throw new HttpError(500,'Unable to resolve wallet account');
    if (registration) {
      await client.query(`update pending_registrations set consumed_at=now(),updated_at=now() where id=$1`, [registration.id]);
    }
    if (!registration) {
      const challengeId=uuid();
      await client.query(`insert into pin_challenges(id,user_id,wallet_address) values($1,$2,$3)`, [challengeId,user.id,address]);
      await client.query('update auth_nonces set used_at=now() where id=$1', [record.id]);
      await client.query('commit');
      res.json({pinRequired:!!user.pin_hash,pinSetupRequired:!user.pin_hash,challengeId,user:{id:user.id,username:(user as any).username||'',displayName:(user as any).display_name||'',walletAddress:address}});
      return;
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

router.post('/pin/verify', async (req,res,next)=>{
  try{
    const challengeId=String(req.body?.challengeId??''); const pin=String(req.body?.pin??'');
    if(!/^[0-9a-fA-F-]{36}$/.test(challengeId)||!PIN_PATTERN.test(pin)) throw new HttpError(400,'Enter your 4-digit PIN');
    const row=(await query<{id:string;user_id:string;wallet_address:string;expires_at:Date;pin_hash:string|null}>(`select c.id,c.user_id,c.wallet_address,c.expires_at,u.pin_hash from pin_challenges c join app_users u on u.id=c.user_id where c.id=$1 and c.used_at is null`,[challengeId])).rows[0];
    if(!row) throw new HttpError(400,'PIN challenge is invalid or expired');
    if(new Date(row.expires_at).getTime()<Date.now()) throw new HttpError(400,'PIN challenge expired; reconnect your wallet');
    if(!row.pin_hash) throw new HttpError(409,'PIN setup is required for this account');
    const locked=(await query<{pin_locked_until:Date|null}>(`select pin_locked_until from app_users where id=$1`,[row.user_id])).rows[0]?.pin_locked_until;
    if(locked && new Date(locked).getTime()>Date.now()) throw new HttpError(429,'PIN temporarily locked. Try again later.');
    const valid=await verifyPin(pin,row.pin_hash);
    if(!valid){ await query(`update app_users set pin_failed_attempts=pin_failed_attempts+1,pin_locked_until=case when pin_failed_attempts+1>=5 then now()+interval '10 minutes' else pin_locked_until end where id=$1`,[row.user_id]); throw new HttpError(401,'Incorrect PIN'); }
    const user=(await query<{role:string;username:string;email:string|null;display_name:string}>(`select role,username,email,display_name from app_users where id=$1`,[row.user_id])).rows[0];
    if(!user) throw new HttpError(404,'User not found');
    const sessionId=uuid(); await query(`update app_users set pin_failed_attempts=0,pin_locked_until=null where id=$1`,[row.user_id]); await query(`update pin_challenges set used_at=now() where id=$1`,[row.id]);
    await query(`insert into user_sessions(id,user_id,wallet_address,expires_at,ip_address,user_agent) values($1,$2,$3,now()+make_interval(mins => $4),$5,$6)`,[sessionId,row.user_id,row.wallet_address,env.sessionTtlMinutes,req.ip,req.get('user-agent')??null]);
    const token=await issueSession({userId:row.user_id,walletAddress:row.wallet_address,role:user.role,sessionId});
    res.json({token,user:{id:row.user_id,role:user.role,username:user.username,email:user.email,displayName:user.display_name,walletAddress:row.wallet_address}});
  }catch(e){next(e);}
});
router.post('/pin/setup', async (req,res,next)=>{
  try{
    const challengeId=String(req.body?.challengeId??''); const pin=String(req.body?.pin??'');
    if(!/^[0-9a-fA-F-]{36}$/.test(challengeId)||!PIN_PATTERN.test(pin)) throw new HttpError(400,'Enter a 4-digit PIN');
    const row=(await query<{id:string;user_id:string;wallet_address:string;expires_at:Date}>(`select id,user_id,wallet_address,expires_at from pin_challenges where id=$1 and used_at is null`,[challengeId])).rows[0];
    if(!row) throw new HttpError(400,'PIN setup challenge is invalid or expired');
    if(new Date(row.expires_at).getTime()<Date.now()) throw new HttpError(400,'PIN setup challenge expired; reconnect your wallet');
    const pinHash=await hashPin(pin);
    await query(`update app_users set pin_hash=$1,pin_failed_attempts=0,pin_locked_until=null,updated_at=now() where id=$2`,[pinHash,row.user_id]);
    await query(`update pin_challenges set used_at=now() where id=$1`,[row.id]);
    const user=(await query<{role:string;username:string;email:string|null;display_name:string}>(`select role,username,email,display_name from app_users where id=$1`,[row.user_id])).rows[0];
    if(!user) throw new HttpError(404,'User not found');
    const sessionId=uuid();
    await query(`insert into user_sessions(id,user_id,wallet_address,expires_at,ip_address,user_agent) values($1,$2,$3,now()+make_interval(mins => $4),$5,$6)`,[sessionId,row.user_id,row.wallet_address,env.sessionTtlMinutes,req.ip,req.get('user-agent')??null]);
    const token=await issueSession({userId:row.user_id,walletAddress:row.wallet_address,role:user.role,sessionId});
    res.json({token,user:{id:row.user_id,role:user.role,username:user.username,email:user.email,displayName:user.display_name,walletAddress:row.wallet_address}});
  }catch(e){next(e);}
});
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const auth = req.auth;
    if (auth) await query(`update user_sessions set revoked_at=now() where id=$1`, [auth.sessionId]);
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;

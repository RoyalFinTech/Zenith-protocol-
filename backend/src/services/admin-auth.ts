import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { v4 as uuid } from 'uuid';
import { pool, query } from '../db.js';
import { env } from '../config.js';
import { issueAdminSession, verifyAdminSession } from './admin-jwt.js';
import { HttpError } from '../utils/http.js';

async function derivePassword(password:string,salt:string){
  return await new Promise<Buffer>((resolve,reject)=>scryptCb(password,salt,64,(error,key)=>error?reject(error):resolve(key as Buffer)));
}
export async function hashAdminPassword(password:string){
  const salt=randomBytes(16).toString('hex');
  const derived=await derivePassword(password,salt);
  return `scrypt$${salt}$${derived.toString('hex')}`;
}
async function verifyHash(password:string,encoded:string){
  const parts=encoded.split('$');
  if(parts.length!==3||parts[0]!=='scrypt') return false;
  const derived=await derivePassword(password,parts[1]!);
  const expected=Buffer.from(parts[2]!,'hex');
  return expected.length===derived.length&&timingSafeEqual(expected,derived);
}
export async function adminLogin(email:string,password:string,ip:string|null,userAgent:string|null){
  const normalized=email.trim().toLowerCase();
  const client=await pool.connect();
  try{
    await client.query('begin');
    const admin=(await client.query<{id:string;email:string;password_hash:string;failed_attempts:number;locked_until:Date|null;is_active:boolean}>(`select id,email,password_hash,failed_attempts,locked_until,is_active from admin_users where lower(email)=lower($1) for update`,[normalized])).rows[0];
    if(!admin||!admin.is_active) throw new HttpError(401,'Invalid admin email or password');
    if(admin.locked_until&&new Date(admin.locked_until).getTime()>Date.now()) throw new HttpError(429,'Admin access is temporarily locked. Try again later.');
    const valid=await verifyHash(password,admin.password_hash);
    if(!valid){
      const attempts=admin.failed_attempts+1;
      await client.query(`update admin_users set failed_attempts=$2,locked_until=case when $2>=5 then now()+interval '10 minutes' else locked_until end,updated_at=now() where id=$1`,[admin.id,attempts]);
      await client.query('commit');
      throw new HttpError(401,'Invalid admin email or password');
    }
    const sessionId=uuid();
    await client.query(`update admin_users set failed_attempts=0,locked_until=null,last_login_at=now(),updated_at=now() where id=$1`,[admin.id]);
    await client.query(`insert into admin_sessions(id,admin_user_id,expires_at,ip_address,user_agent) values($1,$2,now()+make_interval(mins => $3),$4,$5)`,[sessionId,admin.id,env.sessionTtlMinutes,ip,userAgent]);
    await client.query('commit');
    const token=await issueAdminSession({adminId:admin.id,email:admin.email,sessionId});
    return {token,admin:{id:admin.id,email:admin.email}};
  }catch(e){await client.query('rollback').catch(()=>{});throw e}
  finally{client.release()}
}
export async function requireAdminSession(token:string){
  let claims;
  try{claims=await verifyAdminSession(token);}catch{throw new HttpError(401,'Invalid or expired admin session');}
  const row=(await query<{id:string;email:string;is_active:boolean}>(`select a.id,a.email,a.is_active from admin_users a join admin_sessions s on s.admin_user_id=a.id where s.id=$1 and a.id=$2 and a.is_active=true and s.revoked_at is null and s.expires_at>now()`,[claims.sessionId,claims.adminId])).rows[0];
  if(!row) throw new HttpError(401,'Admin session expired or revoked');
  return row;
}
export async function changeAdminCredentials(adminId:string,currentPassword:string,newEmail:string,newPassword:string){
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) throw new HttpError(400,'Valid admin email required');
  if(newPassword.length<12) throw new HttpError(400,'Admin password must be at least 12 characters');
  const client=await pool.connect();
  try{
    await client.query('begin');
    const admin=(await client.query<{password_hash:string}>(`select password_hash from admin_users where id=$1 for update`,[adminId])).rows[0];
    if(!admin||!(await verifyHash(currentPassword,admin.password_hash))) throw new HttpError(401,'Current admin password is incorrect');
    const hash=await hashAdminPassword(newPassword);
    try{
      await client.query(`update admin_users set email=$2,password_hash=$3,updated_at=now() where id=$1`,[adminId,newEmail.trim().toLowerCase(),hash]);
    }catch(e:any){if(e?.code==='23505')throw new HttpError(409,'That admin email is already in use');throw e;}
    await client.query(`update admin_sessions set revoked_at=now() where admin_user_id=$1 and revoked_at is null`,[adminId]);
    await client.query('commit');
  }catch(e){await client.query('rollback').catch(()=>{});throw e}
  finally{client.release()}
}
export async function revokeAdminSession(sessionId:string,adminId:string){ await query(`update admin_sessions set revoked_at=now() where id=$1 and admin_user_id=$2`,[sessionId,adminId]); }

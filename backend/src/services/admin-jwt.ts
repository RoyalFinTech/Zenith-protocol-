import { SignJWT, jwtVerify } from 'jose';
import { env } from '../config.js';
const secret=new TextEncoder().encode(env.jwtSecret);
export type AdminClaims={adminId:string;email:string;sessionId:string};
export async function issueAdminSession(claims:AdminClaims){
  return new SignJWT({type:'admin',email:claims.email,sessionId:claims.sessionId})
    .setProtectedHeader({alg:'HS256'}).setSubject(claims.adminId).setIssuedAt()
    .setExpirationTime(`${env.sessionTtlMinutes}m`).sign(secret);
}
export async function verifyAdminSession(token:string){
  const {payload}=await jwtVerify(token,secret,{algorithms:['HS256']});
  if(payload.type!=='admin'||!payload.sub||typeof payload.email!=='string'||typeof payload.sessionId!=='string') throw new Error('Invalid admin session');
  return {adminId:payload.sub,email:payload.email,sessionId:payload.sessionId} as AdminClaims;
}

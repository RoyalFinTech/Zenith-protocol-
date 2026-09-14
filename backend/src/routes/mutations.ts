import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/http.js';
import { randomReferralCode } from '../utils/crypto.js';

const router = Router();
router.use(requireAuth);

router.post('/referral/regenerate', async (req,res,next)=>{
  try {
    let code='';
    for(let i=0;i<5;i++){
      const candidate=randomReferralCode();
      const exists=(await (await import('../db.js')).query(`select 1 from app_users where referral_code=$1`,[candidate])).rows[0];
      if(!exists){code=candidate;break;}
    }
    if(!code) throw new HttpError(503,'Unable to allocate a unique referral code');
    const row=(await (await import('../db.js')).query<{referral_code:string}>(`update app_users set referral_code=$1,updated_at=now() where id=$2 returning referral_code`,[code,req.auth!.userId])).rows[0];
    await (await import('../db.js')).query(`insert into audit_logs(actor_user_id,action,entity_type,entity_id,metadata) values($1,'referral_code_regenerated','app_user',$1,$2)`,[req.auth!.userId,JSON.stringify({referralCode:code})]);
    res.json({referralCode:row?.referral_code});
  }catch(e){next(e)}
});

router.post('/programs/:programCode/place', async(req,res,next)=>{
  const client=await pool.connect();
  try{
    await client.query('begin');
    const program=(await client.query<{id:string;levels:number;capacity:number}>(`select id,levels,capacity from programs where code=$1 and active=true for update`,[req.params.programCode])).rows[0];
    if(!program) throw new HttpError(404,'Program not found');
    const already=(await client.query(`select id from matrix_memberships where program_id=$1 and user_id=$2`,[program.id,req.auth!.userId])).rows[0];
    if(already) throw new HttpError(409,'You already have a position in this program');
    const node=(await client.query<{id:string;position:number;level:number}>(`select id,position,level from matrix_nodes where program_id=$1 and status='available' order by position asc for update skip locked limit 1`,[program.id])).rows[0];
    if(!node) throw new HttpError(409,'No available position remains in this program');
    const referrerCode=String(req.body?.referralCode??'').trim().toUpperCase();
    let referrerId:string|null=null;
    if(referrerCode){referrerId=(await client.query<{id:string}>(`select id from app_users where referral_code=$1`,[referrerCode])).rows[0]?.id ?? null;}
    await client.query(`update matrix_nodes set status='active',user_id=$1,referrer_user_id=$2,activated_at=now() where id=$3`,[req.auth!.userId,referrerId,node.id]);
    const membership=(await client.query(`insert into matrix_memberships(user_id,program_id,node_id,referrer_user_id,level,position,status) values($1,$2,$3,$4,$5,$6,'active') returning id,program_id,node_id,level,position,status,created_at`,[req.auth!.userId,program.id,node.id,referrerId,node.level,node.position])).rows[0];
    await client.query(`insert into audit_logs(actor_user_id,action,entity_type,entity_id,metadata) values($1,'matrix_position_activated','matrix_membership',$2,$3)`,[req.auth!.userId,membership.id,JSON.stringify({programCode:req.params.programCode,position:node.position,level:node.level,referrerId})]);
    await client.query('commit');
    res.status(201).json({membership});
  }catch(e){await client.query('rollback').catch(()=>{});next(e)} finally{client.release();}
});

export default router;

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


export default router;

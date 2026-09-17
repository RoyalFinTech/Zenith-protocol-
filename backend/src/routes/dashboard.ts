import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router=Router(); router.use(requireAuth);
router.get('/summary', async(req,res,next)=>{
  try{
    const [programs,earnings,txs,activity,notifications] = await Promise.all([
      query(`select id,code,name,levels,capacity,description,active,
        coalesce((select json_agg(json_build_object(
          'id',pp.id,
          'code',pp.code,
          'name',pp.name,
          'tier',pp.tier,
          'description',pp.description,
          'price',pp.price,
          'asset',pp.asset,
          'active',pp.active,
          'sortOrder',pp.sort_order
        ) order by pp.sort_order) from program_packages pp where pp.program_id=p.id and pp.active=true),'[]'::json) as packages
        from programs p where p.active=true order by p.sort_order`),
      query(`select coalesce(sum(case when type='earned' and status='completed' then amount else 0 end),0) total,coalesce(sum(case when status='pending' then amount else 0 end),0) pending,coalesce(sum(case when type='withdrawal' and status='completed' then amount else 0 end),0) withdrawn from ledger_transactions where user_id=$1`,[req.auth!.userId]),
      query(`select occurred_at,type,program_code,amount,asset,status,reference from ledger_transactions where user_id=$1 order by occurred_at desc limit 50`,[req.auth!.userId]),
      query(`select icon,title,description,occurred_at,status from activity_events where user_id=$1 order by occurred_at desc limit 10`,[req.auth!.userId]),
      query(`select id,title,message,created_at,read_at from notifications where user_id=$1 order by created_at desc limit 20`,[req.auth!.userId])
    ]);
    res.json({programs:programs.rows, earnings:earnings.rows[0], transactions:txs.rows, activity:activity.rows, notifications:notifications.rows});
  }catch(e){next(e)}
});
router.get('/team', async(req,res,next)=>{ try { const r=await query(`select u.id,u.display_name,u.wallet_address,m.program_code,m.level,m.position,m.status from matrix_memberships m join app_users u on u.id=m.user_id where m.referrer_user_id=$1 order by m.level,m.position`,[req.auth!.userId]); res.json({team:r.rows}); }catch(e){next(e)} });
router.get('/matrix/:programCode', async(req,res,next)=>{ try { const r=await query(`select n.id,n.program_id,p.code as program_code,n.level,n.position,n.status,n.user_id,n.referrer_user_id from matrix_nodes n join programs p on p.id=n.program_id where p.code=$1 order by n.level,n.position`,[req.params.programCode]); res.json({nodes:r.rows}); }catch(e){next(e)} });
router.get('/referrals', async(req,res,next)=>{ try { const r=await query(`select id,display_name,referral_code from app_users where id=$1`,[req.auth!.userId]); const members=await query(`select u.id,u.display_name,u.wallet_address,m.created_at from matrix_memberships m join app_users u on u.id=m.user_id where m.referrer_user_id=$1 order by m.created_at desc`,[req.auth!.userId]); res.json({referral:r.rows[0],members:members.rows}); }catch(e){next(e)} });
export default router;

import {Router} from 'express';
import {HttpError,parseLimit,getBearer} from '../utils/http.js';
import {adminLogin,changeAdminCredentials,revokeAdminSession,requireAdminSession} from '../services/admin-auth.js';
import {requireAdminPortal} from '../middleware/admin-auth.js';
import {query} from '../db.js';
import { transitionAdminWithdrawal, completeAdminWithdrawal } from '../services/admin-withdrawals.js';
const router=Router();
router.post('/login',async(req,res,next)=>{try{
  const email=String(req.body?.email??'').trim().toLowerCase(),password=String(req.body?.password??'');
  if(!email||!password) throw new HttpError(400,'Email and password are required');
  const result=await adminLogin(email,password,req.ip??null,req.get('user-agent')??null);
  res.json(result);
}catch(e){next(e)}});
router.use(requireAdminPortal);
router.get('/me',async(req,res,next)=>{try{res.json({admin:req.admin})}catch(e){next(e)}});
router.post('/logout',async(req,res,next)=>{try{const token=getBearer(req);if(!token)throw new HttpError(401,'Admin authentication required');const claims=await (await import('../services/admin-jwt.js')).verifyAdminSession(token);await revokeAdminSession(claims.sessionId,req.admin!.id);res.status(204).end()}catch(e){next(e)}});
router.patch('/credentials',async(req,res,next)=>{try{
  const currentPassword=String(req.body?.currentPassword??''),newEmail=String(req.body?.newEmail??'').trim().toLowerCase(),newPassword=String(req.body?.newPassword??'');
  await changeAdminCredentials(req.admin!.id,currentPassword,newEmail,newPassword);
  res.status(204).end();
}catch(e){next(e)}});

router.get('/overview',async(req,res,next)=>{try{
  const [users,purchases,revenue,liabilities,withdrawals,programs,activity]=await Promise.all([
    query(`select count(*)::int as total,count(*) filter(where role='Member')::int as members,count(*) filter(where created_at>=now()-interval '30 days')::int as new_30d from app_users`),
    query(`select count(*)::int as total,count(*) filter(where status='confirmed')::int as confirmed,coalesce(sum(amount) filter(where status='confirmed'),0)::text as gross from package_purchases`),
    query(`select coalesce(sum(amount) filter(where kind='admin_revenue' and status='accrued'),0)::text as admin_revenue,coalesce(sum(amount) filter(where kind='unallocated_matrix' and status='accrued'),0)::text as unallocated_matrix,coalesce(sum(amount) filter(where kind='unallocated_direct' and status='accrued'),0)::text as unallocated_direct from platform_revenue_ledger`),
    query(`select coalesce(sum(amount) filter(where type='earned' and status='completed'),0)::text as earned,coalesce(sum(amount) filter(where type='withdrawal' and status in ('pending','approved','processing','completed')),0)::text as withdrawals from ledger_transactions`),
    query(`select count(*) filter(where status in ('pending','approved','processing'))::int as pending,count(*) filter(where status='completed')::int as completed,coalesce(sum(amount) filter(where status in ('pending','approved','processing')),0)::text as pending_amount from withdrawal_requests`),
    query(`select p.code,p.name,p.levels,p.capacity,count(n.id) filter(where n.status='active')::int as active,count(n.id) filter(where n.status='available')::int as available from programs p left join matrix_nodes n on n.program_id=p.id group by p.id order by p.sort_order`),
    query(`select id,action,entity_type,created_at,metadata from audit_logs order by created_at desc limit 25`)
  ]);
  res.json({users:users.rows[0],purchases:purchases.rows[0],revenue:revenue.rows[0],liabilities:liabilities.rows[0],withdrawals:withdrawals.rows[0],programs:programs.rows,activity:activity.rows});
}catch(e){next(e)}});

router.get('/charts',async(req,res,next)=>{try{
  const [daily,tiers,ledger,withdrawals]=await Promise.all([
    query(`select date_trunc('day',created_at)::date as day,coalesce(sum(amount) filter(where status='confirmed'),0)::text as gross from package_purchases where created_at>=now()-interval '30 days' group by 1 order by 1`),
    query(`select p.code, p.tier, count(*)::int as purchases, coalesce(sum(pp.amount),0)::text as volume from package_purchases pp join program_packages p on p.id=pp.package_id where pp.status='confirmed' group by p.code,p.tier order by p.code,p.tier`),
    query(`select type,coalesce(sum(amount) filter(where status='completed'),0)::text as amount,count(*)::int as count from ledger_transactions group by type order by type`),
    query(`select status,count(*)::int as count,coalesce(sum(amount),0)::text as amount from withdrawal_requests group by status order by status`)
  ]);
  res.json({daily:daily.rows,tiers:tiers.rows,ledger:ledger.rows,withdrawals:withdrawals.rows});
}catch(e){next(e)}});

router.get('/users',async(req,res,next)=>{try{
 const limit=parseLimit(req.query.limit,100,500);
 const r=await query(`select u.id,u.username,u.display_name,u.email,u.role,u.wallet_address,u.created_at,count(distinct m.id)::int as memberships,coalesce(sum(l.amount) filter(where l.type='earned' and l.status='completed'),0)::text as earned from app_users u left join matrix_memberships m on m.user_id=u.id left join ledger_transactions l on l.user_id=u.id group by u.id order by u.created_at desc limit $1`,[limit]);
 res.json({users:r.rows});
}catch(e){next(e)}});

router.get('/purchases',async(req,res,next)=>{try{
 const limit=parseLimit(req.query.limit,100,500);
 const r=await query(`select pp.id,pp.created_at,pp.confirmed_at,pp.amount,pp.asset,pp.status,pp.payment_tx_hash,pp.direct_amount,pp.matrix_amount,pp.admin_amount,pp.unallocated_matrix_amount,u.username,u.email,pg.code as program_code,pg.name as program_name,p.tier,p.name as package_name from package_purchases pp join app_users u on u.id=pp.user_id join program_packages p on p.id=pp.package_id join programs pg on pg.id=p.program_id order by pp.created_at desc limit $1`,[limit]);
 res.json({purchases:r.rows});
}catch(e){next(e)}});

router.get('/revenue',async(req,res,next)=>{try{
 const limit=parseLimit(req.query.limit,100,500);
 const r=await query(`select r.id,r.created_at,r.kind,r.amount,r.asset,r.status,r.package_purchase_id,pp.amount as purchase_amount,u.username,p.code as program_code,p.tier as package_tier from platform_revenue_ledger r join package_purchases pp on pp.id=r.package_purchase_id join app_users u on u.id=pp.user_id join program_packages p on p.id=pp.package_id order by r.created_at desc limit $1`,[limit]);
 res.json({revenue:r.rows});
}catch(e){next(e)}});

router.patch('/withdrawals/:withdrawalId/status',async(req,res,next)=>{try{
  const status=String(req.body?.status??'').trim().toLowerCase();
  const reason=req.body?.reason==null?null:String(req.body.reason).trim()||null;
  const withdrawal=await transitionAdminWithdrawal(String(req.params.withdrawalId),req.admin!.id,status,reason);
  res.json({withdrawal});
}catch(e){next(e)}});
router.post('/withdrawals/:withdrawalId/complete',async(req,res,next)=>{try{
  const txHash=String(req.body?.txHash??'').trim();
  const result=await completeAdminWithdrawal(String(req.params.withdrawalId),req.admin!.id,txHash);
  res.json(result);
}catch(e){next(e)}});
router.get('/withdrawals',async(req,res,next)=>{try{
 const limit=parseLimit(req.query.limit,100,500);
 const r=await query(`select w.id,w.created_at,w.updated_at,w.amount,w.asset,w.status,w.destination_address,w.tx_hash,w.rejection_reason,u.username,u.email from withdrawal_requests w join app_users u on u.id=w.user_id order by w.created_at desc limit $1`,[limit]);
 res.json({withdrawals:r.rows});
}catch(e){next(e)}});

router.get('/matrix',async(req,res,next)=>{try{
 const r=await query(`select p.code as program_code,p.name as program_name,n.level,n.position,n.status,n.user_id,n.referrer_user_id,n.activated_at,u.username from matrix_nodes n join programs p on p.id=n.program_id left join app_users u on u.id=n.user_id order by p.sort_order,n.position`);
 res.json({nodes:r.rows});
}catch(e){next(e)}});

router.get('/audit',async(req,res,next)=>{try{
 const limit=parseLimit(req.query.limit,200,500);
 const r=await query(`select a.id,a.action,a.entity_type,a.entity_id,a.metadata,a.created_at,u.username as actor from audit_logs a left join app_users u on u.id=a.actor_user_id order by a.created_at desc limit $1`,[limit]);
 res.json({logs:r.rows});
}catch(e){next(e)}});

export default router;

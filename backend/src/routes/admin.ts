import { Router } from 'express';
import { query } from '../db.js';
import { parseLimit } from '../utils/http.js';
import { transitionAdminWithdrawal, completeAdminWithdrawal } from '../services/admin-withdrawals.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router=Router();
router.use(requireAuth,requireAdmin);

router.get('/summary',async(_req,res,next)=>{try{
  const [users,txs,pending]=await Promise.all([
    query<{count:number}>(`select count(*)::int count from app_users`),
    query<{count:number}>(`select count(*)::int count from ledger_transactions`),
    query<{count:number}>(`select count(*)::int count from withdrawal_requests where status in ('pending','approved','processing')`)
  ]);
  res.json({users:users.rows[0]?.count??0,transactions:txs.rows[0]?.count??0,pendingWithdrawals:pending.rows[0]?.count??0});
}catch(e){next(e)}});

router.get('/withdrawals',async(req,res,next)=>{try{
  const limit=parseLimit(req.query.limit,50,200);
  const r=await query(`select w.id,w.user_id,w.amount,w.asset,w.destination_address,w.status,w.tx_hash,w.rejection_reason,w.created_at,w.updated_at,u.wallet_address
    from withdrawal_requests w join app_users u on u.id=w.user_id
    order by w.created_at desc limit $1`,[limit]);
  res.json({withdrawals:r.rows});
}catch(e){next(e)}});

router.patch('/withdrawals/:id/status',async(req,res,next)=>{try{
  const status=String(req.body?.status??'').trim().toLowerCase();
  const reason=req.body?.rejectionReason==null?null:String(req.body.rejectionReason).trim()||null;
  const withdrawal=await transitionAdminWithdrawal(String(req.params.id),req.auth!.userId,status,reason,req.auth!.userId);
  res.json({withdrawal});
}catch(e){next(e)}});

router.post('/withdrawals/:id/complete',async(req,res,next)=>{try{
  const result=await completeAdminWithdrawal(String(req.params.id),req.auth!.userId,String(req.body?.txHash??'').trim(),req.auth!.userId);
  res.json(result);
}catch(e){next(e)}});

router.get('/audit-logs',async(_req,res,next)=>{try{
  const r=await query(`select id,actor_user_id,action,entity_type,entity_id,metadata,created_at from audit_logs order by created_at desc limit 200`);
  res.json({logs:r.rows});
}catch(e){next(e)}});

export default router;

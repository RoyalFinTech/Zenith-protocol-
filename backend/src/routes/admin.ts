import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
const router=Router(); router.use(requireAuth,requireAdmin);
router.get('/summary',async(_req,res,next)=>{try{const [users,txs,pending]=await Promise.all([query<{count:number}>(`select count(*)::int count from app_users`),query<{count:number}>(`select count(*)::int count from ledger_transactions`),query<{count:number}>(`select count(*)::int count from withdrawal_requests where status='pending'`)]);res.json({users:users.rows[0]?.count??0,transactions:txs.rows[0]?.count??0,pendingWithdrawals:pending.rows[0]?.count??0});}catch(e){next(e)}});
router.get('/audit-logs',async(_req,res,next)=>{try{const r=await query(`select id,actor_user_id,action,entity_type,entity_id,metadata,created_at from audit_logs order by created_at desc limit 200`);res.json({logs:r.rows});}catch(e){next(e)}});
export default router;

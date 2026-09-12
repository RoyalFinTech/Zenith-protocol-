import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/http.js';
const router=Router(); router.use(requireAuth);
router.get('/',async(req,res,next)=>{try{const limit=Math.min(Number(req.query.limit??50),200); const r=await query(`select id,occurred_at,type,program_code,amount,asset,status,reference,tx_hash,description from ledger_transactions where user_id=$1 order by occurred_at desc limit $2`,[req.auth!.userId,limit]);res.json({transactions:r.rows});}catch(e){next(e)}});
router.post('/withdrawals',async(req,res,next)=>{try{const amount=Number(req.body?.amount);const address=String(req.body?.address??'');if(!Number.isFinite(amount)||amount<=0)throw new HttpError(400,'Valid positive amount required'); if(!/^0x[a-fA-F0-9]{40}$/.test(address))throw new HttpError(400,'Valid EVM destination address required'); const r=await query(`insert into withdrawal_requests(user_id,amount,asset,destination_address,status) values($1,$2,$3,$4,'pending') returning id,amount,asset,destination_address,status,created_at`,[req.auth!.userId,amount,process.env.PRIMARY_ASSET??'USDT',address]);res.status(201).json({withdrawal:r.rows[0]});}catch(e){next(e)}});
export default router;

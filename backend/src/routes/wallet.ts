import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { getAddress } from 'viem';
import { HttpError } from '../utils/http.js';

const router=Router(); router.use(requireAuth);
router.get('/', async(req,res,next)=>{try{const r=await query(`select id,address,chain_id,label,is_primary,verified_at,created_at from wallet_accounts where user_id=$1 order by is_primary desc,created_at`,[req.auth!.userId]);res.json({wallets:r.rows});}catch(e){next(e)}});
router.post('/bind', async(req,res,next)=>{try{const raw=String(req.body?.address??''); if(!/^0x[a-fA-F0-9]{40}$/.test(raw)) throw new HttpError(400,'Valid EVM address required'); const address=getAddress(raw); if(address.toLowerCase()!==req.auth!.walletAddress.toLowerCase()) throw new HttpError(403,'Wallet does not match authenticated wallet'); const r=await query<{id:string;address:string;chain_id:number;is_primary:boolean;verified_at:string}>(`insert into wallet_accounts(user_id,address,chain_id,is_primary,verified_at) values($1,$2,$3,true,now()) on conflict(user_id,address,chain_id) do update set verified_at=now(),is_primary=true returning id,address,chain_id,is_primary,verified_at`,[req.auth!.userId,address,Number(process.env.CHAIN_ID??56)]); await query(`update wallet_accounts set is_primary=false where user_id=$1 and id<>$2`,[req.auth!.userId,r.rows[0]!.id]); res.status(201).json({wallet:r.rows[0]});}catch(e){next(e)}});
router.delete('/:id', async(req,res,next)=>{try{const r=await query(`delete from wallet_accounts where id=$1 and user_id=$2 returning id`,[req.params.id,req.auth!.userId]); if(!r.rows[0]) throw new HttpError(404,'Wallet not found'); res.status(204).end();}catch(e){next(e)}});
export default router;

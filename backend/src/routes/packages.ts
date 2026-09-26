import { Router } from 'express';
import { pool, query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/http.js';
import { env } from '../config.js';
import { createPublicClient, erc20Abi, getAddress, http, parseEventLogs, parseUnits } from 'viem';
import { bsc } from 'viem/chains';

const router = Router();
router.use(requireAuth);

const publicClient = createPublicClient({ chain: bsc, transport: http(env.bscRpcUrl) });

function receiverAddress() {
  if (!env.paymentReceiverAddress) throw new HttpError(503, 'Package payment receiver is not configured');
  return getAddress(env.paymentReceiverAddress);
}

async function tokenMetadata() {
  const token = getAddress(env.usdtContractAddress);
  const [decimals, symbol] = await Promise.all([
    publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'decimals' }),
    publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'symbol' })
  ]);
  if (symbol !== env.primaryAsset) throw new HttpError(503, 'Configured USDT contract does not match the primary asset');
  return { token, decimals };
}

router.get('/catalog', async (_req, res, next) => {
  try {
    const r = await query(`
      select pp.id, pp.code, pp.name, pp.tier, pp.description, pp.price, pp.asset,
             p.code as program_code, p.name as program_name, p.levels, p.capacity
      from program_packages pp
      join programs p on p.id=pp.program_id
      where pp.active=true and p.active=true
      order by p.sort_order, pp.sort_order
    `);
    res.json({ packages: r.rows, paymentConfigured: Boolean(env.paymentReceiverAddress) });
  } catch (e) { next(e); }
});

router.post('/purchases', async (req, res, next) => {
  try {
    const packageCode = String(req.body?.packageCode ?? '').trim();
    const referralCode = String(req.body?.referralCode ?? '').trim().toUpperCase() || null;
    if (!packageCode) throw new HttpError(400, 'Package code is required');

    const receiver = receiverAddress();
    const tokenInfo = await tokenMetadata();

    const packageRow = (await query<{
      id:string; code:string; name:string; price:string|null; asset:string;
      program_id:string; program_code:string; program_name:string; levels:number; capacity:number;
    }>(`
      select pp.id,pp.code,pp.name,pp.price,pp.asset,
             p.id as program_id,p.code as program_code,p.name as program_name,p.levels,p.capacity
      from program_packages pp
      join programs p on p.id=pp.program_id
      where pp.code=$1 and pp.active=true and p.active=true
      limit 1
    `, [packageCode])).rows[0];

    if (!packageRow) throw new HttpError(404, 'Package not found');
    if (packageRow.price == null) throw new HttpError(409, 'This package is not priced for purchase yet');
    if (packageRow.asset !== env.primaryAsset) throw new HttpError(409, 'This package uses an unsupported settlement asset');

    const membership = (await query(`
      select 1 from matrix_memberships m join programs p on p.id=m.program_id
      where m.user_id=$1 and p.code=$2 limit 1
    `, [req.auth!.userId, packageRow.program_code])).rows[0];
    if (membership) throw new HttpError(409, 'You already have a position in this program');


    let referrerId: string | null = null;
    if (referralCode) {
      referrerId = (await query<{id:string}>(`select id from app_users where referral_code=$1 limit 1`, [referralCode])).rows[0]?.id ?? null;
      if (!referrerId) throw new HttpError(400, 'Referral code not found');
      if (referrerId === req.auth!.userId) throw new HttpError(400, 'You cannot use your own referral code');
    }

    const pending = (await query(`
      select id,created_at from package_purchases
      where user_id=$1 and package_id=$2 and status='pending'
      order by created_at desc limit 1
    `, [req.auth!.userId, packageRow.id])).rows[0];

    if (!pending) {
      const capacity = (await query<{available:boolean}>(`select exists(select 1 from matrix_nodes where program_id=$1 and status='available') as available`, [packageRow.program_id])).rows[0]?.available;
      if (!capacity) throw new HttpError(409, 'No available matrix position remains in this program');
    }

    const purchase = pending ?? (await query(`
      insert into package_purchases(user_id,package_id,referral_code,referrer_user_id,amount,asset,status)
      values($1,$2,$3,$4,$5,$6,'pending') returning id,created_at
    `, [req.auth!.userId, packageRow.id, referralCode, referrerId, packageRow.price, packageRow.asset])).rows[0];
    if (!purchase) throw new HttpError(500, 'Unable to create package purchase');

    res.status(pending ? 200 : 201).json({
      purchase: {
        id: purchase.id, packageCode: packageRow.code, packageName: packageRow.name,
        programCode: packageRow.program_code, programName: packageRow.program_name,
        amount: packageRow.price, asset: packageRow.asset, chainId: env.chainId,
        receiver, token: tokenInfo.token, decimals: tokenInfo.decimals
      }
    });
  } catch (e) {
    const pgCode = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code?: unknown }).code ?? '') : '';
    if (pgCode === '23505' && String(e).includes('uq_package_purchases_one_pending_per_user_package')) {
      return next(new HttpError(409, 'A package purchase is already pending for this package'));
    }
    next(e);
  }
});

router.get('/purchases', async (req,res,next)=>{try{const limit=Math.min(Math.max(Number(req.query.limit??20),1),100);const r=await query(`select pp.id,pp.amount,pp.asset,pp.status,pp.payment_tx_hash,pp.created_at,pp.confirmed_at,pp.settlement_block_number,pp.settlement_confirmations,pp.referral_code,pp.settlement_error,ppk.code as package_code,ppk.name as package_name,p.code as program_code,p.name as program_name from package_purchases pp join program_packages ppk on ppk.id=pp.package_id join programs p on p.id=ppk.program_id where pp.user_id=$1 order by pp.created_at desc limit $2`,[req.auth!.userId,limit]);res.json({purchases:r.rows});}catch(e){next(e)}});
router.post('/purchases/:purchaseId/confirm', async (req, res, next) => {
  const client = await pool.connect();
  const purchaseId = String(req.params.purchaseId);
  try {
    const txHash = String(req.body?.txHash ?? '').trim() as `0x${string}`;
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) throw new HttpError(400, 'Valid transaction hash required');

    const purchase = (await query<{
      id:string; user_id:string; package_id:string; amount:string; asset:string; status:string;
      referrer_user_id:string|null; package_code:string; program_code:string; program_id:string;
    }>(`
      select pp.id,pp.user_id,pp.package_id,pp.amount,pp.asset,pp.status,pp.referrer_user_id,
             ppk.code as package_code,p.code as program_code,p.id as program_id
      from package_purchases pp
      join program_packages ppk on ppk.id=pp.package_id
      join programs p on p.id=ppk.program_id
      where pp.id=$1 and pp.user_id=$2 limit 1
    `, [purchaseId, req.auth!.userId])).rows[0];

    if (!purchase) throw new HttpError(404, 'Purchase not found');
    if (purchase.status === 'confirmed') throw new HttpError(409, 'Purchase is already confirmed');
    if (purchase.status !== 'pending') throw new HttpError(409, 'Purchase is not pending');

    const receiver = receiverAddress();
    const { token, decimals } = await tokenMetadata();
    const duplicateTx = (await query(`select id from package_purchases where payment_tx_hash=$1 limit 1`, [txHash])).rows[0];
    if (duplicateTx && duplicateTx.id !== purchaseId) throw new HttpError(409, 'This transaction hash has already been used for another package purchase');
    const expectedAmount = parseUnits(String(purchase.amount), decimals);

    const tx = await publicClient.getTransaction({ hash: txHash }).catch(() => null);
    if (!tx) throw new HttpError(400, 'Transaction was not found on BNB Smart Chain');
    if (tx.chainId != null && Number(tx.chainId) !== env.chainId) throw new HttpError(400, 'Transaction is on the wrong network');
    if (!tx.from || tx.from.toLowerCase() !== req.auth!.walletAddress.toLowerCase()) throw new HttpError(403, 'Transaction sender does not match the authenticated wallet');
    if (!tx.to || tx.to.toLowerCase() !== token.toLowerCase()) throw new HttpError(400, 'Transaction is not a USDT token transfer');

    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    if (receipt.status !== 'success') throw new HttpError(400, 'The submitted transaction failed on-chain');

    const currentBlock = await publicClient.getBlockNumber();
    const confirmations = Number(currentBlock - receipt.blockNumber + 1n);
    if (confirmations < env.paymentConfirmations) throw new HttpError(409, `Transaction needs ${env.paymentConfirmations} confirmations; currently ${confirmations}`);

    const transfers = parseEventLogs({ abi: erc20Abi, eventName: 'Transfer', logs: receipt.logs, strict: false });
    const matched = transfers.find(log =>
      log.address.toLowerCase() === token.toLowerCase() &&
      String(log.args.from).toLowerCase() === req.auth!.walletAddress.toLowerCase() &&
      String(log.args.to).toLowerCase() === receiver.toLowerCase() &&
      log.args.value === expectedAmount
    );
    if (!matched) throw new HttpError(400, 'No exact USDT transfer to the configured payment receiver was found in this transaction');

    await client.query('begin');

    const fresh = (await client.query(`select id,status,payment_tx_hash from package_purchases where id=$1 and user_id=$2 for update`, [purchaseId, req.auth!.userId])).rows[0];
    if (!fresh) throw new HttpError(404, 'Purchase not found');
    if (fresh.status === 'confirmed') { await client.query('commit'); return res.json({ status:'confirmed', purchase:fresh }); }
    if (fresh.status !== 'pending') throw new HttpError(409, 'Purchase is no longer pending');

    const membership = (await client.query(`select 1 from matrix_memberships where user_id=$1 and program_id=$2 limit 1`, [req.auth!.userId, purchase.program_id])).rows[0];
    if (membership) throw new HttpError(409, 'A position already exists for this program');

    const node = (await client.query<{id:string;position:number;level:number}>(`
      select id,position,level from matrix_nodes where program_id=$1 and status='available'
      order by position asc for update skip locked limit 1
    `, [purchase.program_id])).rows[0];
    if (!node) throw new HttpError(409, 'No available matrix position remains in this program');

    await client.query(`update matrix_nodes set status='active',user_id=$1,referrer_user_id=$2,activated_at=now() where id=$3`, [req.auth!.userId,purchase.referrer_user_id,node.id]);

    const membershipRow = (await client.query<{id:string}>(`
      insert into matrix_memberships(user_id,program_id,node_id,referrer_user_id,level,position,status)
      values($1,$2,$3,$4,$5,$6,'active') returning id
    `, [req.auth!.userId,purchase.program_id,node.id,purchase.referrer_user_id,node.level,node.position])).rows[0];

    await client.query(`
      update package_purchases set status='confirmed',payment_tx_hash=$2,settlement_error=null,confirmed_at=now(),
      settlement_block_number=$3,settlement_confirmations=$4 where id=$1
    `, [purchaseId,txHash,receipt.blockNumber,confirmations]);

    await client.query(`
      insert into ledger_transactions(user_id,type,program_code,amount,asset,status,reference,tx_hash,description,metadata)
      values($1,'deposit',$2,$3,$4,'completed',$5,$6,$7,$8::jsonb) on conflict (reference) do nothing
    `, [
      req.auth!.userId,purchase.program_code,purchase.amount,purchase.asset,
      `package:${purchaseId}:payment`,txHash,'Package payment verified on-chain',
      JSON.stringify({purchaseId,packageCode:purchase.package_code,receiver,token,confirmations})
    ]);

    const economics = (await client.query<{entry_amount:string;direct_percent:string;matrix_percent:string}>(`
      select entry_amount,direct_percent,matrix_percent from package_economics where package_id=$1 limit 1
    `, [purchase.package_id])).rows[0];

    if (economics) {
      if (purchase.referrer_user_id) {
        const directAmount = (await client.query<{amount:string}>(`select ($1::numeric * $2::numeric / 100)::text as amount`, [economics.entry_amount, economics.direct_percent])).rows[0]?.amount;
        if (directAmount == null) throw new HttpError(500, 'Unable to calculate direct referral earning');
        await client.query(`
          insert into ledger_transactions(user_id,type,program_code,amount,asset,status,reference,description,metadata)
          values($1,'earned',$2,$3,$4,'completed',$5,$6,$7::jsonb) on conflict (reference) do nothing
        `, [
          purchase.referrer_user_id,purchase.program_code,directAmount,purchase.asset,
          `package:${purchaseId}:direct:${purchase.referrer_user_id}`,
          'Direct referral earning from confirmed package purchase',
          JSON.stringify({purchaseId,sourceUserId:req.auth!.userId,percent:economics.direct_percent})
        ]);
      }

      const rules = (await client.query<{level:number;percent_of_matrix_pool:string}>(`
        select level,percent_of_matrix_pool from matrix_distribution_rules where package_id=$1 order by level
      `, [purchase.package_id])).rows;

      let upline = purchase.referrer_user_id;
      for (const rule of rules) {
        if (!upline) break;
        const matrixAmount = (await client.query<{amount:string}>(`select ($1::numeric * $2::numeric / 100 * $3::numeric / 100)::text as amount`, [economics.entry_amount, economics.matrix_percent, rule.percent_of_matrix_pool])).rows[0]?.amount;
        if (matrixAmount == null) throw new HttpError(500, 'Unable to calculate matrix earning');
        await client.query(`
          insert into matrix_earnings(purchase_id,recipient_user_id,source_user_id,level,amount,asset,status)
          values($1,$2,$3,$4,$5,$6,'credited') on conflict (purchase_id,recipient_user_id,level) do nothing
        `, [purchaseId,upline,req.auth!.userId,rule.level,matrixAmount,purchase.asset]);
        await client.query(`
          insert into ledger_transactions(user_id,type,program_code,amount,asset,status,reference,description,metadata)
          values($1,'earned',$2,$3,$4,'completed',$5,$6,$7::jsonb) on conflict (reference) do nothing
        `, [
          upline,purchase.program_code,matrixAmount,purchase.asset,
          `package:${purchaseId}:matrix:${rule.level}:${upline}`,
          `Matrix level ${rule.level} earning from confirmed package purchase`,
          JSON.stringify({purchaseId,sourceUserId:req.auth!.userId,level:rule.level,percentOfMatrixPool:rule.percent_of_matrix_pool})
        ]);
        upline = (await client.query<{referrer_user_id:string|null}>(`
          select referrer_user_id from matrix_memberships where user_id=$1 and program_id=$2 limit 1
        `, [upline,purchase.program_id])).rows[0]?.referrer_user_id ?? null;
      }
    }

    await client.query(`
      insert into audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
      values($1,'package_purchase_confirmed','package_purchase',$2,$3::jsonb)
    `, [req.auth!.userId,purchaseId,JSON.stringify({
      txHash,packageCode:purchase.package_code,programCode:purchase.program_code,
      position:node.position,level:node.level,membershipId:membershipRow?.id
    })]);

    await client.query('commit');
    res.json({ status:'confirmed', purchase:{id:purchaseId,packageCode:purchase.package_code,programCode:purchase.program_code,position:node.position,level:node.level,txHash,confirmations} });
  } catch (e) {
    await client.query('rollback').catch(()=>{});
    const pgCode = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code?: unknown }).code ?? '') : '';
    const isPaymentTxConflict = pgCode === '23505' && String(e).includes('uq_package_purchases_payment_tx_hash');
    const status = e instanceof HttpError ? e.status : (isPaymentTxConflict ? 409 : 500);
    if (status >= 400 && status < 500) {
      const message = e instanceof HttpError
        ? e.message
        : 'This transaction has already been used for another package purchase';
      await query(`update package_purchases set settlement_error=$2 where id=$1 and user_id=$3 and status='pending'`, [purchaseId, message, req.auth!.userId]).catch(()=>{});
      if (isPaymentTxConflict) {
        return next(new HttpError(409, message));
      }
    }
    next(e);
  } finally {
    client.release();
  }
});

export default router;

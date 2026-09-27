import { Router } from 'express';
import { pool, query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError, parseLimit } from '../utils/http.js';
import { env } from '../config.js';
import { createPublicClient, erc20Abi, getAddress, http, parseEventLogs, parseUnits } from 'viem';
import { bsc } from 'viem/chains';
import { isUniqueConstraintViolation } from '../utils/financial.js';
import { createUserNotification } from '../services/notifications.js';

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
      id:string; code:string; name:string; tier:string; price:string|null; asset:string;
      program_id:string; program_code:string; program_name:string; levels:number; capacity:number;
    }>(`
      select pp.id,pp.code,pp.name,pp.tier,pp.price,pp.asset,
             p.id as program_id,p.code as program_code,p.name as program_name,p.levels,p.capacity
      from program_packages pp
      join programs p on p.id=pp.program_id
      where pp.code=$1 and pp.active=true and p.active=true
      limit 1
    `, [packageCode])).rows[0];

    if (!packageRow) throw new HttpError(404, 'Package not found');
    if (!['starter','growth','elite'].includes(packageRow.tier)) throw new HttpError(409, 'Unsupported package tier');
    if (packageRow.price == null) throw new HttpError(409, 'This package is not priced for purchase yet');
    if (packageRow.asset !== env.primaryAsset) throw new HttpError(409, 'This package uses an unsupported settlement asset');

    const membership = (await query<{package_tier:string;referrer_user_id:string|null}>(`
      select package_tier,referrer_user_id from matrix_memberships m
      where m.user_id=$1 and m.program_id=$2 and m.status in ('active','completed')
      limit 1
    `, [req.auth!.userId, packageRow.program_id])).rows[0];

    if (packageRow.tier === 'starter' && membership) {
      throw new HttpError(409, 'You already have a position in this program. Use the next package tier to upgrade it.');
    }
    if (packageRow.tier === 'growth' && (!membership || membership.package_tier !== 'starter')) {
      throw new HttpError(409, 'Growth unlocks after a confirmed Starter purchase in this program');
    }
    if (packageRow.tier === 'elite' && (!membership || membership.package_tier !== 'growth')) {
      throw new HttpError(409, 'Elite unlocks after a confirmed Growth purchase in this program');
    }

    let referrerId: string | null = null;
    if (packageRow.tier !== 'starter') {
      if (referralCode) throw new HttpError(400, 'Referral codes can only be supplied with the Starter purchase');
      referrerId = membership?.referrer_user_id ?? null;
    } else if (referralCode) {
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
      if (packageRow.tier === 'starter') {
        const capacity = (await query<{available:boolean}>(`
          select exists(
            select 1
            from matrix_nodes n
            where n.program_id=$1
              and n.status='available'
              and (
                n.position=1
                or exists (
                  select 1
                  from matrix_nodes parent
                  where parent.program_id=n.program_id
                    and parent.position=floor(n.position/2)::int
                    and parent.status='active'
                )
              )
          ) as available
        `, [packageRow.program_id])).rows[0]?.available;
        if (!capacity) throw new HttpError(409, 'No eligible matrix position remains in this program');
      }
    }

    const purchase = pending ?? (await query(`
      insert into package_purchases(user_id,package_id,referral_code,referrer_user_id,amount,asset,status)
      values($1,$2,$3,$4,$5,$6,'pending') returning id,created_at
    `, [req.auth!.userId, packageRow.id, referralCode, referrerId, packageRow.price, packageRow.asset])).rows[0];
    if (!purchase) throw new HttpError(500, 'Unable to create package purchase');
    if (!pending) {
      const notifyClient = await pool.connect();
      try {
        await notifyClient.query('begin');
        await createUserNotification(
          notifyClient,
          req.auth!.userId,
          'Package purchase created',
          `${packageRow.name} is pending payment confirmation. Complete the USDT transfer and submit its transaction hash.`
        );
        await notifyClient.query('commit');
      } catch (notificationError) {
        await notifyClient.query('rollback').catch(()=>{});
        // The purchase itself is valid even if the informational notification cannot be written.
        console.warn('package purchase notification failed', notificationError);
      } finally {
        notifyClient.release();
      }
    }

    res.status(pending ? 200 : 201).json({
      purchase: {
        id: purchase.id, packageCode: packageRow.code, packageName: packageRow.name,
        programCode: packageRow.program_code, programName: packageRow.program_name,
        amount: packageRow.price, asset: packageRow.asset, chainId: env.chainId,
        receiver, token: tokenInfo.token, decimals: tokenInfo.decimals
      }
    });
  } catch (e) {
    if (isUniqueConstraintViolation(e, 'uq_package_purchases_one_pending_per_user_package')) {
      return next(new HttpError(409, 'A package purchase is already pending for this package'));
    }
    if (isUniqueConstraintViolation(e, 'uq_package_purchases_payment_tx_hash') ||
        isUniqueConstraintViolation(e, 'package_purchases_payment_tx_hash_key')) {
      return next(new HttpError(409, 'This transaction hash has already been used for another package purchase'));
    }
    next(e);
  }
});

router.get('/purchases', async (req,res,next)=>{try{const limit=parseLimit(req.query.limit,20,100);const r=await query(`select pp.id,pp.amount,pp.asset,pp.status,pp.payment_tx_hash,pp.created_at,pp.confirmed_at,pp.settlement_block_number,pp.settlement_confirmations,pp.referral_code,pp.settlement_error,ppk.code as package_code,ppk.name as package_name,p.code as program_code,p.name as program_name from package_purchases pp join program_packages ppk on ppk.id=pp.package_id join programs p on p.id=ppk.program_id where pp.user_id=$1 order by pp.created_at desc limit $2`,[req.auth!.userId,limit]);res.json({purchases:r.rows});}catch(e){next(e)}});
router.post('/purchases/:purchaseId/confirm', async (req, res, next) => {
  const client = await pool.connect();
  const purchaseId = String(req.params.purchaseId);
  try {
    const txHash = String(req.body?.txHash ?? '').trim() as `0x${string}`;
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) throw new HttpError(400, 'Valid transaction hash required');

    const purchase = (await query<{
      id:string; user_id:string; package_id:string; amount:string; asset:string; status:string; payment_tx_hash:string|null;
      referrer_user_id:string|null; package_code:string; program_code:string; program_id:string;
    }>(`
      select pp.id,pp.user_id,pp.package_id,pp.amount,pp.asset,pp.status,pp.payment_tx_hash,pp.referrer_user_id,
             ppk.code as package_code,p.code as program_code,p.id as program_id
      from package_purchases pp
      join program_packages ppk on ppk.id=pp.package_id
      join programs p on p.id=ppk.program_id
      where pp.id=$1 and pp.user_id=$2 limit 1
    `, [purchaseId, req.auth!.userId])).rows[0];

    if (!purchase) throw new HttpError(404, 'Purchase not found');
    if (purchase.status === 'confirmed') {
      if (purchase.payment_tx_hash?.toLowerCase() === txHash.toLowerCase()) {
        return res.json({ status:'confirmed', purchase:{ id:purchase.id, packageCode:purchase.package_code, programCode:purchase.program_code, txHash } });
      }
      throw new HttpError(409, 'Purchase is already confirmed with a different transaction');
    }
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

    const packageInfo = (await client.query<{tier:string;entry_amount:string;direct_percent:string;matrix_percent:string;admin_percent:string}>(`
      select pp.tier,e.entry_amount,e.direct_percent,e.matrix_percent,e.admin_percent
      from program_packages pp
      join package_economics e on e.package_id=pp.id
      where pp.id=$1
      limit 1
    `, [purchase.package_id])).rows[0];
    if (!packageInfo) throw new HttpError(409, 'Package economics are not configured');

    let node: {id:string;position:number;level:number} | undefined;
    let membershipRow: {id:string} | undefined;
    let parentNodeId: string | null = null;

    const existingMembership = (await client.query<{id:string;node_id:string|null;package_tier:string;referrer_user_id:string|null;status:string}>(`
      select id,node_id,package_tier,referrer_user_id,status
      from matrix_memberships
      where user_id=$1 and program_id=$2
      for update
    `, [req.auth!.userId,purchase.program_id])).rows[0];

    if (packageInfo.tier === 'starter') {
      if (existingMembership) throw new HttpError(409, 'A position already exists for this program');
      if (purchase.referrer_user_id) {
        const sponsor = (await client.query<{node_id:string|null}>(`
          select node_id from matrix_memberships where user_id=$1 and program_id=$2 and status='active' limit 1
        `, [purchase.referrer_user_id,purchase.program_id])).rows[0];
        if (sponsor?.node_id) {
          const candidate = (await client.query<{id:string;position:number;level:number}>(`
            with recursive subtree as (
              select n.id,n.position,n.level
              from matrix_nodes n
              where n.id=$3 and n.program_id=$1 and n.status='active'
              union all
              select c.id,c.position,c.level
              from matrix_nodes c
              join subtree p on c.program_id=$1 and c.position in (p.position*2,p.position*2+1)
              where c.status in ('active','available')
            )
            select n.id,n.position,n.level
            from matrix_nodes n
            join subtree s on s.id=n.id
            where n.status='available'
              and n.id<>$3
              and exists (
                select 1
                from matrix_nodes parent
                where parent.program_id=n.program_id
                  and parent.position=floor(n.position/2)::int
                  and parent.status='active'
              )
            order by n.level,n.position
            for update skip locked
            limit 1
          `, [purchase.program_id,purchase.program_id,sponsor.node_id])).rows[0];
          if (candidate) {
            node=candidate;
            parentNodeId=(await client.query<{id:string}>(`
              select id from matrix_nodes
              where program_id=$1 and position=floor($2/2)::int and status='active'
              limit 1
            `,[purchase.program_id,candidate.position])).rows[0]?.id ?? null;
            if (!parentNodeId) { node=undefined; }
          }
        }
      }
      if (!node) {
        node=(await client.query<{id:string;position:number;level:number}>(`
          select n.id,n.position,n.level
          from matrix_nodes n
          where n.program_id=$1
            and n.status='available'
            and (
              n.position=1
              or exists (
                select 1 from matrix_nodes parent
                where parent.program_id=n.program_id
                  and parent.position=floor(n.position/2)::int
                  and parent.status='active'
              )
            )
          order by n.position asc
          for update skip locked limit 1
        `, [purchase.program_id])).rows[0];
      }
      if (!node) throw new HttpError(409, 'No available matrix position remains in this program');
      if (!parentNodeId && node.position > 1) {
        parentNodeId=(await client.query<{id:string}>(`select id from matrix_nodes where program_id=$1 and position=floor($2/2)::int and status='active' limit 1`,[purchase.program_id,node.position])).rows[0]?.id ?? null;
        if (node.position > 1 && !parentNodeId) throw new HttpError(409, 'Matrix parent position is not active');
      }
      await client.query(`update matrix_nodes set status='active',user_id=$1,referrer_user_id=$2,activated_at=now() where id=$3`, [req.auth!.userId,purchase.referrer_user_id,node.id]);
      membershipRow=(await client.query<{id:string}>(`
        insert into matrix_memberships(user_id,program_id,node_id,referrer_user_id,level,position,status,package_id,package_tier,parent_node_id)
        values($1,$2,$3,$4,$5,$6,'active',$7,$8,$9) returning id
      `, [req.auth!.userId,purchase.program_id,node.id,purchase.referrer_user_id,node.level,node.position,purchase.package_id,packageInfo.tier,parentNodeId])).rows[0];
    } else {
      if (!existingMembership || existingMembership.status === 'completed') throw new HttpError(409, `A ${packageInfo.tier === 'growth' ? 'Starter' : 'Growth'} membership is required before this upgrade`);
      const updated=(await client.query<{id:string;node_id:string|null;position:number;level:number}>(`
        update matrix_memberships set package_id=$2,package_tier=$3,updated_at=now()
        where id=$1
        returning id,node_id,position,level
      `, [existingMembership.id,purchase.package_id,packageInfo.tier])).rows[0];
      if (!updated) throw new HttpError(409, 'Unable to upgrade matrix membership');
      membershipRow={id:updated.id};
      if (updated.node_id) node={id:updated.node_id,position:updated.position,level:updated.level};
    }

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

    const economics = (await client.query<{entry_amount:string;direct_percent:string;matrix_percent:string;admin_percent:string}>(`
      select entry_amount,direct_percent,matrix_percent,admin_percent
      from package_economics where package_id=$1 limit 1
    `, [purchase.package_id])).rows[0];

    if (economics) {
      const directAmount = (await client.query<{amount:string}>(`select ($1::numeric * $2::numeric / 100)::text as amount`, [purchase.amount, economics.direct_percent])).rows[0]?.amount;
      const matrixAmount = (await client.query<{amount:string}>(`select ($1::numeric * $2::numeric / 100)::text as amount`, [purchase.amount, economics.matrix_percent])).rows[0]?.amount;
      const adminAmount = (await client.query<{amount:string}>(`select ($1::numeric * $2::numeric / 100)::text as amount`, [purchase.amount, economics.admin_percent])).rows[0]?.amount;
      if (directAmount == null || matrixAmount == null || adminAmount == null) throw new HttpError(500, 'Unable to calculate package allocation');

      await client.query(`update package_purchases set direct_amount=$2,matrix_amount=$3,admin_amount=$4 where id=$1`, [purchaseId,directAmount,matrixAmount,adminAmount]);

      if (purchase.referrer_user_id) {
        await client.query(`
          insert into ledger_transactions(user_id,type,program_code,amount,asset,status,reference,description,metadata)
          values($1,'earned',$2,$3,$4,'completed',$5,$6,$7::jsonb) on conflict (reference) do nothing
        `, [
          purchase.referrer_user_id,purchase.program_code,directAmount,purchase.asset,
          `package:${purchaseId}:direct:${purchase.referrer_user_id}`,
          'Direct referral earning from confirmed package purchase',
          JSON.stringify({purchaseId,sourceUserId:req.auth!.userId,percent:economics.direct_percent,tier:packageInfo.tier})
        ]);
      } else {
        await client.query(`update package_purchases set unallocated_direct_amount=$2 where id=$1`,[purchaseId,directAmount]);
        await client.query(`
          insert into platform_revenue_ledger(package_purchase_id,kind,amount,asset,metadata)
          values($1,'unallocated_direct',$2,$3,$4::jsonb) on conflict (package_purchase_id,kind) do nothing
        `,[purchaseId,directAmount,purchase.asset,JSON.stringify({reason:'No sponsor on confirmed purchase',purchaseAmount:purchase.amount})]);
      }

      const rules = (await client.query<{level:number;percent_of_matrix_pool:string}>(`
        select level,percent_of_matrix_pool from matrix_distribution_rules where package_id=$1 order by level
      `, [purchase.package_id])).rows;

      let currentNodeId = parentNodeId;
      let allocatedMatrix = '0';
      for (const rule of rules) {
        if (!currentNodeId) break;
        const ancestor = (await client.query<{user_id:string;parent_node_id:string|null}>(`
          select m.user_id,m.parent_node_id
          from matrix_memberships m
          where m.node_id=$1 and m.status='active'
          limit 1
        `, [currentNodeId])).rows[0];
        if (!ancestor) break;
        const matrixLevelAmount = (await client.query<{amount:string}>(`select ($1::numeric * $2::numeric / 100)::text as amount`, [matrixAmount, rule.percent_of_matrix_pool])).rows[0]?.amount;
        if (matrixLevelAmount == null) throw new HttpError(500, 'Unable to calculate matrix earning');
        await client.query(`
          insert into matrix_earnings(purchase_id,recipient_user_id,source_user_id,level,amount,asset,status)
          values($1,$2,$3,$4,$5,$6,'credited') on conflict (purchase_id,recipient_user_id,level) do nothing
        `, [purchaseId,ancestor.user_id,req.auth!.userId,rule.level,matrixLevelAmount,purchase.asset]);
        await client.query(`
          insert into ledger_transactions(user_id,type,program_code,amount,asset,status,reference,description,metadata)
          values($1,'earned',$2,$3,$4,'completed',$5,$6,$7::jsonb) on conflict (reference) do nothing
        `, [
          ancestor.user_id,purchase.program_code,matrixLevelAmount,purchase.asset,
          `package:${purchaseId}:matrix:${rule.level}:${ancestor.user_id}`,
          `Matrix level ${rule.level} earning from confirmed package purchase`,
          JSON.stringify({purchaseId,sourceUserId:req.auth!.userId,level:rule.level,percentOfMatrixPool:rule.percent_of_matrix_pool,tier:packageInfo.tier})
        ]);
        allocatedMatrix=(await client.query<{amount:string}>(`select ($1::numeric + $2::numeric)::text as amount`,[allocatedMatrix,matrixLevelAmount])).rows[0]!.amount;
        currentNodeId=ancestor.parent_node_id;
      }

      const unallocatedMatrix=(await client.query<{amount:string}>(`select greatest($1::numeric-$2::numeric,0)::text as amount`,[matrixAmount,allocatedMatrix])).rows[0]!.amount;
      if (Number(unallocatedMatrix)>0) {
        await client.query(`update package_purchases set unallocated_matrix_amount=$2 where id=$1`,[purchaseId,unallocatedMatrix]);
        await client.query(`
          insert into platform_revenue_ledger(package_purchase_id,kind,amount,asset,metadata)
          values($1,'unallocated_matrix',$2,$3,$4::jsonb) on conflict (package_purchase_id,kind) do nothing
        `,[purchaseId,unallocatedMatrix,purchase.asset,JSON.stringify({reason:'No eligible matrix ancestor at one or more levels',purchaseAmount:purchase.amount,matrixPool:matrixAmount,allocatedMatrix})]);
      }

      await client.query(`
        insert into platform_revenue_ledger(package_purchase_id,kind,amount,asset,metadata)
        values($1,'admin_revenue',$2,$3,$4::jsonb) on conflict (package_purchase_id,kind) do nothing
      `,[purchaseId,adminAmount,purchase.asset,JSON.stringify({percent:economics.admin_percent,packageCode:purchase.package_code,tier:packageInfo.tier})]);
    }

    if (!node) throw new HttpError(500, 'Matrix position was not resolved during settlement');

    await client.query(`
      insert into audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
      values($1,'package_purchase_confirmed','package_purchase',$2,$3::jsonb)
    `, [req.auth!.userId,purchaseId,JSON.stringify({
      txHash,packageCode:purchase.package_code,programCode:purchase.program_code,
      position:node.position,level:node.level,membershipId:membershipRow?.id
    })]);

    await createUserNotification(
      client,
      req.auth!.userId,
      'Package activated',
      `${purchase.package_code} payment was verified and your matrix position was activated at position #${node.position}.`
    );
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

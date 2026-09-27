import { pool } from '../db.js';
import { HttpError } from '../utils/http.js';
import { env } from '../config.js';
import { canTransitionWithdrawal, isUniqueConstraintViolation } from '../utils/financial.js';
import { createPublicClient, erc20Abi, getAddress, http, parseEventLogs, parseUnits } from 'viem';
import { bsc } from 'viem/chains';

const publicClient = createPublicClient({ chain: bsc, transport: http(env.bscRpcUrl) });

export async function transitionAdminWithdrawal(withdrawalId:string, actorAdminId:string, nextStatus:string, reason:string|null, actorUserId:string|null=null){
  if(!['approved','processing','rejected','failed'].includes(nextStatus)){
    throw new HttpError(400,'Allowed status changes: approved, processing, rejected, failed');
  }
  const client=await pool.connect();
  try{
    await client.query('begin');
    const current=(await client.query<{id:string;user_id:string;status:string}>(
      'select id,user_id,status from withdrawal_requests where id=$1 for update',[withdrawalId]
    )).rows[0];
    if(!current) throw new HttpError(404,'Withdrawal not found');
    if(!canTransitionWithdrawal(current.status,nextStatus)){
      throw new HttpError(409,`Invalid withdrawal transition ${current.status} -> ${nextStatus}`);
    }
    if(['rejected','failed'].includes(nextStatus) && !reason){
      throw new HttpError(400,'A rejection/failure reason is required');
    }
    if(['approved','processing'].includes(nextStatus)){
      const reservation=await client.query(
        "select id from ledger_transactions where reference=$1 and type='withdrawal' and status='pending' for update",
        [`withdrawal:${withdrawalId}`]
      );
      if(reservation.rowCount!==1){
        throw new HttpError(409,'Withdrawal reservation ledger entry is missing or already finalized');
      }
    }
    const updated=(await client.query(
      `update withdrawal_requests
       set status=$1,rejection_reason=$2,updated_at=now()
       where id=$3
       returning id,amount,asset,destination_address,status,tx_hash,rejection_reason,created_at,updated_at`,
      [nextStatus,reason,withdrawalId]
    )).rows[0];
    if(['rejected','failed'].includes(nextStatus)){
      await client.query(
        "update ledger_transactions set status=$1,description=$2 where reference=$3 and type='withdrawal' and status='pending'",
        [nextStatus==='rejected'?'cancelled':'failed',
         nextStatus==='rejected'?'Withdrawal reservation released after rejection':'Withdrawal reservation released after payout failure',
         `withdrawal:${withdrawalId}`]
      );
    }
    await client.query(
      `insert into audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
       values($4,$1,'withdrawal_request',$2,$3::jsonb)`,
      [`admin_${nextStatus}`,withdrawalId,JSON.stringify({adminId:actorAdminId,previousStatus:current.status,nextStatus,reason}),actorUserId]
    );
    await client.query('commit');
    return updated;
  }catch(e){ await client.query('rollback').catch(()=>{}); throw e; }
  finally{ client.release(); }
}

export async function completeAdminWithdrawal(withdrawalId:string, actorAdminId:string, txHash:string, actorUserId:string|null=null){
  if(!/^0x[a-fA-F0-9]{64}$/.test(txHash)) throw new HttpError(400,'Valid payout transaction hash required');
  if(!env.payoutSenderAddress) throw new HttpError(503,'Payout sender is not configured');
  const payoutSender=getAddress(env.payoutSenderAddress);
  const token=getAddress(env.usdtContractAddress);
  const tokenDecimals=await publicClient.readContract({address:token,abi:erc20Abi,functionName:'decimals'});
  const client=await pool.connect();
  try{
    await client.query('begin');
    const row=(await client.query<{id:string;user_id:string;amount:string;asset:string;destination_address:string;status:string}>(
      'select id,user_id,amount,asset,destination_address,status from withdrawal_requests where id=$1 for update',[withdrawalId]
    )).rows[0];
    if(!row) throw new HttpError(404,'Withdrawal not found');
    if(row.status==='completed') throw new HttpError(409,'Withdrawal is already completed');
    if(row.status!=='processing') throw new HttpError(409,'Only processing withdrawals can be completed');
    if(row.asset!==env.primaryAsset) throw new HttpError(409,'Withdrawal asset is not supported for on-chain verification');
    const tx=await publicClient.getTransaction({hash:txHash}).catch(()=>null);
    if(!tx) throw new HttpError(400,'Payout transaction was not found on BNB Smart Chain');
    if(tx.chainId!=null&&Number(tx.chainId)!==env.chainId) throw new HttpError(400,'Payout transaction is on the wrong network');
    if(!tx.from||tx.from.toLowerCase()!==payoutSender.toLowerCase()) throw new HttpError(403,'Payout sender does not match the configured treasury address');
    if(!tx.to||tx.to.toLowerCase()!==token.toLowerCase()) throw new HttpError(400,'Payout transaction is not a USDT token transfer');
    const receipt=await publicClient.getTransactionReceipt({hash:txHash});
    if(receipt.status!=='success') throw new HttpError(400,'The payout transaction failed on-chain');
    const currentBlock=await publicClient.getBlockNumber();
    const confirmations=Number(currentBlock-receipt.blockNumber+1n);
    if(confirmations<env.paymentConfirmations) throw new HttpError(409,`Payout needs ${env.paymentConfirmations} confirmations; currently ${confirmations}`);
    const transfers=parseEventLogs({abi:erc20Abi,eventName:'Transfer',logs:receipt.logs,strict:false});
    const matched=transfers.find(log=>
      log.address.toLowerCase()===token.toLowerCase() &&
      String(log.args.from).toLowerCase()===payoutSender.toLowerCase() &&
      String(log.args.to).toLowerCase()===String(row.destination_address).toLowerCase() &&
      log.args.value===parseUnits(String(row.amount),tokenDecimals)
    );
    if(!matched) throw new HttpError(400,'No exact USDT payout to the withdrawal destination was found in this transaction');
    const reservation=await client.query(
      `update ledger_transactions
       set status='completed',tx_hash=$2,description=$3,metadata=metadata||$4::jsonb
       where reference=$1 and type='withdrawal' and status='pending'
       returning id`,
      [`withdrawal:${withdrawalId}`,txHash,'Withdrawal payout confirmed on-chain',JSON.stringify({txHash,confirmations,payoutSender})]
    );
    if(reservation.rowCount!==1) throw new HttpError(409,'Withdrawal reservation ledger entry is missing or already finalized');
    const updated=(await client.query(
      `update withdrawal_requests
       set status='completed',tx_hash=$2,rejection_reason=null,updated_at=now()
       where id=$1 and status='processing'
       returning id,amount,asset,destination_address,status,tx_hash,rejection_reason,created_at,updated_at`,
      [withdrawalId,txHash]
    )).rows[0];
    if(!updated) throw new HttpError(409,'Withdrawal is no longer processing');
    await client.query(
      `insert into audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
       values($3,'withdrawal_completed','withdrawal_request',$1,$2::jsonb)`,
      [withdrawalId,JSON.stringify({adminId:actorAdminId,txHash,confirmations,payoutSender}),actorUserId]
    );
    await client.query('commit');
    return {withdrawal:updated,confirmations};
  }catch(e){
    await client.query('rollback').catch(()=>{});
    if(isUniqueConstraintViolation(e,'uq_withdrawal_requests_tx_hash')){
      throw new HttpError(409,'This payout transaction has already been recorded for another withdrawal');
    }
    throw e;
  }finally{ client.release(); }
}

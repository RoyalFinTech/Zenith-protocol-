import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { issueSession } from '../src/services/jwt.js';
import { adminLogin, hashAdminPassword } from '../src/services/admin-auth.js';
import { randomBytes, randomUUID } from 'node:crypto';

const integrationEnvironmentReady = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET);
const describeProduction = integrationEnvironmentReady ? describe : describe.skip;
const testAddress = '0x0000000000000000000000000000000000000001';

describeProduction('production API against a real PostgreSQL test database', () => {
  let server: Server;
  let baseUrl: string;
  let database: typeof import('../src/db.js');
  let token = '';
  let userId = '';
  const testAccount = () => ({ address: testAddress });

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const [{ createApp }, db] = await Promise.all([import('../src/server.js'), import('../src/db.js')]);
    database = db;
    await database.pool.query('delete from app_users where wallet_address=$1', [testAccount().address]);
    const created = await database.pool.query<{id:string}>(
      `insert into app_users(wallet_address,username,display_name,role,referral_code)
       values($1,$2,$3,'Member',$4) returning id`,
      [testAccount().address,'ci_member','CI Integration Member','CICIMEMBER01']
    );
    userId = created.rows[0]!.id;
    const program = await database.pool.query<{id:string}>(`select id from programs where code='2x4' limit 1`);
    const node = await database.pool.query<{id:string;level:number;position:number}>(`select id,level,position from matrix_nodes where program_id=$1 and status='available' order by position limit 1`, [program.rows[0]!.id]);
    await database.pool.query(`update matrix_nodes set status='active',user_id=$1,activated_at=now() where id=$2`, [userId,node.rows[0]!.id]);
    await database.pool.query(`insert into matrix_memberships(user_id,program_id,node_id,level,position,status) values($1,$2,$3,$4,$5,'active')`, [userId,program.rows[0]!.id,node.rows[0]!.id,node.rows[0]!.level,node.rows[0]!.position]);
    const sessionId = randomUUID();
    await database.pool.query(
      `insert into user_sessions(id,user_id,wallet_address,expires_at) values($1,$2,$3,now()+interval '1 hour')`,
      [sessionId,userId,testAccount().address]
    );
    await database.pool.query(
      `insert into ledger_transactions(user_id,type,amount,asset,status,reference,description)
       values($1,'earned',5,'USDT','completed',$2,'CI integration opening balance')`,
      [userId,`ci:opening-balance:${userId}`]
    );
    token = await issueSession({userId,walletAddress:testAccount().address,role:'Member',sessionId});
    server = createApp().listen(0);
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not expose a TCP port');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    if (database) {
      await database.pool.query('delete from app_users where wallet_address=$1', [testAccount().address]);
      await database.pool.end();
    }
  });

  async function request(path: string, init: RequestInit = {}) {
    return fetch(`${baseUrl}${path}`, init);
  }

  it('keeps the admin portal separate from member authentication', async () => {
    const denied = await request('/api/admin-portal/overview', { headers: { authorization: `Bearer ${token}` } });
    expect(denied.status).toBe(401);
  });

  it('supports admin login, wrong-password rejection, lockout, and credential revocation', async () => {
    const adminEmail = `ci-admin-${randomUUID()}@example.test`;
    const adminPassword = randomBytes(24).toString('base64url');
    const replacementPassword = randomBytes(24).toString('base64url');
    const passwordHash = await hashAdminPassword(adminPassword);
    const admin = await database.pool.query<{id:string}>(
      `insert into admin_users(email,password_hash,is_active) values($1,$2,true) returning id`,
      [adminEmail,passwordHash]
    );
    const adminId = admin.rows[0]!.id;

    try {
      const wrong = await request('/api/admin-portal/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: 'definitely-wrong-password' })
      });
      expect(wrong.status).toBe(401);

      const login = await request('/api/admin-portal/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword })
      });
      expect(login.status).toBe(200);
      const loginData = await login.json() as { token:string; admin:{id:string;email:string} };
      expect(loginData.admin.id).toBe(adminId);

      const me = await request('/api/admin-portal/me', { headers: { authorization: `Bearer ${loginData.token}` } });
      expect(me.status).toBe(200);
      expect((await me.json()).admin.email).toBe(adminEmail);

      const overview = await request('/api/admin-portal/overview', { headers: { authorization: `Bearer ${loginData.token}` } });
      expect(overview.status).toBe(200);

      const credentials = await request('/api/admin-portal/credentials', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${loginData.token}` },
        body: JSON.stringify({ currentPassword: adminPassword, newEmail: adminEmail, newPassword: replacementPassword })
      });
      expect(credentials.status).toBe(204);

      const revoked = await request('/api/admin-portal/me', { headers: { authorization: `Bearer ${loginData.token}` } });
      expect(revoked.status).toBe(401);

      const relogin = await request('/api/admin-portal/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: replacementPassword })
      });
      expect(relogin.status).toBe(200);

      await database.pool.query(
        `update admin_users set failed_attempts=0,locked_until=null where id=$1`,
        [adminId]
      );
      for (let i=0;i<4;i++) {
        await expect(adminLogin(adminEmail, 'still-wrong', '127.0.0.1', 'vitest')).rejects.toMatchObject({ status: 401 });
      }
      await expect(adminLogin(adminEmail, 'still-wrong', '127.0.0.1', 'vitest')).rejects.toMatchObject({ status: 401 });
      await expect(adminLogin(adminEmail, replacementPassword, '127.0.0.1', 'vitest')).rejects.toMatchObject({ status: 429 });
    } finally {
      await database.pool.query('delete from admin_users where id=$1', [adminId]);
    }
  });

  it('supports authenticated notification reads and admin withdrawal transition guards', async () => {
    const authorization = { authorization: `Bearer ${token}` };
    const reservedBefore=await request('/api/dashboard/summary',{headers:authorization});
    expect(reservedBefore.status).toBe(200);
    const reservedBeforeData=await reservedBefore.json() as {earnings:{reserved:string}};

    const notificationInsert=await database.pool.query<{id:string}>(`
      insert into notifications(user_id,title,message) values($1,'CI notification','Notification regression test') returning id
    `,[userId]);
    const notifications = await request('/api/me/notifications', { headers: authorization });
    expect(notifications.status).toBe(200);
    expect((await notifications.json()).notifications.some((x:{id:string})=>x.id===notificationInsert.rows[0]!.id)).toBe(true);
    const marked=await request(`/api/me/notifications/${notificationInsert.rows[0]!.id}/read`,{method:'PATCH',headers:authorization});
    expect(marked.status).toBe(200);
    expect((await database.pool.query<{read_at:Date|null}>(`select read_at from notifications where id=$1`,[notificationInsert.rows[0]!.id])).rows[0]?.read_at).not.toBeNull();

    const adminEmail = `ci-withdrawal-admin-${randomUUID()}@example.test`;
    const adminPassword = randomBytes(24).toString('base64url');
    const passwordHash = await hashAdminPassword(adminPassword);
    const admin = await database.pool.query<{id:string}>(`insert into admin_users(email,password_hash,is_active) values($1,$2,true) returning id`, [adminEmail,passwordHash]);
    const adminId = admin.rows[0]!.id;
    try {
      const withdrawal = await database.pool.query<{id:string}>(`
        insert into withdrawal_requests(user_id,amount,asset,destination_address,status)
        values($1,1.25,'USDT',$2,'pending') returning id
      `, [userId,testAddress]);
      const reservedWithdrawal = await database.pool.query<{id:string}>(`
        insert into withdrawal_requests(user_id,amount,asset,destination_address,status)
        values($1,0.75,'USDT',$2,'pending') returning id
      `, [userId,testAddress]);
      await database.pool.query(`
        insert into ledger_transactions(user_id,type,amount,asset,status,reference,description)
        values($1,'withdrawal',0.75,'USDT','pending',$2,'CI reserved withdrawal')
      `, [userId,`withdrawal:${reservedWithdrawal.rows[0]!.id}`]);
      const login = await request('/api/admin-portal/login', {
        method:'POST', headers:{'content-type':'application/json'},
        body:JSON.stringify({email:adminEmail,password:adminPassword})
      });
      expect(login.status).toBe(200);
      const adminToken=(await login.json()).token as string;

      const approved=await request(`/api/admin-portal/withdrawals/${withdrawal.rows[0]!.id}/status`,{
        method:'PATCH',headers:{authorization:`Bearer ${adminToken}`,'content-type':'application/json'},
        body:JSON.stringify({status:'approved'})
      });
      expect(approved.status).toBe(409);

      const goodApproval=await request(`/api/admin-portal/withdrawals/${reservedWithdrawal.rows[0]!.id}/status`,{
        method:'PATCH',headers:{authorization:`Bearer ${adminToken}`,'content-type':'application/json'},
        body:JSON.stringify({status:'approved'})
      });
      expect(goodApproval.status).toBe(200);
      const reservedSummary=await request('/api/dashboard/summary',{headers:authorization});
      expect(reservedSummary.status).toBe(200);
      const reservedAfterData=await reservedSummary.json() as {earnings:{reserved:string}};
      expect(Number(reservedAfterData.earnings.reserved)-Number(reservedBeforeData.earnings.reserved)).toBeCloseTo(0.75,8);
      const doubleSpendAttempt=await request('/api/transactions/withdrawals',{
        method:'POST',headers:{...authorization,'content-type':'application/json'},
        body:JSON.stringify({amount:'4.5',address:testAddress})
      });
      expect(doubleSpendAttempt.status).toBe(409);
      const processing=await request(`/api/admin-portal/withdrawals/${reservedWithdrawal.rows[0]!.id}/status`,{
        method:'PATCH',headers:{authorization:`Bearer ${adminToken}`,'content-type':'application/json'},
        body:JSON.stringify({status:'processing'})
      });
      expect(processing.status).toBe(200);

      const rejected=await request(`/api/admin-portal/withdrawals/${withdrawal.rows[0]!.id}/status`,{
        method:'PATCH',headers:{authorization:`Bearer ${adminToken}`,'content-type':'application/json'},
        body:JSON.stringify({status:'rejected',reason:'CI test rejection'})
      });
      expect(rejected.status).toBe(200);
      const final=(await database.pool.query<{status:string}>(`select status from withdrawal_requests where id=$1`,[withdrawal.rows[0]!.id])).rows[0];
      expect(final?.status).toBe('rejected');
    } finally {
      await database.pool.query(`delete from ledger_transactions where user_id=$1 and reference like 'withdrawal:%'`,[userId]);
      await database.pool.query('delete from notifications where user_id=$1',[userId]);
      await database.pool.query('delete from withdrawal_requests where user_id=$1',[userId]);
      await database.pool.query('delete from admin_users where id=$1',[adminId]);
    }
  });

  it('exposes authenticated device push capability without allowing unauthenticated subscription writes', async () => {
    const authorization = { authorization: `Bearer ${token}` };
    const pushConfig = await request('/api/me/push/config', { headers: authorization });
    expect(pushConfig.status).toBe(200);
    const pushData = await pushConfig.json() as { enabled:boolean; publicKey:string|null };
    expect(typeof pushData.enabled).toBe('boolean');
    if (!pushData.enabled) {
      const disabled = await request('/api/me/push/subscriptions', {
        method:'POST',
        headers:{...authorization,'content-type':'application/json'},
        body:JSON.stringify({subscription:{endpoint:'https://push.example.test/subscription',keys:{p256dh:'bad',auth:'bad'}}})
      });
      expect(disabled.status).toBe(503);
    }
    const unauthenticated = await request('/api/me/push/subscriptions', {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({subscription:{endpoint:'https://push.example.test/subscription',keys:{p256dh:'bad',auth:'bad'}}})
    });
    expect(unauthenticated.status).toBe(401);
  });

  it('makes package confirmation retries idempotent to the recorded transaction hash', async () => {
    const packageRow = (await database.pool.query<{id:string}>(
      `select id from program_packages where code='2x4-starter' limit 1`
    )).rows[0];
    expect(packageRow?.id).toBeTruthy();

    const recordedTx = `0x${'1'.repeat(64)}`;
    const differentTx = `0x${'2'.repeat(64)}`;
    const purchase = await database.pool.query<{id:string}>(
      `insert into package_purchases(
         user_id,package_id,amount,asset,status,payment_tx_hash,confirmed_at,
         package_tier,direct_percent,matrix_percent,admin_percent,matrix_distribution_rules
       )
       values($1,$2,10,'USDT','confirmed',$3,now(),'starter',20,70,10,'[]'::jsonb)
       returning id`,
      [userId,packageRow!.id,recordedTx]
    );

    try {
      const authorization = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
      const sameHash = await request(`/api/packages/purchases/${purchase.rows[0]!.id}/confirm`, {
        method:'POST',
        headers:authorization,
        body:JSON.stringify({txHash:recordedTx})
      });
      expect(sameHash.status).toBe(200);

      const differentHash = await request(`/api/packages/purchases/${purchase.rows[0]!.id}/confirm`, {
        method:'POST',
        headers:authorization,
        body:JSON.stringify({txHash:differentTx})
      });
      expect(differentHash.status).toBe(409);

      await expect(
        database.pool.query(
          `update package_purchases set direct_percent=21 where id=$1`,
          [purchase.rows[0]!.id]
        )
      ).rejects.toThrow('Package purchase settlement economics snapshot is immutable');
    } finally {
      await database.pool.query('delete from package_purchases where id=$1',[purchase.rows[0]!.id]);
    }
  });

  it('serves health and public configuration', async () => {
    const [health, config] = await Promise.all([request('/health'), request('/config/public')]);
    expect(health.status).toBe(200);
    expect((await health.json()).ok).toBe(true);
    expect(config.status).toBe(200);
    expect((await config.json()).chainId).toBe(56);
  });

  it('issues a nonce challenge', async () => {
    const challenge = await request('/api/auth/nonce', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address: testAccount().address.toLowerCase() })
    });
    expect(challenge.status).toBe(200);
    const challengeData = await challenge.json() as { nonce: string; message: string; address: string };
    expect(challengeData.nonce).toBeTruthy();
    expect(challengeData.message).toContain('Sign in to Zenit Protocol.');
    expect(challengeData.address).toBe(testAccount().address);
  });

  it('rejects malformed wallet verification requests', async () => {
    const invalid = await request('/api/auth/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address: testAccount().address, nonce: 'missing', signature: '0x1234' })
    });
    expect(invalid.status).toBe(400);
  });

  it('reads and updates the authenticated profile and persisted preferences', async () => {
    const authorization = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    expect((await request('/api/me', { headers: authorization })).status).toBe(200);
    expect((await request('/api/me/profile', { method: 'PATCH', headers: authorization, body: JSON.stringify({ username: 'ci_profile_member', displayName: 'Production Test Member' }) })).status).toBe(200);
    const preferences = await request('/api/me/preferences', { method: 'PATCH', headers: authorization, body: JSON.stringify({ theme: 'light', compactDensity: false, activityNotifications: true, reducedMotion: true }) });
    expect(preferences.status).toBe(200);
    expect((await preferences.json()).preference.theme).toBe('light');
  });

  it('enforces authenticated ownership for wallet, matrix, transactions, and withdrawals', async () => {
    const authorization = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    expect((await request('/api/wallets/bind', { method: 'POST', headers: authorization, body: JSON.stringify({ address: testAccount().address.toLowerCase() }) })).status).toBe(201);
    expect((await request('/api/wallets', { headers: authorization })).status).toBe(200);
    expect((await request('/api/dashboard/matrix/2x4', { headers: authorization })).status).toBe(200);
    expect((await request('/api/transactions', { headers: authorization })).status).toBe(200);
    const catalog = await request('/api/packages/catalog', { headers: authorization });
    expect(catalog.status).toBe(200);
    const packages = (await catalog.json()).packages as Array<{code:string;price:string|null}>;
    expect(packages.find(x => x.code === '2x4-starter')?.price).toBe('10.00000000');
    expect(packages.find(x => x.code === '2x6-starter')?.price).toBe('30.00000000');
    expect((await request('/api/transactions/withdrawals', { method: 'POST', headers: authorization, body: JSON.stringify({ amount: '1.5', address: testAccount().address }) })).status).toBe(201);
    const summaryAfterWithdrawal=await request('/api/dashboard/summary',{headers:authorization});
    expect(summaryAfterWithdrawal.status).toBe(200);
    expect((await summaryAfterWithdrawal.json()).earnings.pending).toBe('0');
    await database.pool.query(`update matrix_memberships set status='completed' where user_id=$1 and program_id=(select id from programs where code='2x4')`, [userId]);
    const inactiveWithdrawal = await request('/api/transactions/withdrawals', { method: 'POST', headers: authorization, body: JSON.stringify({ amount: '0.5', address: testAccount().address }) });
    expect(inactiveWithdrawal.status).toBe(409);
    await database.pool.query(`update matrix_memberships set status='active' where user_id=$1 and program_id=(select id from programs where code='2x4')`, [userId]);
    const overdraw = await request('/api/transactions/withdrawals', {
      method: 'POST',
      headers: authorization,
      body: JSON.stringify({ amount: '4', address: testAccount().address })
    });
    expect(overdraw.status).toBe(409);
    expect((await request('/api/wallets', { headers: { authorization: 'Bearer malformed' } })).status).toBe(401);
  });

  it('revokes the server-side session at logout', async () => {
    const authorization = { authorization: `Bearer ${token}` };
    expect((await request('/api/auth/logout', { method: 'POST', headers: authorization })).status).toBe(204);
    expect((await request('/api/me', { headers: authorization })).status).toBe(401);
  });

  it('rejects a session whose database expiry has elapsed', async () => {
    const sessionId = randomUUID();
    await database.pool.query(
      `insert into user_sessions(id,user_id,wallet_address,expires_at) values($1,$2,$3,now()+interval '1 hour')`,
      [sessionId,userId,testAccount().address]
    );
    const expiredToken = await issueSession({userId,walletAddress:testAccount().address,role:'Member',sessionId});
    await database.pool.query(`update user_sessions set expires_at=now()-interval '1 minute' where id=$1`, [sessionId]);
    expect((await request('/api/me', { headers: { authorization: `Bearer ${expiredToken}` } })).status).toBe(401);
  });

  it('rate limits nonce issuance', async () => {
    const responses = await Promise.all(Array.from({ length: 11 }, () => request('/api/auth/nonce', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address: testAccount().address }) })));
    expect(responses.some(response => response.status === 429)).toBe(true);
  });
});

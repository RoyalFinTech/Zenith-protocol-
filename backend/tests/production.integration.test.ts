import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { issueSession } from '../src/services/jwt.js';
import { randomUUID } from 'node:crypto';

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
    expect((await request('/api/transactions/withdrawals', { method: 'POST', headers: authorization, body: JSON.stringify({ amount: '1.5', address: testAccount().address }) })).status).toBe(201);
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

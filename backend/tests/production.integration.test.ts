import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { privateKeyToAccount } from 'viem/accounts';

const integrationEnvironmentReady = Boolean(
  process.env.TEST_DATABASE_URL &&
  process.env.TEST_JWT_SECRET &&
  process.env.TEST_WALLET_PRIVATE_KEY &&
  process.env.TEST_WALLETCONNECT_PROJECT_ID
);

const describeProduction = integrationEnvironmentReady ? describe : describe.skip;
const walletPrivateKey = process.env.TEST_WALLET_PRIVATE_KEY;
const account = walletPrivateKey ? privateKeyToAccount(walletPrivateKey as `0x${string}`) : undefined;

describeProduction('production API against a real PostgreSQL test database', () => {
  let server: Server;
  let baseUrl: string;
  let database: typeof import('../src/db.js');
  let token = '';
  let nonce = '';
  const testAccount = () => {
    if (!account) throw new Error('TEST_WALLET_PRIVATE_KEY is required');
    return account;
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.JWT_SECRET = process.env.TEST_JWT_SECRET;
    process.env.WALLETCONNECT_PROJECT_ID = process.env.TEST_WALLETCONNECT_PROJECT_ID;
    process.env.NODE_ENV = 'test';
    const [{ createApp }, db] = await Promise.all([import('../src/server.js'), import('../src/db.js')]);
    database = db;
    await database.pool.query('delete from app_users where wallet_address=$1', [testAccount().address]);
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

  it('issues a nonce, verifies a signed challenge, and rejects nonce replay', async () => {
    const challenge = await request('/api/auth/nonce', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address: testAccount().address.toLowerCase() }) });
    expect(challenge.status).toBe(200);
    const challengeData = await challenge.json() as { nonce: string; message: string; address: string };
    nonce = challengeData.nonce;
    expect(challengeData.address).toBe(testAccount().address);
    const signature = await testAccount().signMessage({ message: challengeData.message });
    const verified = await request('/api/auth/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address: testAccount().address, nonce, signature }) });
    expect(verified.status).toBe(200);
    token = (await verified.json() as { token: string }).token;
    const replay = await request('/api/auth/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address: testAccount().address, nonce, signature }) });
    expect(replay.status).toBe(400);
  });

  it('rejects invalid signatures and expired nonces', async () => {
    const invalid = await request('/api/auth/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address: testAccount().address, nonce: 'missing', signature: '0x1234' }) });
    expect(invalid.status).toBe(400);
    const challenge = await request('/api/auth/nonce', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address: testAccount().address }) });
    const data = await challenge.json() as { nonce: string; message: string };
    await database.pool.query(`update auth_nonces set expires_at=now()-interval '1 minute' where nonce=$1`, [data.nonce]);
    const signature = await testAccount().signMessage({ message: data.message });
    const expired = await request('/api/auth/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address: testAccount().address, nonce: data.nonce, signature }) });
    expect(expired.status).toBe(400);
  });

  it('reads and updates the authenticated profile and persisted preferences', async () => {
    const authorization = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    expect((await request('/api/me', { headers: authorization })).status).toBe(200);
    expect((await request('/api/me/profile', { method: 'PATCH', headers: authorization, body: JSON.stringify({ displayName: 'Production Test Member' }) })).status).toBe(200);
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
    expect((await request('/api/wallets', { headers: { authorization: 'Bearer malformed' } })).status).toBe(401);
  });

  it('revokes the server-side session at logout', async () => {
    const authorization = { authorization: `Bearer ${token}` };
    expect((await request('/api/auth/logout', { method: 'POST', headers: authorization })).status).toBe(204);
    expect((await request('/api/me', { headers: authorization })).status).toBe(401);
  });

  it('rejects a session whose database expiry has elapsed', async () => {
    const challenge = await request('/api/auth/nonce', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address: testAccount().address }) });
    const data = await challenge.json() as { nonce: string; message: string };
    const signature = await testAccount().signMessage({ message: data.message });
    const verified = await request('/api/auth/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address: testAccount().address, nonce: data.nonce, signature }) });
    const expiredToken = (await verified.json() as { token: string }).token;
    await database.pool.query(`update user_sessions set expires_at=now()-interval '1 minute' where id=(select id from user_sessions where user_id=(select id from app_users where wallet_address=$1) order by created_at desc limit 1)`, [testAccount().address]);
    expect((await request('/api/me', { headers: { authorization: `Bearer ${expiredToken}` } })).status).toBe(401);
  });

  it('rate limits nonce issuance', async () => {
    const responses = await Promise.all(Array.from({ length: 11 }, () => request('/api/auth/nonce', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ address: testAccount().address }) })));
    expect(responses.some(response => response.status === 429)).toBe(true);
  });
});

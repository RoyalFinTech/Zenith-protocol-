import { pool } from '../dist/db.js';
import { hashAdminPassword } from '../dist/services/admin-auth.js';

const email = (process.env.ADMIN_BOOTSTRAP_EMAIL ?? '').trim().toLowerCase();
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? '';

if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('ADMIN_BOOTSTRAP_EMAIL must be a valid email address');
if (password.length < 12) throw new Error('ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters');

const client = await pool.connect();
try {
  await client.query('begin');
  await client.query('select pg_advisory_xact_lock(41777311)');
  const existing = (await client.query('select id from admin_users limit 1 for update')).rows[0];
  if (existing) throw new Error('An administrator already exists; bootstrap is disabled');
  const passwordHash = await hashAdminPassword(password);
  const inserted = (await client.query(
    'insert into admin_users(email,password_hash,is_active,failed_attempts,locked_until) values($1,$2,true,0,null) returning id,email',
    [email, passwordHash]
  )).rows[0];
  await client.query('commit');
  console.log('Admin bootstrap completed for ' + inserted.email);
} catch (error) {
  await client.query('rollback').catch(() => {});
  throw error;
} finally {
  client.release();
}

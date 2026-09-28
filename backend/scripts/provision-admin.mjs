import pg from 'pg';
import { createHash, randomBytes, scrypt as scryptCb } from 'node:crypto';
import { promisify } from 'node:util';

const { Pool } = pg;
const scrypt = promisify(scryptCb);

const databaseUrl = process.env.DATABASE_URL?.trim();
const nodeEnv = process.env.NODE_ENV ?? 'development';
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? '';

if (!databaseUrl) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}
if (nodeEnv === 'production' && process.env.ALLOW_PRODUCTION_ADMIN_PROVISIONING !== 'YES') {
  console.error('Production admin provisioning requires ALLOW_PRODUCTION_ADMIN_PROVISIONING=YES.');
  process.exit(1);
}
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('ADMIN_EMAIL must be a valid email address.');
  process.exit(1);
}
if (password.length < 12) {
  console.error('ADMIN_PASSWORD must be at least 12 characters.');
  process.exit(1);
}

const salt = randomBytes(16).toString('hex');
const derived = await scrypt(password, salt, 64);
const passwordHash = `scrypt$${salt}$${Buffer.from(derived).toString('hex')}`;

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
    ? undefined
    : { rejectUnauthorized: false }
});

try {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const existing = await client.query('select id from public.admin_users where lower(email)=lower($1) limit 1 for update', [email]);
    if (existing.rowCount) {
      throw new Error('An admin account with that email already exists. Use the admin Security flow to change credentials.');
    }
    const inserted = await client.query(
      'insert into public.admin_users(email,password_hash) values($1,$2) returning id,email,is_active,created_at',
      [email, passwordHash]
    );
    await client.query('commit');
    console.log(`Admin account provisioned: ${inserted.rows[0].email}`);
    console.log('Credentials are stored as a scrypt password hash; the plaintext password was not written to the database.');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}

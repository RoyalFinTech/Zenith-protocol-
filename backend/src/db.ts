import pg from 'pg';
import { env } from './config.js';

const { Pool } = pg;
export const pool = new Pool({ connectionString: env.databaseUrl, max: 10, idleTimeoutMillis: 30_000, ssl: env.nodeEnv === 'production' ? { rejectUnauthorized: false } : undefined });

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params: unknown[] = []): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function healthcheck() {
  const result = await pool.query<{ ok: number }>('select 1 as ok');
  return result.rows[0]?.ok === 1;
}

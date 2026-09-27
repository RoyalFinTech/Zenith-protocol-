import type { PoolClient } from 'pg';

export async function createUserNotification(
  client: PoolClient,
  userId: string,
  title: string,
  message: string
) {
  await client.query(
    `insert into notifications(user_id,title,message) values($1,$2,$3)`,
    [userId, title, message]
  );
}

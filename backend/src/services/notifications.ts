import type { PoolClient } from 'pg';
import { query } from '../db.js';
import { sendPushToSubscription, type PushSubscriptionInput } from './web-push.js';

export async function createUserNotification(
  client: PoolClient,
  userId: string,
  title: string,
  message: string
): Promise<string | undefined> {
  const result = await client.query<{id:string}>(
    `insert into notifications(user_id,title,message) values($1,$2,$3) returning id`,
    [userId, title, message]
  );
  return result.rows[0]?.id;
}

export async function sendUserPushNotification(
  userId: string,
  title: string,
  message: string,
  notificationId?: string
): Promise<void> {
  if (!process.env.VAPID_SUBJECT || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

  const subscriptions = await query<PushSubscriptionInput & { id: string }>(
    `select id,endpoint,p256dh,auth from push_subscriptions where user_id=$1 order by updated_at desc`,
    [userId]
  );
  if (!subscriptions.rowCount) return;

  const payload = {
    title,
    body: message,
    url: notificationId ? `/?notification=${encodeURIComponent(notificationId)}` : '/',
    notificationId
  };

  await Promise.allSettled(subscriptions.rows.map(async subscription => {
    try {
      const result = await sendPushToSubscription(subscription, payload);
      if (result.stale) {
        await query(`delete from push_subscriptions where id=$1 and user_id=$2`, [subscription.id, userId]);
        return;
      }
      if (result.ok) {
        await query(`update push_subscriptions set last_success_at=now(),last_failure_at=null,failure_count=0,updated_at=now() where id=$1 and user_id=$2`, [subscription.id, userId]);
        return;
      }
      await query(`update push_subscriptions set last_failure_at=now(),failure_count=failure_count+1,updated_at=now() where id=$1 and user_id=$2`, [subscription.id, userId]);
      console.warn('ZENIT push notification delivery returned a non-success response', { status: result.status, subscriptionId: subscription.id });
    } catch (error) {
      await query(`update push_subscriptions set last_failure_at=now(),failure_count=failure_count+1,updated_at=now() where id=$1 and user_id=$2`, [subscription.id, userId]).catch(()=>{});
      console.warn('ZENIT push notification delivery failed', { subscriptionId: subscription.id, error });
    }
  }));
}

export async function sendUserPushTestNotification(userId: string): Promise<{
  configured: boolean;
  subscriptions: number;
  delivered: number;
  failed: number;
  staleRemoved: number;
}> {
  if (!process.env.VAPID_SUBJECT || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return { configured: false, subscriptions: 0, delivered: 0, failed: 0, staleRemoved: 0 };
  }

  const subscriptions = await query<PushSubscriptionInput & { id: string }>(
    `select id,endpoint,p256dh,auth from push_subscriptions where user_id=$1 order by updated_at desc`,
    [userId]
  );
  if (!subscriptions.rowCount) {
    return { configured: true, subscriptions: 0, delivered: 0, failed: 0, staleRemoved: 0 };
  }

  const payload = {
    title: 'ZENIT test notification',
    body: 'Push notifications are working on this device.',
    url: '/',
  };
  let delivered = 0;
  let failed = 0;
  let staleRemoved = 0;

  await Promise.allSettled(subscriptions.rows.map(async subscription => {
    try {
      const result = await sendPushToSubscription(subscription, payload);
      if (result.stale) {
        staleRemoved += 1;
        await query(`delete from push_subscriptions where id=$1 and user_id=$2`, [subscription.id, userId]);
        return;
      }
      if (result.ok) {
        delivered += 1;
        await query(`update push_subscriptions set last_success_at=now(),last_failure_at=null,failure_count=0,updated_at=now() where id=$1 and user_id=$2`, [subscription.id, userId]);
        return;
      }
      failed += 1;
      await query(`update push_subscriptions set last_failure_at=now(),failure_count=failure_count+1,updated_at=now() where id=$1 and user_id=$2`, [subscription.id, userId]);
    } catch (error) {
      failed += 1;
      await query(`update push_subscriptions set last_failure_at=now(),failure_count=failure_count+1,updated_at=now() where id=$1 and user_id=$2`, [subscription.id, userId]).catch(()=>{});
      console.warn('ZENIT push test notification delivery failed', { subscriptionId: subscription.id, error });
    }
  }));

  return { configured: true, subscriptions: subscriptions.rowCount ?? 0, delivered, failed, staleRemoved };
}

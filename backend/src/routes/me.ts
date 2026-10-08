import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/http.js';
import { sendWelcomeEmail } from '../services/email.js';
import { env } from '../config.js';
import { validatePushSubscriptionInput } from '../services/web-push.js';
import { sendUserPushTestNotification } from '../services/notifications.js';
import { normalizeWhatsAppNumber } from '../utils/phone.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req,res,next)=>{
  try {
    const user = (await query(`select id,wallet_address,username,email,display_name,whatsapp_number,whatsapp_updates_enabled,role,referral_code,avatar_url,created_at from app_users where id=$1`, [req.auth!.userId])).rows[0];
    if (!user) throw new HttpError(404,'User not found');
    const preference = (await query(`select theme,compact_density,activity_notifications,reduced_motion from user_preferences where user_id=$1`, [req.auth!.userId])).rows[0];
    res.json({ user, preference });
  } catch(e){ next(e); }
});

router.patch('/profile', async (req,res,next)=>{
  try {
    const displayName = String(req.body?.displayName ?? '').trim();
    const username = String(req.body?.username ?? '').trim().toLowerCase();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const whatsappNumberRaw = req.body?.whatsappNumber == null ? '' : String(req.body.whatsappNumber).trim();
    let whatsappNumber: string | null = null;
    if (whatsappNumberRaw) {
      try { whatsappNumber = normalizeWhatsAppNumber(whatsappNumberRaw); }
      catch (error) { throw new HttpError(400, error instanceof Error ? error.message : 'Valid WhatsApp number required'); }
    }
    const whatsappUpdatesEnabled = Boolean(whatsappNumber) && req.body?.whatsappUpdatesEnabled !== false;
    if (!/^[a-z0-9_]{3,24}$/.test(username)) throw new HttpError(400,'Username must be 3–24 characters using lowercase letters, numbers or underscores');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400,'Valid email address required');
    const avatarUrl = req.body?.avatarUrl == null ? null : String(req.body.avatarUrl);
    if (displayName.length < 2 || displayName.length > 80) throw new HttpError(400,'Display name must be 2–80 characters');
    const existing = (await query<{email:string|null}>(`select email from app_users where id=$1`, [req.auth!.userId])).rows[0];
    let user;
    try {
      user = (await query(`update app_users set username=$1,email=nullif($2,''),display_name=$3,whatsapp_number=$4,whatsapp_updates_enabled=$5,avatar_url=coalesce($6,avatar_url),updated_at=now() where id=$7 returning id,wallet_address,username,email,display_name,whatsapp_number,whatsapp_updates_enabled,role,referral_code,avatar_url,created_at`, [username,email,displayName,whatsappNumber,whatsappUpdatesEnabled,avatarUrl,req.auth!.userId])).rows[0];
    } catch (error:any) {
      if (error?.code === '23505') throw new HttpError(409,'That username, email address, or WhatsApp number is already in use');
      throw error;
    }
    if (email && email !== (existing?.email ?? null)) {
      void sendWelcomeEmail({ to: email, username, appOrigin: new URL(req.protocol + '://' + req.get('host')).origin }).catch(error => {
        console.error('ZENIT welcome email failed', error);
      });
    }
    res.json({user});
  } catch(e){ next(e); }
});

router.get('/notifications', async (req,res,next)=>{
  try{
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const r = await query(
      `select id,title,message,created_at,read_at
       from notifications
       where user_id=$1
       order by created_at desc
       limit $2`,
      [req.auth!.userId, limit]
    );
    res.json({notifications:r.rows});
  } catch(e){ next(e); }
});

router.patch('/notifications/:id/read', async (req,res,next)=>{
  try{
    const r = await query(
      `update notifications
       set read_at=coalesce(read_at,now())
       where id=$1 and user_id=$2
       returning id,title,message,created_at,read_at`,
      [req.params.id, req.auth!.userId]
    );
    if(!r.rowCount) throw new HttpError(404,'Notification not found');
    res.json({notification:r.rows[0]});
  } catch(e){ next(e); }
});

router.patch('/notifications/read-all', async (req,res,next)=>{
  try{
    const r = await query(
      `update notifications
       set read_at=now()
       where user_id=$1 and read_at is null`,
      [req.auth!.userId]
    );
    res.json({updated:r.rowCount ?? 0});
  } catch(e){ next(e); }
});

router.get('/push/config', async (_req,res)=>{
  res.json({enabled:env.pushEnabled,publicKey:env.pushEnabled?env.vapidPublicKey:null});
});

router.post('/push/subscriptions', async (req,res,next)=>{
  try{
    if(!env.pushEnabled) throw new HttpError(503,'Device push notifications are not configured');
    let subscription;
    try { subscription=validatePushSubscriptionInput(req.body?.subscription); }
    catch(e){ throw new HttpError(400,e instanceof Error?e.message:'Invalid push subscription'); }
    const expirationTime=req.body?.subscription?.expirationTime == null ? null : Number(req.body.subscription.expirationTime);
    if(expirationTime!==null && (!Number.isSafeInteger(expirationTime) || expirationTime<0)) throw new HttpError(400,'Invalid push subscription expiration time');
    const userAgent=String(req.get('user-agent')||'').slice(0,500)||null;
    const r=await query(
      `insert into push_subscriptions(user_id,endpoint,p256dh,auth,expiration_time,user_agent,updated_at)
       values($1,$2,$3,$4,$5,$6,now())
       on conflict(endpoint) do update set
         user_id=excluded.user_id,p256dh=excluded.p256dh,auth=excluded.auth,
         expiration_time=excluded.expiration_time,user_agent=excluded.user_agent,
         updated_at=now(),last_failure_at=null,failure_count=0
       returning id,created_at,updated_at`,
      [req.auth!.userId,subscription.endpoint,subscription.p256dh,subscription.auth,expirationTime,userAgent]
    );
    res.status(201).json({subscription:r.rows[0]});
  }catch(e){ next(e); }
});

router.post('/push/test', async (req,res,next)=>{
  try{
    if(!env.pushEnabled) throw new HttpError(503,'Device push notifications are not configured');
    const result = await sendUserPushTestNotification(req.auth!.userId);
    if(!result.subscriptions) throw new HttpError(409,'Enable phone notifications on this device first');
    if(!result.delivered) throw new HttpError(502,'The push test could not be delivered to any active device subscription');
    res.json({ok:true,delivered:result.delivered,failed:result.failed,staleRemoved:result.staleRemoved});
  }catch(e){ next(e); }
});

router.delete('/push/subscriptions', async (req,res,next)=>{
  try{
    const endpoint=typeof req.body?.endpoint==='string'?req.body.endpoint.trim():'';
    const r=endpoint
      ? await query(`delete from push_subscriptions where user_id=$1 and endpoint=$2`,[req.auth!.userId,endpoint])
      : await query(`delete from push_subscriptions where user_id=$1`,[req.auth!.userId]);
    res.json({removed:r.rowCount??0});
  }catch(e){next(e);}
});

router.patch('/preferences', async (req,res,next)=>{
  try {
    const theme = req.body?.theme;
    if (!['dark','light','system'].includes(theme)) throw new HttpError(400,'Theme must be dark, light or system');
    const compact = Boolean(req.body?.compactDensity);
    const activity = Boolean(req.body?.activityNotifications);
    const reduced = Boolean(req.body?.reducedMotion);
    const row=(await query(`insert into user_preferences(user_id,theme,compact_density,activity_notifications,reduced_motion) values($1,$2,$3,$4,$5) on conflict(user_id) do update set theme=excluded.theme,compact_density=excluded.compact_density,activity_notifications=excluded.activity_notifications,reduced_motion=excluded.reduced_motion,updated_at=now() returning theme,compact_density,activity_notifications,reduced_motion`, [req.auth!.userId,theme,compact,activity,reduced])).rows[0];
    res.json({preference:row});
  } catch(e){ next(e); }
});

export default router;

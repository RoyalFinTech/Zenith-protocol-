import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/http.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req,res,next)=>{
  try {
    const user = (await query(`select id,wallet_address,display_name,role,referral_code,avatar_url,created_at from app_users where id=$1`, [req.auth!.userId])).rows[0];
    if (!user) throw new HttpError(404,'User not found');
    const preference = (await query(`select theme,compact_density,activity_notifications,reduced_motion from user_preferences where user_id=$1`, [req.auth!.userId])).rows[0];
    res.json({ user, preference });
  } catch(e){ next(e); }
});

router.patch('/profile', async (req,res,next)=>{
  try {
    const displayName = String(req.body?.displayName ?? '').trim();
    const avatarUrl = req.body?.avatarUrl == null ? null : String(req.body.avatarUrl);
    if (displayName.length < 2 || displayName.length > 80) throw new HttpError(400,'Display name must be 2–80 characters');
    const user = (await query(`update app_users set display_name=$1,avatar_url=coalesce($2,avatar_url),updated_at=now() where id=$3 returning id,wallet_address,display_name,role,referral_code,avatar_url,created_at`, [displayName,avatarUrl,req.auth!.userId])).rows[0];
    res.json({user});
  } catch(e){ next(e); }
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

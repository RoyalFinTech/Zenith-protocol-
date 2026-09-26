import type { NextFunction, Request, Response } from 'express';
import { getBearer, HttpError } from '../utils/http.js';
import { verifySession, type SessionClaims } from '../services/jwt.js';
import { query } from '../db.js';

declare global { namespace Express { interface Request { auth?: SessionClaims } } }

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = getBearer(req);
    if (!token) throw new HttpError(401, 'Authentication required');
    try {
      req.auth = await verifySession(token);
    } catch {
      throw new HttpError(401, 'Invalid or expired session');
    }
    const session = (await query<{ user_id:string }>(`select user_id from user_sessions where id=$1 and user_id=$2 and revoked_at is null and expires_at>now()`, [req.auth.sessionId, req.auth.userId])).rows[0];
    if (!session) throw new HttpError(401, 'Session expired or revoked');
    next();
  } catch (error) {
    if (error instanceof HttpError) return next(error);
    next(new HttpError(503, 'Authentication service temporarily unavailable'));
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.auth?.role !== 'Admin') return next(new HttpError(403, 'Admin access required'));
  next();
}

import type { Request } from 'express';

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) { super(message); }
}

export function getBearer(req: Request): string | null {
  const value = req.header('authorization');
  if (!value) return null;
  const [scheme, token] = value.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

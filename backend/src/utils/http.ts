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

export function parseLimit(value: unknown, fallback: number, maximum: number): number {
  if (value == null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new HttpError(400, 'Limit must be a positive integer');
  return Math.min(parsed, maximum);
}

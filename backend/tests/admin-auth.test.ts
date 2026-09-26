import { describe, expect, it } from 'vitest';
import { requireAdmin } from '../src/middleware/auth.js';

describe('admin authorization', () => {
  it('rejects non-admin sessions', () => {
    const next = (error?: unknown) => error;
    const error = requireAdmin(
      { auth: { role: 'Member' } } as never,
      {} as never,
      next
    );
    expect(error).toMatchObject({ status: 403, message: 'Admin access required' });
  });

  it('accepts admin sessions', () => {
    let called = false;
    requireAdmin(
      { auth: { role: 'Admin' } } as never,
      {} as never,
      () => { called = true; }
    );
    expect(called).toBe(true);
  });
});

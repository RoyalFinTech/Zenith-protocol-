import { describe, expect, it } from 'vitest';
import { canTransitionWithdrawal, comparePackageTiers, isUniqueConstraintViolation } from '../src/utils/financial.js';
import { HttpError, parseLimit } from '../src/utils/http.js';

describe('package tier progression', () => {
  it('only permits strictly higher tiers', () => {
    expect(comparePackageTiers('starter','growth')).toBeGreaterThan(0);
    expect(comparePackageTiers('growth','elite')).toBeGreaterThan(0);
    expect(comparePackageTiers('starter','elite')).toBeGreaterThan(0);
    expect(comparePackageTiers('growth','growth')).toBe(0);
    expect(comparePackageTiers('elite','starter')).toBeLessThan(0);
  });

  it('treats unknown tiers as invalid progression', () => {
    expect(comparePackageTiers('unknown','growth')).toBe(2);
    expect(comparePackageTiers('elite','unknown')).toBe(-3);
  });
});

describe('withdrawal state machine', () => {
  it('allows only controlled forward transitions', () => {
    expect(canTransitionWithdrawal('pending', 'approved')).toBe(true);
    expect(canTransitionWithdrawal('approved', 'processing')).toBe(true);
    expect(canTransitionWithdrawal('processing', 'failed')).toBe(true);
    expect(canTransitionWithdrawal('processing', 'completed')).toBe(false);
    expect(canTransitionWithdrawal('completed', 'processing')).toBe(false);
  });

  it('rejects unknown states', () => {
    expect(canTransitionWithdrawal('pending', 'completed')).toBe(false);
    expect(canTransitionWithdrawal('unknown', 'approved')).toBe(false);
  });
});

describe('unique constraint classification', () => {
  it('identifies the expected postgres unique violation', () => {
    expect(isUniqueConstraintViolation(
      { code: '23505', detail: 'uq_package_purchases_one_pending_per_user_package' },
      'uq_package_purchases_one_pending_per_user_package'
    )).toBe(true);
  });

  it('does not misclassify other database errors', () => {
    expect(isUniqueConstraintViolation(
      { code: '23505', detail: 'some_other_constraint' },
      'uq_package_purchases_one_pending_per_user_package'
    )).toBe(false);
    expect(isUniqueConstraintViolation(
      { code: '23514', detail: 'uq_package_purchases_one_pending_per_user_package' },
      'uq_package_purchases_one_pending_per_user_package'
    )).toBe(false);
  });
});


describe('pagination validation', () => {
  it('uses defaults and caps valid integer limits', () => {
    expect(parseLimit(undefined, 20, 100)).toBe(20);
    expect(parseLimit('25', 20, 100)).toBe(25);
    expect(parseLimit('500', 20, 100)).toBe(100);
  });

  it('rejects malformed limits', () => {
    for (const value of ['0', '-1', '1.5', 'NaN', 'abc']) {
      expect(() => parseLimit(value, 20, 100)).toThrow(HttpError);
    }
  });
});


describe('matrix response contract', () => {
  it('documents the frontend-safe node shape', () => {
    const node = { id: 1, program_code: '2x4', level: 1, position: 1, status: 'active', is_current_user: true };
    expect(node).not.toHaveProperty('user_id');
    expect(node).not.toHaveProperty('referrer_user_id');
    expect(node).toHaveProperty('is_current_user', true);
  });
});

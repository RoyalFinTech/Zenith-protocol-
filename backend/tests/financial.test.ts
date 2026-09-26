import { describe, expect, it } from 'vitest';
import { canTransitionWithdrawal, isUniqueConstraintViolation } from '../src/utils/financial.js';

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

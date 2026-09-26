export const withdrawalTransitions = {
  pending: ['approved', 'rejected'],
  approved: ['processing', 'rejected'],
  processing: ['failed'],
  completed: [],
  rejected: [],
  failed: []
} as const;

export function canTransitionWithdrawal(current: string, next: string): boolean {
  return (withdrawalTransitions as Record<string, readonly string[]>)[current]?.includes(next) ?? false;
}

export function isUniqueConstraintViolation(error: unknown, constraint: string): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
  return code === '23505' && String(error).includes(constraint);
}

export const packageTierRank = { starter:1, growth:2, elite:3 } as const;

export function comparePackageTiers(current: string, next: string): number {
  const currentRank = packageTierRank[current as keyof typeof packageTierRank] ?? 0;
  const nextRank = packageTierRank[next as keyof typeof packageTierRank] ?? 0;
  return nextRank - currentRank;
}

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
  const value = error as Record<string, unknown>;
  const code = String(value.code ?? '');
  if (code !== '23505') return false;
  return Object.values(value).some(v => typeof v === 'string' && v.includes(constraint));
}

import { randomBytes } from 'node:crypto';
export const randomNonce = () => randomBytes(24).toString('hex');
export const randomReferralCode = () => randomBytes(6).toString('hex').toUpperCase();

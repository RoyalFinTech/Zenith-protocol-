import { describe,it,expect } from 'vitest';
import { randomReferralCode, randomNonce } from '../src/utils/crypto.js';
describe('crypto primitives',()=>{it('creates referral codes',()=>expect(randomReferralCode()).toMatch(/^[A-F0-9]{12}$/));it('creates nonces',()=>expect(randomNonce()).toHaveLength(48));});

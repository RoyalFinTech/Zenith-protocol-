#!/usr/bin/env node
import process from 'node:process';

const testCase = String(process.env.RESEND_TEST_CASE || 'delivered').trim().toLowerCase();
const recipients = {
  delivered: 'delivered@resend.dev',
  bounced: 'bounced@resend.dev',
  spam: 'complained@resend.dev'
};
const recipient = recipients[testCase];
if (!recipient) {
  throw new Error('RESEND_TEST_CASE must be delivered, bounced, or spam');
}
if (process.env.NODE_ENV === 'production') {
  throw new Error('The Resend test script is development-only and cannot run with NODE_ENV=production');
}
const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) throw new Error('RESEND_API_KEY is required');

const from = process.env.RESEND_TEST_FROM || 'onboarding@resend.dev';
const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from,
    to: [recipient],
    subject: `ZENIT Resend test: ${testCase}`,
    html: `<p>ZENIT Protocol Resend development test.</p><p>Simulation: <strong>${testCase}</strong>.</p>`,
  }),
  signal: AbortSignal.timeout(10000),
});

const body = await response.text();
if (!response.ok) {
  throw new Error(`Resend test failed (${response.status}): ${body.slice(0, 500)}`);
}
console.log(`Resend test sent for "${testCase}" to ${recipient}: ${body}`);

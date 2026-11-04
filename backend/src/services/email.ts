import { env } from '../config.js';
import nodemailer from 'nodemailer';
import { createHash } from 'node:crypto';

type WelcomeEmailInput = {
  to: string;
  username: string;
  appOrigin: string;
};

type TransactionalEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
  tags?: string[];
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char] ?? char));
}

function officialLogoUrl(appOrigin: string) {
  return new URL('/zenit-logo.png?v=zenit-official-20260922', new URL(appOrigin).origin).toString();
}

function providerConfigured() {
  return env.emailProvider === 'mailersend'
    ? Boolean(
        env.mailersendFrom &&
        ((env.mailersendTransport === 'smtp' && env.mailersendSmtpUser && env.mailersendSmtpPassword) ||
         (env.mailersendTransport === 'api' && env.mailersendApiKey))
      )
    : Boolean(env.resendApiKey && env.resendFrom);
}

function assertProviderConfigured() {
  if (!providerConfigured()) {
    throw new Error('EMAIL_PROVIDER_NOT_CONFIGURED');
  }
}

async function sendViaResend({ to, subject, html, text, idempotencyKey }: TransactionalEmailInput) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify({
      from: env.resendFrom,
      to: [to],
      subject,
      html,
      text
    }),
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Resend email failed (${response.status}): ${body.slice(0, 300)}`);
  }
}

async function sendViaMailerSendSmtp({ to, subject, html, text, idempotencyKey }: TransactionalEmailInput) {
  const transporter = nodemailer.createTransport({
    host: env.mailersendSmtpHost,
    port: env.mailersendSmtpPort,
    secure: false,
    requireTLS: true,
    auth: {
      user: env.mailersendSmtpUser,
      pass: env.mailersendSmtpPassword
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    tls: {
      minVersion: 'TLSv1.2'
    }
  });

  try {
    await transporter.sendMail({
      from: {
        address: env.mailersendFrom,
        name: env.mailersendFromName
      },
      to,
      subject,
      text,
      html,
      headers: {
        'Message-ID': `<${createHash('sha256').update(idempotencyKey).digest('hex')}@${new URL(env.appOrigin).hostname}>`
      }
    });
  } finally {
    transporter.close();
  }
}

async function sendViaMailerSend({ to, subject, html, text, tags }: TransactionalEmailInput) {
  const response = await fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.mailersendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: {
        email: env.mailersendFrom,
        name: env.mailersendFromName
      },
      to: [{ email: to }],
      subject,
      html,
      text,
      ...(tags?.length ? { tags } : {})
    }),
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`MailerSend email failed (${response.status}): ${body.slice(0, 300)}`);
  }
}

async function sendTransactionalEmail(input: TransactionalEmailInput) {
  assertProviderConfigured();
  if (env.emailProvider === 'mailersend') {
    if (env.mailersendTransport === 'smtp') {
      await sendViaMailerSendSmtp(input);
    } else {
      await sendViaMailerSend(input);
    }
  } else {
    await sendViaResend(input);
  }
}

export async function sendWelcomeEmail({ to, username, appOrigin }: WelcomeEmailInput) {
  if (!to || !providerConfigured()) return { sent: false, skipped: true };

  const safeUsername = escapeHtml(username);
  const safeOrigin = escapeHtml(appOrigin);
  const logoUrl = escapeHtml(officialLogoUrl(appOrigin));
  const logoMarkup = '<div style="margin:0 0 18px"><img src="' + logoUrl + '" alt="ZENIT Protocol" width="210" style="display:block;width:210px;max-width:100%;height:auto;border:0"></div>';
  const html = `
    <div style="font-family:Arial,sans-serif;background:#f5f7fb;padding:32px;color:#111827">
      <div style="max-width:620px;margin:auto;background:#fff;border-radius:18px;padding:36px;box-shadow:0 8px 30px rgba(15,23,42,.08)">
        ${logoMarkup}
        <p style="color:#64748b;margin-top:6px">Decentralized Wealth Network</p>
        <h1 style="font-size:28px;margin-top:34px">Welcome, @${safeUsername}</h1>
        <p>Your ZENIT Protocol member profile is now connected and synchronized with your wallet.</p>
        <p>You can return to your ZENIT workspace at any time to manage your profile and continue exploring the network.</p>
        <a href="${safeOrigin}" style="display:inline-block;margin-top:18px;background:#111827;color:#fff;text-decoration:none;padding:13px 20px;border-radius:10px">Open ZENIT Protocol</a>
        <p style="font-size:12px;color:#94a3b8;margin-top:30px">This is a transactional account email from ZENIT Protocol.</p>
      </div>
    </div>`;
  const text = `Welcome, @${username}.

Your ZENIT Protocol member profile is now connected and synchronized with your wallet.

Open ZENIT Protocol: ${appOrigin}

This is a transactional account email from ZENIT Protocol.`;

  await sendTransactionalEmail({
    to,
    subject: 'Welcome to ZENIT Protocol',
    html,
    text,
    idempotencyKey: `zenit-welcome#${to.toLowerCase()}#${username.toLowerCase()}`,
    tags: ['zenit', 'welcome']
  });

  return { sent: true, skipped: false };
}

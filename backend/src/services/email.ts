import { env } from '../config.js';

type WelcomeEmailInput = {
  to: string;
  username: string;
  appOrigin: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char] ?? char));
}

export async function sendWelcomeEmail({ to, username, appOrigin }: WelcomeEmailInput) {
  if (!env.resendApiKey || !to) return { sent: false, skipped: true };

  const safeUsername = escapeHtml(username);
  const safeOrigin = escapeHtml(appOrigin);
  const logoUrl = `${new URL(appOrigin).origin}/zenit-logo.svg`;
  const html = `
    <div style="font-family:Arial,sans-serif;background:#f5f7fb;padding:32px;color:#111827">
      <div style="max-width:620px;margin:auto;background:#fff;border-radius:18px;padding:36px;box-shadow:0 8px 30px rgba(15,23,42,.08)">
        <div style="font-size:24px;font-weight:800;letter-spacing:.08em">ZENIT <span style="font-weight:500">PROTOCOL</span></div>
        <p style="color:#64748b;margin-top:6px">Decentralized Wealth Network</p>
        <h1 style="font-size:28px;margin-top:34px">Welcome, @${safeUsername}</h1>
        <p>Your ZENIT Protocol member profile is now connected and synchronized with your wallet.</p>
        <p>You can return to your ZENIT workspace at any time to manage your profile and continue exploring the network.</p>
        <a href="${safeOrigin}" style="display:inline-block;margin-top:18px;background:#111827;color:#fff;text-decoration:none;padding:13px 20px;border-radius:10px">Open ZENIT Protocol</a>
        <p style="font-size:12px;color:#94a3b8;margin-top:30px">This is a transactional account email from ZENIT Protocol.</p>
      </div>
    </div>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: env.resendFrom,
      to: [to],
      subject: 'Welcome to ZENIT Protocol',
      html
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Resend email failed (${response.status}): ${body.slice(0, 300)}`);
  }

  return { sent: true, skipped: false };
}


type VerificationEmailInput = { to: string; username: string; verifyUrl: string; registrationId: string; appOrigin: string };

export async function sendVerificationEmail({ to, username, verifyUrl, registrationId, appOrigin }: VerificationEmailInput) {
  if (!to) throw new Error('Verification recipient is missing');
  if (!env.resendApiKey) throw new Error('RESEND_API_KEY is not configured on the backend');
  const safeUsername = escapeHtml(username);
  const safeUrl = escapeHtml(verifyUrl);
  const logoOrigin = new URL(verifyUrl).origin;
  const logoUrl = `${logoOrigin}/zenit-logo.svg`;
  const html = `
    <div style="font-family:Arial,sans-serif;background:#f5f7fb;padding:28px;color:#111827">
      <div style="max-width:620px;margin:auto;background:#fff;border-radius:18px;padding:34px;box-shadow:0 8px 30px rgba(15,23,42,.08)">
        <img src="${logoUrl}" alt="ZENIT Protocol" width="220" style="display:block;width:220px;max-width:100%;height:auto;margin:0 0 18px;border:0" />
        <p style="color:#64748b;margin-top:6px">Decentralized Wealth Network</p>
        <h1 style="font-size:26px;margin-top:30px">Verify your ZENIT email</h1>
        <p>Hi @${safeUsername}, confirm that this email address belongs to you before connecting your wallet.</p>
        <a href="${safeUrl}" style="display:inline-block;margin-top:18px;background:#111827;color:#fff;text-decoration:none;padding:14px 22px;border-radius:10px;font-weight:700">Confirm email address</a>
        <p style="font-size:12px;color:#64748b;margin-top:22px">This verification link expires in 30 minutes and can be used once.</p>
        <p style="font-size:12px;color:#94a3b8;margin-top:28px">If you did not request a ZENIT Protocol account, you can ignore this email.</p>
      </div>
    </div>`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.resendApiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `zenit-email-verification#${registrationId}` },
    body: JSON.stringify({ from: env.resendFrom, to: [to], subject: 'Verify your email for ZENIT Protocol', html })
  });
  if (!response.ok) { const body = await response.text().catch(() => ''); throw new Error(`Resend verification email failed (${response.status}): ${body.slice(0,300)}`); }
  return { sent: true, skipped: false };
}

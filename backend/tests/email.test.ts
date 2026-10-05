import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMail = vi.fn().mockResolvedValue({ messageId: 'test-message-id' });
const createTransport = vi.fn(() => ({
  sendMail,
  close: vi.fn()
}));

vi.mock('nodemailer', () => ({ default: { createTransport } }));

describe('transactional email provider', () => {
  beforeEach(() => {
    vi.resetModules();
    sendMail.mockReset();
    sendMail.mockResolvedValue({ messageId: 'test-message-id' });
    createTransport.mockClear();
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test?sslmode=require';
    process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters-long';
    process.env.APP_ORIGIN = 'https://zenith-protocol-qvfe.onrender.com';
    process.env.API_PUBLIC_URL = 'https://zenith-protocol-qvfe.onrender.com';
    process.env.CORS_ORIGINS = 'https://zenith-protocol-qvfe.onrender.com';
    process.env.EMAIL_PROVIDER = 'mailersend';
    process.env.MAILERSEND_TRANSPORT = 'smtp';
    process.env.MAILERSEND_SMTP_HOST = 'smtp.mailersend.net';
    process.env.MAILERSEND_SMTP_PORT = '587';
    process.env.MAILERSEND_SMTP_USER = 'test-smtp-user';
    process.env.MAILERSEND_SMTP_PASSWORD = 'test-smtp-password';
    process.env.MAILERSEND_FROM = 'no-reply@example.test';
    process.env.MAILERSEND_FROM_NAME = 'ZENIT Protocol';
    delete process.env.MAILERSEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM;
  });

  it('sends verification email through the MailerSend SMTP relay with the custom ZENIT template', async () => {
    const { sendVerificationEmail } = await import('../src/services/email.js');
    await sendVerificationEmail({
      to: 'recipient@example.com',
      username: 'member',
      verifyUrl: 'https://zenith-protocol-qvfe.onrender.com/api/auth/register/verify?token=test-token',
      registrationId: 'registration-123',
      appOrigin: 'https://zenith-protocol-qvfe.onrender.com'
    });

    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: 'smtp.mailersend.net',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: 'test-smtp-user', pass: 'test-smtp-password' },
      maxConnections: 5
    }));

    expect(sendMail).toHaveBeenCalledTimes(1);
    const payload = sendMail.mock.calls[0]![0];
    expect(payload.from).toEqual({ address: 'no-reply@example.test', name: 'ZENIT Protocol' });
    expect(payload.to).toBe('recipient@example.com');
    expect(payload.subject).toBe('Verify your email for ZENIT Protocol');
    expect(payload.html).toContain('https://zenith-protocol-qvfe.onrender.com/zenit-logo.png?v=zenit-official-20260922');
    expect(payload.html).toContain('alt="ZENIT Protocol"');
    expect(payload.html).toContain('Confirm email address');
    expect(payload.text).toContain('Confirm that this email address belongs to you');
    expect(payload.headers['Message-ID']).toMatch(/^<.+@zenith-protocol-qvfe\.onrender\.com>$/);
  });

  it('does not use the Resend endpoint when MailerSend SMTP is selected', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { sendWelcomeEmail } = await import('../src/services/email.js');
    await sendWelcomeEmail({
      to: 'recipient@example.com',
      username: 'member',
      appOrigin: 'https://zenith-protocol-qvfe.onrender.com'
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendMail).toHaveBeenCalledTimes(1);
  });
});

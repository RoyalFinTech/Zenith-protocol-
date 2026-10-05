import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('transactional email provider', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test?sslmode=require';
    process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters-long';
    process.env.APP_ORIGIN = 'https://zenith-protocol-qvfe.onrender.com';
    process.env.API_PUBLIC_URL = 'https://zenith-protocol-qvfe.onrender.com';
    process.env.CORS_ORIGINS = 'https://zenith-protocol-qvfe.onrender.com';
    process.env.EMAIL_PROVIDER = 'mailersend';
    process.env.MAILERSEND_API_KEY = 'test-mailersend-key';
    process.env.MAILERSEND_FROM = 'hello@trial-zenit.mlsend.com';
    process.env.MAILERSEND_FROM_NAME = 'ZENIT Protocol';
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM;
  });

  it('sends verification email through the MailerSend API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);

    const { sendVerificationEmail } = await import('../src/services/email.js');
    await sendVerificationEmail({
      to: 'recipient@example.com',
      username: 'member',
      verifyUrl: 'https://zenith-protocol-qvfe.onrender.com/api/auth/register/verify?token=test-token',
      registrationId: 'registration-123',
      appOrigin: 'https://zenith-protocol-qvfe.onrender.com'
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.mailersend.com/v1/email');
    expect(init.headers.Authorization).toBe('Bearer test-mailersend-key');
    const payload = JSON.parse(init.body);
    expect(payload.from).toEqual({ email: 'hello@trial-zenit.mlsend.com', name: 'ZENIT Protocol' });
    expect(payload.to).toEqual([{ email: 'recipient@example.com' }]);
    expect(payload.subject).toBe('Verify your email for ZENIT Protocol');
    expect(payload.text).toContain('Confirm that this email address belongs to you');
    expect(payload.tags).toEqual(['zenit', 'verification']);
  });

  it('does not use the Resend endpoint when MailerSend is selected', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);

    const { sendWelcomeEmail } = await import('../src/services/email.js');
    await sendWelcomeEmail({
      to: 'recipient@example.com',
      username: 'member',
      appOrigin: 'https://zenith-protocol-qvfe.onrender.com'
    });

    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.mailersend.com/v1/email');
  });
});

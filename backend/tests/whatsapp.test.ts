import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('MailerSend WhatsApp integration', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters-long';
    process.env.APP_ORIGIN = 'https://zenith-protocol-qvfe.onrender.com';
    process.env.API_PUBLIC_URL = 'https://zenith-protocol-qvfe.onrender.com';
    process.env.CORS_ORIGINS = 'https://zenith-protocol-qvfe.onrender.com';
    process.env.MAILERSEND_API_KEY = 'test-mailersend-api-key';
    process.env.MAILERSEND_WHATSAPP_FROM = 'sender-id';
    process.env.MAILERSEND_WHATSAPP_PIN_RESET_TEMPLATE_ID = 'pin-reset-template';
    process.env.MAILERSEND_WHATSAPP_UPDATE_TEMPLATE_ID = 'account-update-template';
  });

  it('sends the PIN reset template to an E.164 WhatsApp recipient', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: 'message-123' } }), {
      status: 202,
      headers: { 'X-Message-Id': 'message-123' }
    }));
    vi.stubGlobal('fetch', fetchMock);

    const { sendWhatsAppPinResetCode } = await import('../src/services/whatsapp.js');
    const result = await sendWhatsAppPinResetCode('+220 123 4567', '123456');

    expect(result).toEqual({ sent: true, messageId: 'message-123' });
    expect(fetchMock).toHaveBeenCalledWith('https://api.mailersend.com/v1/whatsapp/send', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer test-mailersend-api-key',
        'Content-Type': 'application/json'
      })
    }));

    const request = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({
      from: 'sender-id',
      to: ['+2201234567'],
      template_id: 'pin-reset-template',
      personalization: [{ to: '+2201234567', data: { body: ['123456'] } }]
    });
  });

  it('does not attempt delivery when WhatsApp is not configured', async () => {
    delete process.env.MAILERSEND_API_KEY;
    vi.stubGlobal('fetch', vi.fn());
    const { sendWhatsAppPinResetCode } = await import('../src/services/whatsapp.js');
    await expect(sendWhatsAppPinResetCode('+2201234567', '123456')).resolves.toEqual({ sent: false });
    expect(fetch).not.toHaveBeenCalled();
  });
});

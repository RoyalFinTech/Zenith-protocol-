import { query } from '../db.js';
import { env } from '../config.js';
import { normalizeWhatsAppNumber } from '../utils/phone.js';

type WhatsAppResult = {
  sent: boolean;
  messageId?: string | null;
};

async function sendWhatsAppTemplate(to: string, templateId: string, body: string[]): Promise<WhatsAppResult> {
  if (!env.mailersendApiKey || !env.mailersendWhatsAppFrom || !templateId) {
    return { sent: false };
  }

  const response = await fetch('https://api.mailersend.com/v1/whatsapp/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.mailersendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: env.mailersendWhatsAppFrom,
      to: [to],
      template_id: templateId,
      personalization: [{ to, data: { body } }]
    }),
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(`MailerSend WhatsApp send failed (${response.status}): ${message.slice(0, 300)}`);
  }

  return {
    sent: true,
    messageId: response.headers.get('X-Message-Id')
  };
}

export async function sendWhatsAppPinResetCode(to: string, code: string): Promise<WhatsAppResult> {
  return sendWhatsAppTemplate(
    normalizeWhatsAppNumber(to),
    env.mailersendWhatsAppPinResetTemplateId,
    [code]
  );
}

export async function sendUserWhatsAppUpdate(userId: string, title: string, message: string): Promise<WhatsAppResult> {
  const user = (await query<{whatsapp_number:string|null;whatsapp_updates_enabled:boolean}>(
    `select whatsapp_number,whatsapp_updates_enabled from app_users where id=$1`,
    [userId]
  )).rows[0];

  if (!user?.whatsapp_number || !user.whatsapp_updates_enabled) {
    return { sent: false };
  }

  return sendWhatsAppTemplate(
    normalizeWhatsAppNumber(user.whatsapp_number),
    env.mailersendWhatsAppUpdateTemplateId,
    [title, message]
  );
}

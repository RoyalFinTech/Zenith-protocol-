export function normalizeWhatsAppNumber(value: unknown): string {
  const raw = String(value ?? '').trim().replace(/[\s().-]/g, '');
  const normalized = raw.startsWith('00') ? '+' + raw.slice(2) : raw;
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error('Enter your WhatsApp number in international format, including the country code (for example +220XXXXXXXX).');
  }
  return normalized;
}

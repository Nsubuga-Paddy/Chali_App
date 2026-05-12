/**
 * Normalize user-entered phone to E.164 for Uganda-centric Chali flows.
 * Align with server OTP routes and Firebase Phone Auth.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) return '+256' + digits.slice(1)
  if (!digits.startsWith('256')) return '+256' + digits
  return '+' + digits
}

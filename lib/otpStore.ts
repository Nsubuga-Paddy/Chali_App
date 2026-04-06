/**
 * Server-side OTP store with TTL.
 * In-memory: works for single instance; for multi-instance (e.g. multiple Railway replicas)
 * consider switching to Firestore or Redis.
 */

const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes

interface StoredOtp {
  code: string
  expiresAt: number
}

const store = new Map<string, StoredOtp>()

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) return '+256' + digits.slice(1)
  if (!digits.startsWith('256')) return '+256' + digits
  return '+' + digits
}

export function setOtp(phone: string, code: string): void {
  const key = normalizePhone(phone)
  store.set(key, {
    code,
    expiresAt: Date.now() + OTP_TTL_MS,
  })
}

export function getAndClearOtp(phone: string): string | null {
  const key = normalizePhone(phone)
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  store.delete(key)
  return entry.code
}

export function getOtp(phone: string): string | null {
  const key = normalizePhone(phone)
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  return entry.code
}

export { normalizePhone }

/**
 * Public Chali handle for payments / discovery.
 * If the mobile app uses a different algorithm, replace this and migrate existing docs as needed.
 */
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz'

export function generateChaliId(): string {
  const bytes = new Uint8Array(8)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  let out = ''
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length]
  }
  return out
}

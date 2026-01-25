export interface SavedAccount {
  id: string
  type: string
  label: string
  number: string
}

const STORAGE_PREFIX = 'chali_saved_accounts'

function keyFor(userId?: string) {
  const trimmed = (userId || '').trim()
  return trimmed ? `${STORAGE_PREFIX}:${trimmed}` : STORAGE_PREFIX
}

export function loadSavedAccounts(userId?: string): SavedAccount[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(keyFor(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    // Basic shape validation (ignore bad entries rather than crashing)
    return parsed
      .filter((x) => x && typeof x === 'object')
      .map((x) => ({
        id: String((x as any).id ?? ''),
        type: String((x as any).type ?? ''),
        label: String((x as any).label ?? ''),
        number: String((x as any).number ?? ''),
      }))
      .filter((x) => x.id && x.type && x.number)
  } catch {
    return []
  }
}

export function saveSavedAccounts(accounts: SavedAccount[], userId?: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(accounts))
  } catch {
    // ignore storage errors (quota, disabled, etc.)
  }
}


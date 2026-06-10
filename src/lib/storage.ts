import type { Storage } from '../types'

const KEY = 'life-dashboard:v1'
const WRITE_DEBOUNCE_MS = 300

/** Fresh, empty schema seeded on first run or when stored data is invalid. */
export function emptyStorage(): Storage {
  return {
    version: 1,
    challenges: {
      pullups: {
        goalPerDay: 100,
        startedAt: null,
        days: {},
      },
    },
  }
}

/** Minimal schema validation — just the version gate from the plan (§4). */
function isValid(data: unknown): data is Storage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { version?: unknown }).version === 1 &&
    typeof (data as { challenges?: unknown }).challenges === 'object'
  )
}

/** Read + validate from localStorage. Returns an empty schema on any problem. */
export function loadStorage(): Storage {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyStorage()
    const parsed = JSON.parse(raw)
    if (!isValid(parsed)) return emptyStorage()
    return parsed
  } catch {
    return emptyStorage()
  }
}

let timer: ReturnType<typeof setTimeout> | null = null

/** Debounced write (300ms) so rapid [+] clicks don't thrash storage. */
export function saveStorage(data: Storage): void {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      // localStorage full or unavailable — silently ignore (single-user local app)
    }
    timer = null
  }, WRITE_DEBOUNCE_MS)
}

/** Force an immediate, un-debounced flush (used on import / reset). */
export function flushStorage(data: Storage): void {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // ignore
  }
}

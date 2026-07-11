import { cookies } from 'next/headers'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * IANA timezone reported by the client via the `tz` cookie
 * (set by <TimezoneCookie />). Falls back to UTC on first visit
 * or when the cookie holds an invalid identifier.
 */
export async function getUserTimezone(): Promise<string> {
  try {
    const store = await cookies()
    const tz = store.get('tz')?.value
    if (tz) {
      // Throws on invalid identifiers
      new Intl.DateTimeFormat('en-US', { timeZone: tz })
      return tz
    }
  } catch {
    // fall through to UTC
  }
  return 'UTC'
}

/** Calendar-day key ("YYYY-MM-DD") of an instant in the given timezone. */
export function dayKeyInTz(date: Date, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function tzOffsetMinutes(at: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts: Record<string, string> = {}
  for (const p of dtf.formatToParts(at)) parts[p.type] = p.value
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  )
  return (asUTC - at.getTime()) / 60_000
}

/** UTC instant at which the calendar day containing `date` starts in `timeZone`. */
export function startOfDayInTz(date: Date, timeZone: string): Date {
  const [y, m, d] = dayKeyInTz(date, timeZone).split('-').map(Number)
  // Initial guess assumes UTC, then corrected by the zone offset at the
  // guessed instant (second pass handles DST-transition edges).
  let guess = new Date(Date.UTC(y, m - 1, d))
  for (let i = 0; i < 2; i++) {
    guess = new Date(Date.UTC(y, m - 1, d) - tzOffsetMinutes(guess, timeZone) * 60_000)
  }
  return guess
}

/** Whole calendar days between two instants as observed in `timeZone` (a - b). */
export function dayDiffInTz(a: Date, b: Date, timeZone: string): number {
  const [ya, ma, da] = dayKeyInTz(a, timeZone).split('-').map(Number)
  const [yb, mb, db] = dayKeyInTz(b, timeZone).split('-').map(Number)
  return Math.round((Date.UTC(ya, ma - 1, da) - Date.UTC(yb, mb - 1, db)) / DAY_MS)
}

'use client'

import { useEffect } from 'react'

/**
 * Reports the browser's IANA timezone to the server via a cookie so that
 * day-boundary logic (streaks, "today" counters, heatmap buckets) uses the
 * user's local day instead of the server's.
 */
export function TimezoneCookie() {
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (tz) {
        document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`
      }
    } catch {
      // leave the server on its UTC fallback
    }
  }, [])
  return null
}

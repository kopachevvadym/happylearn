'use client'

import { useSyncExternalStore } from 'react'

const emptySubscribe = () => () => {}

/**
 * true after hydration, false during SSR/first client render.
 * Replaces the `useEffect(() => setMounted(true), [])` pattern, which the
 * react-hooks/set-state-in-effect rule rejects.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

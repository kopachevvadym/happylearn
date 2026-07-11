'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { STALE_TIME } from '@/providers/query-provider'
import type { Word } from '@/types'
import { wordsKeys, TIMELINE_PAGE_SIZE } from './keys'

export { wordsKeys, TIMELINE_PAGE_SIZE }

/**
 * Keyset (created_at, id) cursor. Pointing the cursor at the oldest loaded row's
 * (created_at, id) — and paging with a strict tuple comparison — is what keeps
 * words that share an identical created_at (a whole bulk-import batch inserted
 * in one transaction all get the same now()) from being silently dropped at a
 * page boundary. `null` means "load the newest page".
 */
export type TimelineCursor = { created_at: string; id: string } | null

/** getNextPageParam shared by the client hook and the server prefetch. */
export function getTimelineNextPageParam(lastPage: Word[]): TimelineCursor | undefined {
  if (lastPage.length < TIMELINE_PAGE_SIZE) return undefined
  const last = lastPage[lastPage.length - 1]
  return last?.created_at ? { created_at: last.created_at, id: last.id } : undefined
}

async function fetchWordsTimelinePage(userId: string, cursor: TimelineCursor): Promise<Word[]> {
  const supabase = createClient()
  let query = supabase
    .from('words')
    .select('*')
    .eq('user_id', userId)
    // Total order: id breaks created_at ties so keyset paging never skips rows.
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(TIMELINE_PAGE_SIZE)

  if (cursor) {
    // (created_at, id) < (cursor.created_at, cursor.id)
    query = query.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`
    )
  }

  const { data } = await query
  return data ?? []
}

export function useWordsTimeline(userId: string) {
  return useInfiniteQuery({
    queryKey: wordsKeys.timeline(userId),
    queryFn: ({ pageParam }) => fetchWordsTimelinePage(userId, pageParam),
    initialPageParam: null as TimelineCursor,
    getNextPageParam: getTimelineNextPageParam,
    staleTime: STALE_TIME,
  })
}

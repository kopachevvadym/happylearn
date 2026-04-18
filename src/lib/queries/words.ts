'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { STALE_TIME } from '@/providers/query-provider'
import { wordsKeys } from './keys'

export { wordsKeys }

async function fetchWords(userId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('words')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return data ?? []
}

async function fetchWordProgress(userId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('word_progress')
    .select('word_id, is_learned')
    .eq('user_id', userId)
  return data ?? []
}

export function useWords(userId: string) {
  return useQuery({
    queryKey: wordsKeys.list(userId),
    queryFn: () => fetchWords(userId),
    staleTime: STALE_TIME,
  })
}

export function useWordProgress(userId: string) {
  return useQuery({
    queryKey: wordsKeys.progress(userId),
    queryFn: () => fetchWordProgress(userId),
    staleTime: STALE_TIME,
  })
}

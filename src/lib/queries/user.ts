'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { STALE_TIME } from '@/providers/query-provider'
import { profileKeys } from './keys'

export { profileKeys }

async function fetchProfile(userId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

async function fetchProfileLangs(userId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('users')
    .select('default_source_lang, default_target_lang')
    .eq('id', userId)
    .single()
  return data
}

export function useProfile(userId: string) {
  return useQuery({
    queryKey: profileKeys.detail(userId),
    queryFn: () => fetchProfile(userId),
    staleTime: STALE_TIME,
  })
}

export function useProfileLangs(userId: string) {
  return useQuery({
    queryKey: profileKeys.langs(userId),
    queryFn: () => fetchProfileLangs(userId),
    staleTime: STALE_TIME,
  })
}

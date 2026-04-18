'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { STALE_TIME } from '@/providers/query-provider'
import { collectionsKeys } from './keys'

export { collectionsKeys }

async function fetchOwnCollections(userId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('collections')
    .select('*, collection_words(count), collection_follows(count)')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
  return data ?? []
}

async function fetchOwnCollectionsSimple(userId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('collections')
    .select('id, name')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
  return data ?? []
}

async function fetchFollowedCollections(userId: string) {
  const supabase = createClient()
  const { data: followedRaw } = await supabase
    .from('collection_follows')
    .select('collection_id')
    .eq('user_id', userId)

  const followedIds = (followedRaw ?? []).map(
    (f) => (f as { collection_id: string }).collection_id
  )

  if (!followedIds.length) return []

  const { data } = await supabase
    .from('collections')
    .select('id, name, description, source_lang, target_lang, is_public, is_default, users(username), collection_words(count)')
    .in('id', followedIds)
  return data ?? []
}

export function useOwnCollections(userId: string) {
  return useQuery({
    queryKey: collectionsKeys.own(userId),
    queryFn: () => fetchOwnCollections(userId),
    staleTime: STALE_TIME,
  })
}

export function useOwnCollectionsSimple(userId: string) {
  return useQuery({
    queryKey: collectionsKeys.ownSimple(userId),
    queryFn: () => fetchOwnCollectionsSimple(userId),
    staleTime: STALE_TIME,
  })
}

export function useFollowedCollections(userId: string) {
  return useQuery({
    queryKey: collectionsKeys.followed(userId),
    queryFn: () => fetchFollowedCollections(userId),
    staleTime: STALE_TIME,
  })
}

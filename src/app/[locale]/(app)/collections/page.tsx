import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { collectionsKeys, profileKeys } from '@/lib/queries/keys'
import { CollectionsContent } from './collections-content'

export default async function CollectionsPage() {
  const t = await getTranslations('collections')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const queryClient = new QueryClient()

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: collectionsKeys.own(user.id),
      queryFn: async () => {
        const { data } = await supabase
          .from('collections')
          .select('*, collection_words(count), collection_follows(count)')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false })
        return data ?? []
      },
    }),
    queryClient.prefetchQuery({
      queryKey: collectionsKeys.followed(user.id),
      queryFn: async () => {
        const { data: followedRaw } = await supabase
          .from('collection_follows')
          .select('collection_id')
          .eq('user_id', user.id)

        const followedIds = (followedRaw ?? []).map(
          (f) => (f as { collection_id: string }).collection_id
        )

        if (!followedIds.length) return []

        const { data } = await supabase
          .from('collections')
          .select('id, name, description, source_lang, target_lang, is_public, is_default, users:public_profiles(username), collection_words(count)')
          .in('id', followedIds)
        return data ?? []
      },
    }),
    queryClient.prefetchQuery({
      queryKey: profileKeys.langs(user.id),
      queryFn: async () => {
        const { data } = await supabase
          .from('users')
          .select('default_source_lang, default_target_lang')
          .eq('id', user.id)
          .single()
        return data
      },
    }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CollectionsContent userId={user.id} title={t('title')} />
    </HydrationBoundary>
  )
}

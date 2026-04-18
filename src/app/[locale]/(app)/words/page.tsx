import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { wordsKeys, collectionsKeys, profileKeys } from '@/lib/queries/keys'
import { WordsContent } from './words-content'

export default async function WordsPage() {
  const t = await getTranslations('words')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const queryClient = new QueryClient()

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: wordsKeys.list(user.id),
      queryFn: async () => {
        const { data } = await supabase
          .from('words')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        return data ?? []
      },
    }),
    queryClient.prefetchQuery({
      queryKey: wordsKeys.progress(user.id),
      queryFn: async () => {
        const { data } = await supabase
          .from('word_progress')
          .select('word_id, is_learned')
          .eq('user_id', user.id)
        return data ?? []
      },
    }),
    queryClient.prefetchQuery({
      queryKey: collectionsKeys.ownSimple(user.id),
      queryFn: async () => {
        const { data } = await supabase
          .from('collections')
          .select('id, name')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false })
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
      <WordsContent userId={user.id} title={t('title')} />
    </HydrationBoundary>
  )
}

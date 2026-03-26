import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { CollectionsList } from '@/components/collections/collections-list'

export default async function CollectionsPage() {
  const t = await getTranslations('collections')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: ownCollections } = await supabase
    .from('collections')
    .select('*, collection_words(count), collection_follows(count)')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })

  const { data: followedRaw } = await supabase
    .from('collection_follows')
    .select('collection_id')
    .eq('user_id', user.id)

  const { data: profileRaw } = await supabase
    .from('users')
    .select('default_source_lang, default_target_lang')
    .eq('id', user.id)
    .single()
  const profile = profileRaw as { default_source_lang: string; default_target_lang: string } | null

  // Fetch followed collections by their IDs
  const followedIds = (followedRaw ?? []).map((f) => (f as { collection_id: string }).collection_id)
  const { data: followedCollections } = followedIds.length
    ? await supabase
        .from('collections')
        .select('id, name, description, source_lang, target_lang, is_public, is_default, users(username), collection_words(count)')
        .in('id', followedIds)
    : { data: [] }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <CollectionsList
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ownCollections={(ownCollections ?? []) as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        followedCollections={(followedCollections ?? []) as any}
        defaultSourceLang={profile?.default_source_lang ?? 'en'}
        defaultTargetLang={profile?.default_target_lang ?? 'uk'}
      />
    </div>
  )
}

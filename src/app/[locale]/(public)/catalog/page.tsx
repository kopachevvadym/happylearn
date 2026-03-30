import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { CatalogClient } from '@/components/shared/catalog-client'

export default async function CatalogPage() {
  const t = await getTranslations('catalog')
  const supabase = await createClient()

  // Get current user (optional)
  const { data: { user } } = await supabase.auth.getUser()

  const query = supabase
    .from('collections')
    .select(`
      id, name, description, source_lang, target_lang, created_at, user_id,
      users(username, avatar_url),
      collection_words(count),
      collection_follows(count)
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(100)

  if (user) {
    query.neq('user_id', user.id)
  }

  const { data: collectionsRaw } = await query
  const collections = collectionsRaw as unknown as {
    id: string; name: string; description: string | null
    source_lang: string; target_lang: string; created_at: string; user_id: string
    users: { username: string; avatar_url: string | null } | null
    collection_words: { count: number }[]
    collection_follows: { count: number }[]
  }[] | null

  // Get user's follows if logged in
  let followedIds = new Set<string>()
  if (user) {
    const { data: follows } = await supabase
      .from('collection_follows')
      .select('collection_id')
      .eq('user_id', user.id)
    followedIds = new Set(follows?.map((f) => f.collection_id) ?? [])
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <CatalogClient
          collections={collections ?? []}
          followedIds={followedIds}
          isLoggedIn={!!user}
          currentUserId={user?.id ?? null}
        />
    </div>
  )
}

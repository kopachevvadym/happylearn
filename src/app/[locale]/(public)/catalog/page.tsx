import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { CatalogClient } from '@/components/shared/catalog-client'

export default async function CatalogPage() {
  const t = await getTranslations('catalog')
  const supabase = await createClient()

  // Get current user (optional)
  const { data: { user } } = await supabase.auth.getUser()

  const { data: collectionsRaw } = await supabase
    .from('collections')
    .select(`
      id, name, description, source_lang, target_lang, created_at,
      users(username, avatar_url),
      collection_words(count),
      collection_follows(count)
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(100)
  const collections = collectionsRaw as unknown as {
    id: string; name: string; description: string | null
    source_lang: string; target_lang: string; created_at: string
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="font-bold text-lg">happylearn</a>
          {!user && (
            <a href="/auth" className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
              Увійти
            </a>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <CatalogClient
          collections={collections ?? []}
          followedIds={followedIds}
          isLoggedIn={!!user}
        />
      </div>
    </div>
  )
}

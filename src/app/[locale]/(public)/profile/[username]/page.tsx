import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { SUPPORTED_LANGUAGES } from '@/types'

export default async function ProfilePage({ params }: { params: Promise<{ username: string; locale: string }> }) {
  const { username } = await params
  const t = await getTranslations('profile')
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('users')
    .select('id, username, avatar_url, display_role, bio, default_source_lang, default_target_lang')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const [collectionsRes, followersRes] = await Promise.all([
    supabase
      .from('collections')
      .select('id, name, description, source_lang, target_lang, collection_words(count)')
      .eq('user_id', profile.id)
      .eq('is_public', true),
    supabase
      .from('collection_follows')
      .select('id', { count: 'exact', head: true })
      .in(
        'collection_id',
        (
          await supabase
            .from('collections')
            .select('id')
            .eq('user_id', profile.id)
            .eq('is_public', true)
        ).data?.map((c) => c.id) ?? []
      ),
  ])

  const collections = collectionsRes.data as unknown as Array<{
    id: string
    name: string
    description: string | null
    source_lang: string
    target_lang: string
    collection_words: { count: number }[]
  }> | null

  const followerCount = followersRes.count ?? 0
  const initials = profile.username.slice(0, 2).toUpperCase()

  return (
    <div>
      {/* Breadcrumb */}
      <div className="border-b border-border/50">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">{t('home')}</Link>
          <span>/</span>
          <span className="text-foreground">{profile.username}</span>
        </div>
      </div>

      {/* Profile hero */}
      <div className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground">
                  {initials}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-1">
              {profile.display_role && (
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {profile.display_role}
                </p>
              )}
              <h1 className="text-3xl font-bold">{profile.username}</h1>
              <p className="text-sm text-muted-foreground">
                {followerCount} {t('followers')}
              </p>
              {profile.bio && (
                <p className="text-sm text-foreground/70 mt-2 max-w-lg">{profile.bio}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        {/* Collections / "Серії" */}
        <section>
          <h2 className="text-xl font-semibold mb-5">{t('collections_title')}</h2>
          {!collections?.length ? (
            <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
              {t('no_collections')}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {collections.map((col) => {
                const wordCount = col.collection_words?.[0]?.count ?? 0
                const sourceName = SUPPORTED_LANGUAGES[col.source_lang as keyof typeof SUPPORTED_LANGUAGES] ?? col.source_lang
                const targetName = SUPPORTED_LANGUAGES[col.target_lang as keyof typeof SUPPORTED_LANGUAGES] ?? col.target_lang
                return (
                  <div key={col.id} className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow">
                    {/* Cover placeholder */}
                    <div className="h-44 bg-gradient-to-br from-muted to-muted/40 flex items-center justify-center">
                      <span className="text-4xl font-bold text-muted-foreground/30 select-none">
                        {col.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="p-4 space-y-2">
                      <h3 className="font-semibold text-base">{col.name}</h3>
                      {col.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{col.description}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <span className="text-xs border border-border rounded px-2 py-0.5">{sourceName}</span>
                        <span className="text-xs border border-border rounded px-2 py-0.5">{targetName}</span>
                      </div>
                      <p className="text-xs text-muted-foreground pt-1">
                        {wordCount} {t('words_count_suffix')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Articles empty state */}
        <section>
          <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
            {t('no_articles')}
          </div>
        </section>
      </div>
    </div>
  )
}

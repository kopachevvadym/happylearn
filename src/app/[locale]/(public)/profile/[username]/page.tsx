import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { Flame, Globe } from 'lucide-react'
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

  const [streakRes, collectionsRes, userBadgesRes] = await Promise.all([
    supabase.from('user_streaks').select('current_streak').eq('user_id', profile.id).single(),
    supabase
      .from('collections')
      .select('id, name, description, source_lang, target_lang, collection_words(count)')
      .eq('user_id', profile.id)
      .eq('is_public', true),
    supabase
      .from('user_badges')
      .select('earned_at, badges(slug, name, description)')
      .eq('user_id', profile.id),
  ])
  const streak = streakRes.data as { current_streak: number } | null
  const collections = collectionsRes.data as unknown as Array<{
    id: string; name: string; description: string | null
    source_lang: string; target_lang: string
    collection_words: { count: number }[]
  }> | null
  const userBadges = userBadgesRes.data as unknown as Array<{
    earned_at: string
    badges: { slug: string; name: string; description: string | null } | null
  }> | null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="font-bold text-lg">happylearn</a>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Profile header */}
        <div className="flex items-start gap-4">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.username}
              className="w-16 h-16 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
              {profile.username[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold">@{profile.username}</h1>
            {profile.display_role && (
              <p className="text-muted-foreground">{profile.display_role}</p>
            )}
            {profile.bio && (
              <p className="text-sm mt-2">{profile.bio}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Globe className="w-4 h-4" />
                {SUPPORTED_LANGUAGES[profile.default_source_lang as keyof typeof SUPPORTED_LANGUAGES] ?? profile.default_source_lang} → {SUPPORTED_LANGUAGES[profile.default_target_lang as keyof typeof SUPPORTED_LANGUAGES] ?? profile.default_target_lang}
              </span>
              {streak?.current_streak ? (
                <span className="flex items-center gap-1">
                  <Flame className="w-4 h-4 text-orange-500" />
                  {t('streak', { count: streak.current_streak })}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Badges */}
        {userBadges && userBadges.length > 0 && (
          <section>
            <h2 className="font-semibold mb-3">{t('badges_title')}</h2>
            <div className="flex flex-wrap gap-2">
              {userBadges.map((ub) => (
                <div
                  key={ub.badges?.slug}
                  title={ub.badges?.description ?? ''}
                  className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium"
                >
                  {ub.badges?.name}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Public collections */}
        <section>
          <h2 className="font-semibold mb-3">{t('public_collections')}</h2>
          {!collections?.length ? (
            <p className="text-muted-foreground text-sm">{t('no_collections')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {collections.map((col) => {
                const wordCount = col.collection_words?.[0]?.count ?? 0
                return (
                  <div key={col.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
                    <h3 className="font-medium">{col.name}</h3>
                    {col.description && (
                      <p className="text-sm text-muted-foreground">{col.description}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {wordCount} слів · {SUPPORTED_LANGUAGES[col.source_lang as keyof typeof SUPPORTED_LANGUAGES] ?? col.source_lang} → {SUPPORTED_LANGUAGES[col.target_lang as keyof typeof SUPPORTED_LANGUAGES] ?? col.target_lang}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Flame, BookOpen } from 'lucide-react'
import { SUPPORTED_LANGUAGES } from '@/types'

// ─── Badge emoji map ──────────────────────────────────────────────────────────

const BADGE_EMOJI: Record<string, string> = {
  first_word: '📝',
  words_10: '📚',
  words_100: '🎓',
  streak_7: '🔥',
  streak_30: '⚡',
  first_collection: '📂',
  first_public: '🌐',
  first_follow: '👥',
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('public_profiles')
    .select('username, bio')
    .eq('username', username)
    .single()

  if (!profile) return {}

  return {
    title: `${profile.username} — happylearn`,
    description: profile.bio ?? `Профіль ${profile.username} на happylearn`,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string; locale: string }>
}) {
  const { username, locale } = await params
  const t = await getTranslations('profile')
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('public_profiles')
    .select('id, username, avatar_url, display_role, bio, default_source_lang, default_target_lang')
    .eq('username', username)
    .single()

  // View columns are typed nullable — narrow them once here
  if (!profile || !profile.id || !profile.username) notFound()
  const profileId = profile.id
  const profileUsername = profile.username

  const [streakRes, badgesRes, collectionsRes, learnedRes] = await Promise.all([
    supabase
      .from('user_streaks')
      .select('current_streak, longest_streak')
      .eq('user_id', profileId)
      .single(),
    supabase
      .from('user_badges')
      .select('earned_at, badge:badges(slug, name, description)')
      .eq('user_id', profileId)
      .order('earned_at', { ascending: false }),
    supabase
      .from('collections')
      .select('id, name, description, source_lang, target_lang, collection_words(count)')
      .eq('user_id', profileId)
      .eq('is_public', true)
      .order('created_at', { ascending: false }),
    // word_progress is private per-user; the aggregate comes from a
    // definer RPC so visitors see the real learned count instead of 0.
    supabase.rpc('get_public_profile_stats', { profile_id: profileId }),
  ])

  const streak = streakRes.data
  const badges = (badgesRes.data ?? []) as unknown as Array<{
    earned_at: string
    badge: { slug: string; name: string; description: string | null }
  }>
  const collections = (collectionsRes.data ?? []) as unknown as Array<{
    id: string
    name: string
    description: string | null
    source_lang: string
    target_lang: string
    collection_words: { count: number }[]
  }>
  const wordsCount = learnedRes.data?.[0]?.learned_count ?? 0

  const sourceLang = SUPPORTED_LANGUAGES[profile.default_source_lang as keyof typeof SUPPORTED_LANGUAGES] ?? profile.default_source_lang
  const targetLang = SUPPORTED_LANGUAGES[profile.default_target_lang as keyof typeof SUPPORTED_LANGUAGES] ?? profile.default_target_lang
  const initials = profileUsername.slice(0, 2).toUpperCase()

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Profile header */}
      <div className="flex items-start gap-6">
        {/* Avatar */}
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profileUsername}
            className="w-20 h-20 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground shrink-0">
            {initials}
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold">{profileUsername}</h1>

          {profile.display_role && (
            <p className="text-muted-foreground mt-0.5">{profile.display_role}</p>
          )}

          {profile.bio && (
            <p className="text-sm mt-2 max-w-md">{profile.bio}</p>
          )}

          <p className="text-sm text-muted-foreground mt-2">
            {targetLang} → {sourceLang}
          </p>

          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {(streak?.current_streak ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <Flame className="w-4 h-4 text-orange-500" />
                <span>{t('streak', { count: streak?.current_streak ?? 0 })}</span>
              </div>
            )}
            {wordsCount > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <BookOpen className="w-4 h-4" />
                <span>{t('wordsLearned', { count: wordsCount })}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-6 border-b border-border">
          {badges.map((ub) => (
            <div
              key={ub.badge.slug}
              title={`${ub.badge.name}${ub.badge.description ? ` — ${ub.badge.description}` : ''}`}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg cursor-default"
            >
              {BADGE_EMOJI[ub.badge.slug] ?? '🏅'}
            </div>
          ))}
        </div>
      )}

      {/* Public collections */}
      <div>
        <h2 className="text-lg font-medium mb-4">{t('publicCollections')}</h2>

        {collections.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noCollections')}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((col) => {
              const wordCount = col.collection_words?.[0]?.count ?? 0
              const src = SUPPORTED_LANGUAGES[col.source_lang as keyof typeof SUPPORTED_LANGUAGES] ?? col.source_lang
              const tgt = SUPPORTED_LANGUAGES[col.target_lang as keyof typeof SUPPORTED_LANGUAGES] ?? col.target_lang
              return (
                <Link
                  key={col.id}
                  href={`/${locale}/catalog/${col.id}`}
                  className="block border border-border rounded-lg p-4 hover:border-primary hover:bg-muted/50 transition-colors"
                >
                  <h3 className="font-medium">{col.name}</h3>
                  {col.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {col.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                    <span>{src} → {tgt}</span>
                    <span>·</span>
                    <span>{wordCount} слів</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

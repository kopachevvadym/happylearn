import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { BookOpen, Flame, GraduationCap, Library, Plus, Trophy } from 'lucide-react'
import { ActivityHeatmap } from '@/components/shared/activity-heatmap'

export default async function DashboardPage() {
  const t = await getTranslations('dashboard')
  const tp = await getTranslations('progress')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const startOfYear = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()

  const [profileRes, streakRes, wordsTodayRes, totalLearnedRes, collectionsRes, sessionsRes] =
    await Promise.all([
      supabase.from('users').select('daily_goal, username').eq('id', user.id).single(),
      supabase.from('user_streaks').select('*').eq('user_id', user.id).single(),
      supabase
        .from('word_progress')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('updated_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      supabase
        .from('word_progress')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('is_learned', true),
      supabase
        .from('collections')
        .select(`
          id, name, is_default,
          collection_words(word_id, words(word_progress(is_learned, user_id)))
        `)
        .eq('user_id', user.id)
        .order('is_default', { ascending: false }),
      supabase
        .from('study_sessions')
        .select('started_at, total_words')
        .eq('user_id', user.id)
        .gte('started_at', startOfYear)
        .order('started_at'),
    ])

  const profile = profileRes.data as { daily_goal: number; username: string } | null
  const streak = streakRes.data as { current_streak: number } | null
  const collections = collectionsRes.data as Array<{
    id: string
    name: string
    is_default: boolean
    collection_words: Array<{
      word_id: string
      words: { word_progress: Array<{ is_learned: boolean; user_id: string }> } | null
    }>
  }> | null

  const dailyGoal = profile?.daily_goal ?? 10
  const todayCount = wordsTodayRes.count ?? 0
  const learnedCount = totalLearnedRes.count ?? 0
  const currentStreak = streak?.current_streak ?? 0

  // Build activity data for heatmap — convert UTC timestamps to local date keys
  const activityByDay: Record<string, number> = {}
  sessionsRes.data?.forEach((s) => {
    const d = new Date(s.started_at)
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    activityByDay[day] = (activityByDay[day] ?? 0) + s.total_words
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Flame className="w-5 h-5 text-orange-500" />}
          label={t('streak_current')}
          value={`${currentStreak} дн`}
          bg="bg-orange-50 dark:bg-orange-950/20"
        />
        <StatCard
          icon={<GraduationCap className="w-5 h-5 text-blue-500" />}
          label={t('today_goal')}
          value={`${todayCount} / ${dailyGoal}`}
          bg="bg-blue-50 dark:bg-blue-950/20"
        />
        <StatCard
          icon={<BookOpen className="w-5 h-5 text-green-500" />}
          label={t('words_learned')}
          value={String(learnedCount)}
          bg="bg-green-50 dark:bg-green-950/20"
        />
        <StatCard
          icon={<Library className="w-5 h-5 text-purple-500" />}
          label={t('collections_count')}
          value={String(collections?.length ?? 0)}
          bg="bg-purple-50 dark:bg-purple-950/20"
        />
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link
          href="/study"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <GraduationCap className="w-4 h-4" />
          {t('study_now')}
        </Link>
        <Link
          href="/words?add=1"
          className="flex items-center gap-2 border border-border px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-accent transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('add_word')}
        </Link>
      </div>

      {/* Activity heatmap */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="font-semibold mb-4">{tp('activity_title')}</h2>
        <ActivityHeatmap
          activityByDay={activityByDay}
          weekdays={[
            tp('weekday_sun'),
            tp('weekday_mon'),
            tp('weekday_tue'),
            tp('weekday_wed'),
            tp('weekday_thu'),
            tp('weekday_fri'),
            tp('weekday_sat'),
          ]}
        />
      </div>

      {/* Collections progress */}
      {collections && collections.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold mb-4">{tp('collections_title')}</h2>
          <div className="space-y-3">
            {collections.map((col) => {
              const total = col.collection_words.length
              const learned = col.collection_words.filter((cw) =>
                cw.words?.word_progress?.some(
                  (wp) => wp.user_id === user.id && wp.is_learned
                )
              ).length
              const pct = total > 0 ? Math.round((learned / total) * 100) : 0

              return (
                <div key={col.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{col.name}</span>
                    <span className="text-muted-foreground">{learned}/{total} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Collections */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">{t('your_collections')}</h2>
          <Link href="/collections" className="text-sm text-muted-foreground hover:text-foreground">
            {t('view_all')} →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {collections?.slice(0, 5).map((col) => (
            <Link
              key={col.id}
              href={`/collections/${col.id}`}
              className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-accent transition-colors"
            >
              <Library className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{col.name}</span>
              {col.is_default && (
                <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  За замовчуванням
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode
  label: string
  value: string
  bg: string
}) {
  return (
    <div className={`${bg} rounded-xl p-4 space-y-2`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  )
}

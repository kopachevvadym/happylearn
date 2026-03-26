import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { Flame, Trophy, BookOpen } from 'lucide-react'
import { ActivityHeatmap } from '@/components/shared/activity-heatmap'

export default async function ProgressPage() {
  const t = await getTranslations('progress')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date()
  const startOfToday = new Date(now.setHours(0, 0, 0, 0)).toISOString()
  const startOfWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const startOfYear = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: streak },
    { count: todayCount },
    { count: weekCount },
    { count: totalLearned },
    { data: collections },
    { data: sessions },
  ] = await Promise.all([
    supabase.from('user_streaks').select('*').eq('user_id', user.id).single(),
    supabase
      .from('word_progress')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('updated_at', startOfToday),
    supabase
      .from('word_progress')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('updated_at', startOfWeek),
    supabase
      .from('word_progress')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_learned', true),
    supabase
      .from('collections')
      .select(`
        id, name,
        collection_words(word_id, words(word_progress(is_learned, user_id)))
      `)
      .eq('user_id', user.id),
    supabase
      .from('study_sessions')
      .select('started_at, correct_answers, total_words')
      .eq('user_id', user.id)
      .gte('started_at', startOfYear)
      .order('started_at'),
  ])

  // Build activity data for heatmap
  const activityByDay: Record<string, number> = {}
  sessions?.forEach((s) => {
    const day = s.started_at.slice(0, 10)
    activityByDay[day] = (activityByDay[day] ?? 0) + s.total_words
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {/* Streak & totals */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-orange-50 dark:bg-orange-950/20 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            {t('streak_current')}
          </div>
          <div className="text-2xl font-bold">{streak?.current_streak ?? 0} дн</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Trophy className="w-3.5 h-3.5 text-yellow-500" />
            {t('streak_longest')}
          </div>
          <div className="text-2xl font-bold">{streak?.longest_streak ?? 0} дн</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-4 space-y-1">
          <div className="text-xs text-muted-foreground">{t('words_today')}</div>
          <div className="text-2xl font-bold">{todayCount ?? 0}</div>
        </div>
        <div className="bg-violet-50 dark:bg-violet-950/20 rounded-xl p-4 space-y-1">
          <div className="text-xs text-muted-foreground">{t('words_week')}</div>
          <div className="text-2xl font-bold">{weekCount ?? 0}</div>
        </div>
        <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BookOpen className="w-3.5 h-3.5 text-green-500" />
            {t('words_total')}
          </div>
          <div className="text-2xl font-bold">{totalLearned ?? 0}</div>
        </div>
      </div>

      {/* Activity heatmap */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="font-semibold mb-4">{t('activity_title')}</h2>
        <ActivityHeatmap activityByDay={activityByDay} />
      </div>

      {/* Collections progress */}
      {collections && collections.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold mb-4">{t('collections_title')}</h2>
          <div className="space-y-3">
            {collections.map((col) => {
              const cws = col.collection_words as unknown as Array<{
                word_id: string
                words: { word_progress: Array<{ is_learned: boolean; user_id: string }> } | null
              }>
              const total = cws.length
              const learned = cws.filter((cw) =>
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
    </div>
  )
}

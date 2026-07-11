import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { StudySetup } from '@/components/study/study-setup'
import { getUserTimezone, startOfDayInTz } from '@/lib/utils/timezone'

export default async function StudyPage() {
  const t = await getTranslations('study')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const tz = await getUserTimezone()
  const today = startOfDayInTz(new Date(), tz)

  const [collectionsResult, completedResult] = await Promise.all([
    supabase
      .from('collections')
      .select('id, name, collection_words(count)')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false }),
    supabase
      .from('study_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('finished_at', today.toISOString())
      .not('finished_at', 'is', null),
  ])

  const collections = (collectionsResult.data ?? []) as unknown as {
    id: string
    name: string
    collection_words: { count: number }[]
  }[]
  const completedToday = completedResult.count ?? 0

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <StudySetup collections={collections} completedToday={completedToday} />
    </div>
  )
}

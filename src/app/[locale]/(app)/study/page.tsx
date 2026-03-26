import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { StudySetup } from '@/components/study/study-setup'

export default async function StudyPage() {
  const t = await getTranslations('study')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: collectionsRaw } = await supabase
    .from('collections')
    .select('id, name, collection_words(count)')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
  const collections = (collectionsRaw ?? []) as unknown as { id: string; name: string; collection_words: { count: number }[] }[]

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <StudySetup collections={collections} />
    </div>
  )
}

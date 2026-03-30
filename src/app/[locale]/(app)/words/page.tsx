import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { WordsList } from '@/components/words/words-list'

export default async function WordsPage() {
  const t = await getTranslations('words')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const [{ data: words }, { data: profile }, { data: collections }, { data: progress }] =
    await Promise.all([
      supabase
        .from('words')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('users')
        .select('default_source_lang, default_target_lang')
        .eq('id', user.id)
        .single(),
      supabase
        .from('collections')
        .select('id, name')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false }),
      supabase
        .from('word_progress')
        .select('word_id, is_learned')
        .eq('user_id', user.id),
    ])

  const learnedWordIds = new Set(
    progress?.filter((p) => p.is_learned).map((p) => p.word_id) ?? []
  )

  const duplicatesCount = (() => {
    const groups = new Map<string, number>()
    for (const w of words ?? []) {
      const key = `${w.word.toLowerCase()}__${w.source_lang}__${w.target_lang}`
      groups.set(key, (groups.get(key) ?? 0) + 1)
    }
    return [...groups.values()].filter((c) => c > 1).reduce((sum, c) => sum + c - 1, 0)
  })()

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <WordsList
        words={words ?? []}
        learnedWordIds={learnedWordIds}
        collections={collections ?? []}
        defaultSourceLang={profile?.default_source_lang ?? 'en'}
        defaultTargetLang={profile?.default_target_lang ?? 'uk'}
        duplicatesCount={duplicatesCount}
      />
    </div>
  )
}

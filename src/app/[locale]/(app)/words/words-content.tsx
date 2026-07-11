'use client'

import { useSearchParams } from 'next/navigation'
import { useWords, useWordProgress, useOwnCollectionsSimple, useProfileLangs } from '@/lib/queries'
import { WordsList } from '@/components/words/words-list'

interface WordsContentProps {
  userId: string
  title: string
}

export function WordsContent({ userId, title }: WordsContentProps) {
  // Dashboard's "Add word" quick action links to /words?add=1
  const searchParams = useSearchParams()
  const openAddForm = searchParams.get('add') === '1'
  const { data: words = [] } = useWords(userId)
  const { data: progress = [] } = useWordProgress(userId)
  const { data: collections = [] } = useOwnCollectionsSimple(userId)
  const { data: profile } = useProfileLangs(userId)

  const learnedWordIds = new Set(
    progress.filter((p) => p.is_learned).map((p) => p.word_id)
  )

  const duplicatesCount = (() => {
    const groups = new Map<string, number>()
    for (const w of words) {
      const key = `${w.word.toLowerCase()}__${w.source_lang}__${w.target_lang}`
      groups.set(key, (groups.get(key) ?? 0) + 1)
    }
    return [...groups.values()].filter((c) => c > 1).reduce((sum, c) => sum + c - 1, 0)
  })()

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <WordsList
        words={words}
        learnedWordIds={learnedWordIds}
        collections={collections}
        defaultSourceLang={profile?.default_source_lang ?? 'en'}
        defaultTargetLang={profile?.default_target_lang ?? 'uk'}
        duplicatesCount={duplicatesCount}
        initialShowAddForm={openAddForm}
      />
    </div>
  )
}

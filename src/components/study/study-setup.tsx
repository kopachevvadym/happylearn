'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { GraduationCap } from 'lucide-react'
import { getStudyCards, createStudySession } from '@/app/actions/study'
import type { StudyCard } from '@/types'
import { StudySession } from './study-session'

interface StudySetupProps {
  collections: {
    id: string
    name: string
    collection_words: { count: number }[]
  }[]
}

export function StudySetup({ collections }: StudySetupProps) {
  const t = useTranslations('study')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [cards, setCards] = useState<StudyCard[] | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleStart = () => {
    if (!selected.size) return
    const ids = Array.from(selected)
    startTransition(async () => {
      const [sessionResult, studyCards] = await Promise.all([
        createStudySession(ids),
        getStudyCards(ids),
      ])
      if (sessionResult?.data) {
        setSessionId(sessionResult.data.id)
        setCards(studyCards)
      }
    })
  }

  if (cards !== null && sessionId) {
    if (cards.length === 0) {
      return (
        <div className="text-center py-16 space-y-3">
          <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">{t('session_empty')}</p>
          <button
            onClick={() => setCards(null)}
            className="text-sm text-primary hover:underline"
          >
            ← Назад
          </button>
        </div>
      )
    }
    return (
      <StudySession
        cards={cards}
        sessionId={sessionId}
        onFinish={() => setCards(null)}
      />
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">{t('select_collections')}</p>
      <p className="text-xs text-muted-foreground">{t('words_limit')}</p>

      <div className="space-y-2">
        {collections.map((col) => {
          const wordCount = col.collection_words?.[0]?.count ?? 0
          return (
            <label
              key={col.id}
              className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                selected.has(col.id)
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(col.id)}
                onChange={() => toggle(col.id)}
                className="w-4 h-4 rounded"
              />
              <span className="font-medium">{col.name}</span>
              <span className="ml-auto text-sm text-muted-foreground">{wordCount} слів</span>
            </label>
          )
        })}
      </div>

      <button
        onClick={handleStart}
        disabled={isPending || !selected.size}
        className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
      >
        {isPending ? '...' : t('start_session')}
      </button>
    </div>
  )
}

'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { GraduationCap, ChevronLeft } from 'lucide-react'
import { getStudyCards, createStudySession, getScheduledCount } from '@/app/actions/study'
import type { StudyCard } from '@/types'
import { StudySession } from './study-session'

const STORAGE_KEY = 'study_selected_collections'
const DEBUG_KEY = 'study_debug_mode'

interface StudySetupProps {
  collections: {
    id: string
    name: string
    collection_words: { count: number }[]
  }[]
  completedToday: number
}

export function StudySetup({ collections, completedToday }: StudySetupProps) {
  const t = useTranslations('study')
  const tCommon = useTranslations('common')

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [scheduledCount, setScheduledCount] = useState(0)
  const [cards, setCards] = useState<StudyCard[] | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [activeCollectionIds, setActiveCollectionIds] = useState<string[]>([])
  const [debugMode, setDebugMode] = useState(false)

  const [isPending, startTransition] = useTransition()
  const [isCountPending, startCountTransition] = useTransition()

  // Load saved selection and debug mode from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const ids: string[] = JSON.parse(saved)
        const valid = ids.filter((id) => collections.some((c) => c.id === id))
        if (valid.length) setSelected(new Set(valid))
      }
    } catch {
      // ignore
    }
    try {
      setDebugMode(localStorage.getItem(DEBUG_KEY) === 'true')
    } catch {
      // ignore
    }
  }, [collections])

  const fetchScheduledCount = useCallback((ids: string[]) => {
    if (!ids.length) {
      setScheduledCount(0)
      return
    }
    startCountTransition(async () => {
      const count = await getScheduledCount(ids)
      setScheduledCount(count)
    })
  }, [])

  // Fetch scheduled count when selection changes
  useEffect(() => {
    const ids = Array.from(selected)
    fetchScheduledCount(ids)
  }, [selected, fetchScheduledCount])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)))
      } catch {
        // ignore
      }
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
        setActiveCollectionIds(ids)
        setCards(studyCards)
      }
    })
  }

  if (cards !== null && sessionId) {
    if (cards.length === 0) {
      return (
        <div className="text-center py-16 space-y-3">
          <GraduationCap aria-hidden="true" className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">{t('session_empty')}</p>
          <button
            type="button"
            onClick={() => setCards(null)}
            className="text-sm text-primary hover:underline flex items-center gap-1 mx-auto"
          >
            <ChevronLeft aria-hidden="true" className="w-4 h-4" />
            {tCommon('back')}
          </button>
        </div>
      )
    }
    return (
      <StudySession
        cards={cards}
        sessionId={sessionId}
        collectionIds={activeCollectionIds}
        scheduledCount={scheduledCount}
        debugMode={debugMode}
        onFinish={() => setCards(null)}
      />
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">{t('select_collections')}</p>

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
              <span className="ml-auto text-sm text-muted-foreground">
                {wordCount} {tCommon('words')}
              </span>
            </label>
          )
        })}
      </div>

      {/* Counters */}
      {selected.size > 0 && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>
            {isCountPending
              ? '…'
              : t('scheduled_today', { count: scheduledCount })}
          </span>
          <span>{t('completed_today', { count: completedToday })}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleStart}
        disabled={isPending || !selected.size}
        aria-busy={isPending}
        className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
      >
        {isPending ? tCommon('loading') : t('start_session')}
      </button>
    </div>
  )
}

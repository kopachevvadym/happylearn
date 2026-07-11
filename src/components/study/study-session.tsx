'use client'

import { useState, useTransition, useCallback, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Volume2, X } from 'lucide-react'
import {
  submitStudyAnswer,
  finishStudySession,
  getStudyCards,
  getAdditionalCards,
  createStudySession,
  getDistractorTranslations,
} from '@/app/actions/study'
import type { StudyCard } from '@/types'
import { FlipCard } from './flip-card'
import { QuizCard } from './quiz-card'
import { WriteCard } from './write-card'
import { SessionResults } from './session-results'
import { ScheduleComplete } from './schedule-complete'
import { DebugCardPanel } from './debug-card-panel'

type Phase = 'studying' | 'batch_results' | 'schedule_complete'

interface StudySessionProps {
  cards: StudyCard[]
  sessionId: string
  collectionIds: string[]
  scheduledCount: number
  debugMode?: boolean
  onFinish: () => void
}

export function StudySession({
  cards: initialCards,
  sessionId: initialSessionId,
  collectionIds,
  scheduledCount,
  debugMode = false,
  onFinish,
}: StudySessionProps) {
  const t = useTranslations('study')
  const queryClient = useQueryClient()

  const [cards, setCards] = useState(initialCards)
  const [sessionId, setSessionId] = useState(initialSessionId)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [batchCorrect, setBatchCorrect] = useState(0)
  const [batchNewLearned, setBatchNewLearned] = useState(0)
  const [totalDone, setTotalDone] = useState(0)
  const [phase, setPhase] = useState<Phase>('studying')
  const [nextBatch, setNextBatch] = useState<StudyCard[] | null>(null)
  const [isAdditional, setIsAdditional] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Grades are written fire-and-forget so the next card shows instantly;
  // flushed before the session is finalized.
  const pendingSubmits = useRef<Promise<unknown>[]>([])
  // Guards against double-grading one card (double-click, Enter+click).
  const answeredIndex = useRef(-1)

  const currentCard = cards[currentIndex]

  // Small batches can't provide enough quiz distractors — fetch extras
  // from the rest of the selected collections once per session.
  const [extraDistractors, setExtraDistractors] = useState<string[]>([])
  useEffect(() => {
    if (initialCards.length >= 4) return
    let cancelled = false
    getDistractorTranslations(collectionIds).then((pool) => {
      if (!cancelled) setExtraDistractors(pool)
    })
    return () => {
      cancelled = true
    }
  }, [initialCards.length, collectionIds])

  const speakWord = (word: string, lang: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = lang
    window.speechSynthesis.speak(utterance)
  }

  const handleAnswer = useCallback(
    (quality: number) => {
      if (answeredIndex.current === currentIndex) return
      answeredIndex.current = currentIndex

      const card = cards[currentIndex]
      const isNew = !card.progress || card.progress.repetitions === 0
      // Mirrors the server's grading rule (quality >= 3) so the UI can
      // advance without waiting for the round-trip.
      const isCorrect = quality >= 3
      const newBatchCorrect = batchCorrect + (isCorrect ? 1 : 0)
      const newBatchNewLearned = batchNewLearned + (isNew && isCorrect ? 1 : 0)

      pendingSubmits.current.push(
        submitStudyAnswer(sessionId, card.word.id, card.format, quality, isAdditional).catch(
          (err) => {
            console.error('Failed to save answer', err)
          }
        )
      )

      setBatchCorrect(newBatchCorrect)
      setBatchNewLearned(newBatchNewLearned)

      const isLastCard = currentIndex + 1 >= cards.length
      if (!isLastCard) {
        setCurrentIndex((i) => i + 1)
        return
      }

      // Last card — flush pending grades, finish the session, pick next screen
      startTransition(async () => {
        await Promise.allSettled(pendingSubmits.current)
        pendingSubmits.current = []

        const newTotalDone = totalDone + cards.length
        await finishStudySession(sessionId, cards.length, newBatchCorrect)
        setTotalDone(newTotalDone)
        // Word progress changed server-side — drop the client caches so the
        // words list / timeline / learned badges reflect the new state.
        queryClient.invalidateQueries({ queryKey: ['words'] })

        if (isAdditional) {
          // Additional training complete — just show results with no Continue
          setNextBatch(null)
          setPhase('batch_results')
          return
        }

        // Check for more scheduled words
        const next = await getStudyCards(collectionIds)
        if (next.length > 0) {
          setNextBatch(next)
          setPhase('batch_results')
        } else {
          setPhase('schedule_complete')
        }
      })
    },
    [cards, currentIndex, sessionId, batchCorrect, batchNewLearned, totalDone, collectionIds, isAdditional, queryClient]
  )

  const handleContinue = useCallback(() => {
    if (!nextBatch) return
    startTransition(async () => {
      const sessionResult = await createStudySession(collectionIds)
      if (!sessionResult?.data) return
      answeredIndex.current = -1
      setSessionId(sessionResult.data.id)
      setCards(nextBatch)
      setNextBatch(null)
      setCurrentIndex(0)
      setBatchCorrect(0)
      setBatchNewLearned(0)
      setPhase('studying')
    })
  }, [nextBatch, collectionIds])

  const handleContinueTraining = useCallback(() => {
    startTransition(async () => {
      const [sessionResult, additionalCards] = await Promise.all([
        createStudySession(collectionIds),
        getAdditionalCards(collectionIds),
      ])
      if (!sessionResult?.data || !additionalCards.length) {
        onFinish()
        return
      }
      answeredIndex.current = -1
      setSessionId(sessionResult.data.id)
      setCards(additionalCards)
      setNextBatch(null)
      setCurrentIndex(0)
      setBatchCorrect(0)
      setBatchNewLearned(0)
      setIsAdditional(true)
      setPhase('studying')
    })
  }, [collectionIds, onFinish])

  const handleQuit = () => {
    if (window.confirm(t('quit_confirm'))) onFinish()
  }

  if (phase === 'batch_results') {
    return (
      <SessionResults
        batchCorrect={batchCorrect}
        batchTotal={cards.length}
        newLearned={batchNewLearned}
        isAdditional={isAdditional}
        hasMore={nextBatch !== null}
        isPending={isPending}
        onContinue={handleContinue}
        onFinish={onFinish}
      />
    )
  }

  if (phase === 'schedule_complete') {
    return (
      <ScheduleComplete
        scheduledTotal={scheduledCount}
        doneSoFar={totalDone}
        isPending={isPending}
        onContinueTraining={handleContinueTraining}
        onFinish={onFinish}
      />
    )
  }

  const progress = Math.round(((currentIndex + 1) / cards.length) * 100)

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleQuit}
          aria-label={t('quit_session')}
          className="p-1 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
        >
          <X aria-hidden="true" className="w-4 h-4" />
        </button>
        <div
          role="progressbar"
          aria-valuenow={currentIndex + 1}
          aria-valuemin={1}
          aria-valuemax={cards.length}
          aria-label={`${currentIndex + 1} / ${cards.length}`}
          className="flex-1 h-2 bg-muted rounded-full overflow-hidden"
        >
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm text-muted-foreground flex-shrink-0">
          {currentIndex + 1} / {cards.length}
        </span>
      </div>

      {isAdditional && (
        <p className="text-xs text-center text-muted-foreground">{t('additional_training')}</p>
      )}

      {/* Word header — shown for quiz/write */}
      {currentCard.format !== 'flip' && (
        <div className="flex items-center gap-2 justify-center">
          <h2 className="text-3xl font-bold">{currentCard.word.word}</h2>
          <button
            type="button"
            onClick={() => speakWord(currentCard.word.word, currentCard.word.source_lang)}
            aria-label={t('speak_word')}
            className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
          >
            <Volume2 aria-hidden="true" className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* key remounts the card per word: state (flip/selection/input) never
          bleeds between cards and autofocus fires for each new card */}
      {currentCard.format === 'flip' && (
        <FlipCard key={currentCard.word.id} word={currentCard.word} onAnswer={handleAnswer} disabled={isPending} />
      )}
      {currentCard.format === 'quiz' && (
        <QuizCard
          key={currentCard.word.id}
          word={currentCard.word}
          allCards={cards}
          extraDistractors={extraDistractors}
          onAnswer={handleAnswer}
          disabled={isPending}
        />
      )}
      {currentCard.format === 'write' && (
        <WriteCard key={currentCard.word.id} word={currentCard.word} onAnswer={handleAnswer} disabled={isPending} />
      )}

      {debugMode && <DebugCardPanel card={currentCard} />}
    </div>
  )
}

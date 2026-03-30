'use client'

import { useState, useTransition, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Volume2, X } from 'lucide-react'
import {
  submitStudyAnswer,
  finishStudySession,
  getStudyCards,
  getAdditionalCards,
  createStudySession,
} from '@/app/actions/study'
import type { StudyCard } from '@/types'
import { FlipCard } from './flip-card'
import { QuizCard } from './quiz-card'
import { WriteCard } from './write-card'
import { SessionResults } from './session-results'
import { ScheduleComplete } from './schedule-complete'

type Phase = 'studying' | 'batch_results' | 'schedule_complete'

interface StudySessionProps {
  cards: StudyCard[]
  sessionId: string
  collectionIds: string[]
  scheduledCount: number
  onFinish: () => void
}

export function StudySession({
  cards: initialCards,
  sessionId: initialSessionId,
  collectionIds,
  scheduledCount,
  onFinish,
}: StudySessionProps) {
  const t = useTranslations('study')

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

  const currentCard = cards[currentIndex]

  const speakWord = (word: string, lang: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = lang
    window.speechSynthesis.speak(utterance)
  }

  const handleAnswer = useCallback(
    (quality: number) => {
      const card = cards[currentIndex]
      const isNew = !card.progress || card.progress.repetitions === 0
      startTransition(async () => {
        const result = await submitStudyAnswer(
          sessionId,
          card.word.id,
          card.format,
          quality,
          card.progress
            ? {
                ease_factor: card.progress.ease_factor,
                interval: card.progress.interval,
                repetitions: card.progress.repetitions,
              }
            : null,
          isAdditional
        )

        const isCorrect = result?.isCorrect ?? false
        const newBatchCorrect = batchCorrect + (isCorrect ? 1 : 0)
        const newBatchNewLearned = batchNewLearned + (isNew && isCorrect ? 1 : 0)

        const isLastCard = currentIndex + 1 >= cards.length

        if (!isLastCard) {
          setBatchCorrect(newBatchCorrect)
          setBatchNewLearned(newBatchNewLearned)
          setCurrentIndex((i) => i + 1)
          return
        }

        // Last card — finish this session
        const newTotalDone = totalDone + cards.length
        await finishStudySession(sessionId, cards.length, newBatchCorrect)

        setBatchCorrect(newBatchCorrect)
        setBatchNewLearned(newBatchNewLearned)
        setTotalDone(newTotalDone)

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
    [cards, currentIndex, sessionId, batchCorrect, batchNewLearned, totalDone, collectionIds, isAdditional]
  )

  const handleContinue = useCallback(() => {
    if (!nextBatch) return
    startTransition(async () => {
      const sessionResult = await createStudySession(collectionIds)
      if (!sessionResult?.data) return
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

      {currentCard.format === 'flip' && (
        <FlipCard word={currentCard.word} onAnswer={handleAnswer} disabled={isPending} />
      )}
      {currentCard.format === 'quiz' && (
        <QuizCard word={currentCard.word} allCards={cards} onAnswer={handleAnswer} disabled={isPending} />
      )}
      {currentCard.format === 'write' && (
        <WriteCard word={currentCard.word} onAnswer={handleAnswer} disabled={isPending} />
      )}
    </div>
  )
}

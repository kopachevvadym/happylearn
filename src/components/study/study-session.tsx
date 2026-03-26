'use client'

import { useState, useTransition, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Volume2 } from 'lucide-react'
import { submitStudyAnswer, finishStudySession } from '@/app/actions/study'
import type { StudyCard } from '@/types'
import { FlipCard } from './flip-card'
import { QuizCard } from './quiz-card'
import { WriteCard } from './write-card'

interface StudySessionProps {
  cards: StudyCard[]
  sessionId: string
  onFinish: () => void
}

export function StudySession({ cards, sessionId, onFinish }: StudySessionProps) {
  const t = useTranslations('study')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [finished, setFinished] = useState(false)
  const [isPending, startTransition] = useTransition()

  const currentCard = cards[currentIndex]

  const handleAnswer = useCallback(
    (quality: number) => {
      const card = cards[currentIndex]
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
            : null
        )

        if (result?.isCorrect) setCorrectCount((c) => c + 1)

        if (currentIndex + 1 >= cards.length) {
          await finishStudySession(sessionId, cards.length, correctCount + (result?.isCorrect ? 1 : 0))
          setFinished(true)
        } else {
          setCurrentIndex((i) => i + 1)
        }
      })
    },
    [currentIndex, cards, sessionId, correctCount]
  )

  const speakWord = (word: string, lang: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = lang
    window.speechSynthesis.speak(utterance)
  }

  if (finished) {
    const percent = Math.round((correctCount / cards.length) * 100)
    return (
      <div className="text-center py-12 space-y-6">
        <div className="text-6xl">{percent >= 70 ? '🎉' : '📚'}</div>
        <h2 className="text-2xl font-bold">{t('results_title')}</h2>
        <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-2xl font-bold">{cards.length}</div>
            <div className="text-sm text-muted-foreground">{t('results_words')}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-2xl font-bold">{percent}%</div>
            <div className="text-sm text-muted-foreground">{t('results_correct')}</div>
          </div>
        </div>
        <button
          onClick={onFinish}
          className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          {t('results_finish')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${(currentIndex / cards.length) * 100}%` }}
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {cards.length}
        </span>
      </div>

      {/* Word header — shown for quiz/write; flip card shows the word itself */}
      {currentCard.format !== 'flip' && (
        <div className="flex items-center gap-2 justify-center">
          <h2 className="text-3xl font-bold">{currentCard.word.word}</h2>
          <button
            onClick={() => speakWord(currentCard.word.word, currentCard.word.source_lang)}
            className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
            title={t('speak_word')}
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Card by format */}
      {currentCard.format === 'flip' && (
        <FlipCard
          word={currentCard.word}
          onAnswer={handleAnswer}
          disabled={isPending}
        />
      )}
      {currentCard.format === 'quiz' && (
        <QuizCard
          word={currentCard.word}
          allCards={cards}
          onAnswer={handleAnswer}
          disabled={isPending}
        />
      )}
      {currentCard.format === 'write' && (
        <WriteCard
          word={currentCard.word}
          onAnswer={handleAnswer}
          disabled={isPending}
        />
      )}
    </div>
  )
}

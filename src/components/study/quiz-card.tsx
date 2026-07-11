'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import type { StudyCard } from '@/types'

interface QuizCardProps {
  word: StudyCard['word']
  allCards: StudyCard[]
  /** Fallback pool for batches with fewer than 4 cards */
  extraDistractors?: string[]
  onAnswer: (quality: number) => void
  disabled: boolean
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function QuizCard({ word, allCards, extraDistractors = [], onAnswer, disabled }: QuizCardProps) {
  const t = useTranslations('study')
  const [selected, setSelected] = useState<string | null>(null)

  const correctAnswer = (word.translations as string[])[0]

  const options = useMemo(() => {
    // Dedupe distractors against each other and the correct answer, so the
    // correct translation never appears twice among the options. The extra
    // pool tops up batches that are too small to provide 3 distractors.
    const distractors = [
      ...new Set(
        [
          ...allCards
            .filter((c) => c.word.id !== word.id)
            .map((c) => (c.word.translations as string[])[0]),
          ...extraDistractors,
        ].filter((tr): tr is string => Boolean(tr) && tr !== correctAnswer)
      ),
    ]
    return shuffle([...shuffle(distractors).slice(0, 3), correctAnswer])
  }, [word.id, allCards, extraDistractors, correctAnswer])

  const handleSelect = (option: string) => {
    if (selected || disabled) return
    setSelected(option)
    const isCorrect = option === correctAnswer
    // Short pause on success; longer on a miss so the correct option registers.
    setTimeout(() => onAnswer(isCorrect ? 4 : 1), isCorrect ? 500 : 1200)
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-muted-foreground">{t('quiz_title')}</p>
      <div className="grid grid-cols-1 gap-3">
        {options.map((option) => {
          const isSelected = selected === option
          const isCorrect = option === correctAnswer
          let style = 'border-border hover:border-primary/50 hover:bg-accent'
          if (isSelected && isCorrect) style = 'border-green-500 bg-green-50 dark:bg-green-950/20'
          if (isSelected && !isCorrect) style = 'border-destructive bg-destructive/10'
          if (selected && !isSelected && isCorrect) style = 'border-green-500 bg-green-50 dark:bg-green-950/20'

          return (
            <button
              key={option}
              type="button"
              onClick={() => handleSelect(option)}
              disabled={!!selected || disabled}
              className={`p-4 border-2 rounded-xl text-left font-medium transition-colors flex items-center justify-between ${style}`}
            >
              <span>{option}</span>
              {selected && isCorrect && <span aria-hidden="true" className="ml-2 text-green-600 dark:text-green-400">✓</span>}
              {isSelected && !isCorrect && <span aria-hidden="true" className="ml-2 text-destructive">✗</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

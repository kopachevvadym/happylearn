'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import type { StudyCard } from '@/types'

interface QuizCardProps {
  word: StudyCard['word']
  allCards: StudyCard[]
  onAnswer: (quality: number) => void
  disabled: boolean
}

export function QuizCard({ word, allCards, onAnswer, disabled }: QuizCardProps) {
  const t = useTranslations('study')
  const [selected, setSelected] = useState<string | null>(null)

  const correctAnswer = (word.translations as string[])[0]

  const options = useMemo(() => {
    const distractors = allCards
      .filter((c) => c.word.id !== word.id)
      .map((c) => (c.word.translations as string[])[0])
      .filter(Boolean)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)

    return [...distractors, correctAnswer].sort(() => Math.random() - 0.5)
  }, [word.id, allCards, correctAnswer])

  const handleSelect = (option: string) => {
    if (selected || disabled) return
    setSelected(option)
    setTimeout(() => {
      onAnswer(option === correctAnswer ? 4 : 1)
      setSelected(null)
    }, 600)
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-muted-foreground">{t('quiz_title')}</p>
      <div className="grid grid-cols-1 gap-3">
        {options.map((option, i) => {
          const isSelected = selected === option
          const isCorrect = option === correctAnswer
          let style = 'border-border hover:border-primary/50 hover:bg-accent'
          if (isSelected && isCorrect) style = 'border-green-500 bg-green-50 dark:bg-green-950/20'
          if (isSelected && !isCorrect) style = 'border-destructive bg-destructive/10'
          if (selected && !isSelected && isCorrect) style = 'border-green-500 bg-green-50 dark:bg-green-950/20'

          return (
            <button
              key={i}
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

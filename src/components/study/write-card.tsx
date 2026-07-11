'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import type { StudyCard } from '@/types'
import { levenshteinDistance } from '@/lib/utils/levenshtein'
import { normalizeAnswer } from '@/lib/utils/normalize'

interface WriteCardProps {
  word: StudyCard['word']
  onAnswer: (quality: number) => void
  disabled: boolean
}

export function WriteCard({ word, onAnswer, disabled }: WriteCardProps) {
  const t = useTranslations('study')
  const [input, setInput] = useState('')
  const [checked, setChecked] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const autoSubmitted = useRef(false)

  const translations = (word.translations as string[]).map(normalizeAnswer)

  const userAnswer = normalizeAnswer(input)
  const isExact = input.trim() !== '' && translations.some((t) => t === userAnswer)
  const isClose = !isExact && translations.some((t) => levenshteinDistance(userAnswer, t) <= 2)

  const submit = (quality: number) => {
    setInput('')
    setChecked(false)
    onAnswer(quality)
  }

  const check = () => {
    if (!input.trim() || checked) return
    setChecked(true)
    // Exact matches need no self-grading — show the green feedback briefly,
    // then advance automatically.
    if (isExact && !autoSubmitted.current) {
      autoSubmitted.current = true
      setTimeout(() => submit(5), 700)
    }
  }

  // "Don't know" — reveal the correct answer first; the learner grades
  // themselves afterwards instead of being silently failed.
  const giveUp = () => {
    if (checked) return
    setChecked(true)
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-muted-foreground">{t('write_title')}</p>

      {!checked ? (
        <div className="space-y-3">
          <label htmlFor="write-input" className="sr-only">{t('write_input_label')}</label>
          <input
            id="write-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && check()}
            placeholder={t('write_placeholder')}
            disabled={disabled}
            autoFocus
            className="w-full h-12 px-4 text-center rounded-xl border-2 border-input bg-background text-lg focus:outline-none focus:border-primary"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={giveUp}
              disabled={disabled}
              className="flex-1 h-11 border-2 border-border rounded-xl text-sm hover:bg-accent transition-colors"
            >
              {t('flip_dont_know')}
            </button>
            <button
              type="button"
              onClick={check}
              disabled={!input.trim() || disabled}
              className="flex-1 h-11 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {t('write_check')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div role="status" className={`p-4 rounded-xl border-2 text-center space-y-1 ${
            isExact
              ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
              : isClose
              ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
              : 'border-destructive bg-destructive/10'
          }`}>
            <p className="font-medium">{input.trim() || '—'}</p>
            {!isExact && (
              <p className="text-sm text-muted-foreground">
                {t('write_correct_label')} <span className="font-semibold">{(word.translations as string[])[0]}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {isExact ? (
              <div
                aria-hidden="true"
                className="col-span-2 h-11 flex items-center justify-center bg-green-500 text-white rounded-xl font-medium"
              >
                {t('flip_know')} ✓
              </div>
            ) : (
              // Non-exact: let the learner self-grade. The Levenshtein check
              // only tints the answer box (yellow when close); the "Almost"
              // option is always offered because a valid synonym or shorter
              // form can be far in edit-distance yet essentially correct.
              <>
                <button
                  type="button"
                  onClick={() => submit(1)}
                  className="h-11 border-2 border-destructive/30 text-destructive rounded-xl text-sm hover:bg-destructive/10 transition-colors"
                >
                  {t('write_incorrect')}
                </button>
                <button
                  type="button"
                  onClick={() => submit(3)}
                  className="h-11 bg-yellow-500 text-white rounded-xl text-sm font-medium hover:bg-yellow-600 transition-colors"
                >
                  {t('write_almost')} ✓
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

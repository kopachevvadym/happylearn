'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import type { StudyCard } from '@/types'

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

  const correct = (word.translations as string[])[0]

  const normalize = (s: string) => s.trim().toLowerCase()

  const check = () => {
    if (!input.trim()) return
    setChecked(true)
  }

  const submit = (quality: number) => {
    setInput('')
    setChecked(false)
    onAnswer(quality)
  }

  const inputNorm = normalize(input)
  const correctNorm = normalize(correct)
  const isExact = inputNorm === correctNorm
  const isClose = !isExact && correctNorm.startsWith(inputNorm.slice(0, Math.max(3, Math.floor(correctNorm.length * 0.7))))

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-muted-foreground">{t('write_title')}</p>

      {!checked ? (
        <div className="space-y-3">
          <input
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
              onClick={() => submit(1)}
              disabled={disabled}
              className="flex-1 h-11 border-2 border-border rounded-xl text-sm hover:bg-accent transition-colors"
            >
              {t('write_skip')}
            </button>
            <button
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
          <div className={`p-4 rounded-xl border-2 text-center space-y-1 ${
            isExact
              ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
              : isClose
              ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
              : 'border-destructive bg-destructive/10'
          }`}>
            <p className="font-medium">{input}</p>
            {!isExact && (
              <p className="text-sm text-muted-foreground">
                Правильно: <span className="font-semibold">{correct}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {isExact ? (
              <button
                onClick={() => submit(5)}
                className="col-span-2 h-11 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
              >
                {t('flip_know')} ✓
              </button>
            ) : isClose ? (
              <>
                <button
                  onClick={() => submit(1)}
                  className="h-11 border-2 border-destructive/30 text-destructive rounded-xl text-sm hover:bg-destructive/10 transition-colors"
                >
                  Неправильно
                </button>
                <button
                  onClick={() => submit(3)}
                  className="h-11 bg-yellow-500 text-white rounded-xl text-sm font-medium hover:bg-yellow-600 transition-colors"
                >
                  Майже ✓
                </button>
              </>
            ) : (
              <button
                onClick={() => submit(1)}
                className="col-span-2 h-11 border-2 border-destructive/30 text-destructive rounded-xl font-medium hover:bg-destructive/10 transition-colors"
              >
                {t('flip_dont_know')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

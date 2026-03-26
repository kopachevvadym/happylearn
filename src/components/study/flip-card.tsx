'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Volume2 } from 'lucide-react'
import type { Word } from '@/types'

interface FlipCardProps {
  word: Word
  onAnswer: (quality: number) => void
  disabled: boolean
}

export function FlipCard({ word, onAnswer, disabled }: FlipCardProps) {
  const t = useTranslations('study')
  const [revealed, setRevealed] = useState(false)

  const speakWord = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const utterance = new SpeechSynthesisUtterance(word.word)
    utterance.lang = word.source_lang
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div className="space-y-3">
      {/* Card */}
      <button
        type="button"
        onClick={() => !revealed && setRevealed(true)}
        tabIndex={revealed ? -1 : 0}
        aria-label={!revealed ? t('flip_show') : undefined}
        className={`w-full min-h-56 flex flex-col items-center justify-center p-8 border-2 rounded-2xl transition-colors bg-card text-left ${
          revealed
            ? 'border-primary/40 cursor-default'
            : 'border-border hover:border-primary/50'
        }`}
      >
        {revealed ? (
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">{word.word}</p>
            <p className="text-3xl font-semibold">
              {(word.translations as string[]).join(', ')}
            </p>
            {(word.examples as string[]).length > 0 && (
              <p className="text-sm text-muted-foreground italic mt-2">
                {(word.examples as string[])[0]}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center space-y-3">
            <p className="text-4xl font-bold">{word.word}</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); speakWord() }}
              className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground mx-auto block"
              aria-label={t('speak_word')}
            >
              <Volume2 aria-hidden="true" className="w-5 h-5" />
            </button>
            <p className="text-sm text-muted-foreground">{t('flip_show')}</p>
          </div>
        )}
      </button>

      {/* Action buttons */}
      {revealed ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => { setRevealed(false); onAnswer(1) }}
            disabled={disabled}
            className="h-12 border-2 border-destructive/30 text-destructive rounded-xl font-medium hover:bg-destructive/10 transition-colors disabled:opacity-60"
          >
            {t('flip_dont_know')}
          </button>
          <button
            type="button"
            onClick={() => { setRevealed(false); onAnswer(5) }}
            disabled={disabled}
            className="h-12 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors disabled:opacity-60"
          >
            {t('flip_know')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="w-full h-12 border-2 border-border rounded-xl font-medium hover:bg-accent transition-colors"
        >
          {t('flip_show')}
        </button>
      )}
    </div>
  )
}

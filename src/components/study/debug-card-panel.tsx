'use client'

import { useState } from 'react'
import { useTranslations, useFormatter } from 'next-intl'
import { Bug, ChevronDown, ChevronUp } from 'lucide-react'
import type { StudyCard } from '@/types'
import { getFormatProgress, previewSm2Result } from '@/lib/sm2/preview'

interface DebugCardPanelProps {
  card: StudyCard
}

export function DebugCardPanel({ card }: DebugCardPanelProps) {
  const [open, setOpen] = useState(true)
  const t = useTranslations('study')
  const fmt = useFormatter()

  const reps = card.progress?.repetitions ?? 0
  const fp = getFormatProgress(reps)

  const easeFactor = card.progress?.ease_factor ?? 2.5
  const interval = card.progress?.interval ?? 0
  const nextReviewAt = card.progress?.next_review_at ? new Date(card.progress.next_review_at) : null

  const correctQuality = card.format === 'quiz' ? 4 : 5
  const progressForSm2 = card.progress
    ? {
        ease_factor: card.progress.ease_factor ?? 2.5,
        interval: card.progress.interval ?? 0,
        repetitions: card.progress.repetitions ?? 0,
      }
    : null

  const afterCorrect = previewSm2Result(progressForSm2, correctQuality)
  const afterIncorrect = previewSm2Result(progressForSm2, 1)

  const fmtDate = (d: Date) => fmt.dateTime(d, { month: 'short', day: 'numeric' })

  return (
    <div className="mt-3 border border-dashed border-amber-400/50 rounded-xl bg-amber-50/40 dark:bg-amber-950/10 text-xs font-mono">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-amber-700 dark:text-amber-400"
      >
        <Bug className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
        <span className="font-semibold">Debug</span>
        <span className="ml-auto">
          {open
            ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
            : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
          }
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2 text-amber-900 dark:text-amber-200">

          {/* Format + progress to next level */}
          <div className="space-y-0.5">
            <div>
              <span className="text-amber-600 dark:text-amber-500">{t('debug_format')}: </span>
              <span className="font-bold">{card.format}</span>
              <span className="text-amber-600 dark:text-amber-500"> ({t('debug_repetitions')}: {reps})</span>
            </div>

            {fp.next !== null && fp.stepsToNext !== null && (
              <div>
                <span className="text-amber-600 dark:text-amber-500">{t('debug_to_next', { next: fp.next })}: </span>
                <span className="text-green-700 dark:text-green-400 font-semibold">
                  {t('debug_steps_remaining', { count: fp.stepsToNext })}
                </span>
              </div>
            )}

            {fp.current === 'write' && !fp.isLearned && fp.stepsToLearned !== null && (
              <div>
                <span className="text-amber-600 dark:text-amber-500">{t('debug_to_learned')}: </span>
                <span className="text-blue-700 dark:text-blue-400 font-semibold">
                  {t('debug_steps_remaining', { count: fp.stepsToLearned })}
                </span>
              </div>
            )}

            {fp.isLearned && (
              <div className="text-green-700 dark:text-green-400 font-semibold">
                {t('debug_already_learned')}
              </div>
            )}
          </div>

          <div className="border-t border-amber-300/30" />

          {/* SM-2 current state */}
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-500">
              {t('debug_sm2_now')}
            </div>
            <div>ease: {easeFactor.toFixed(2)} · interval: {interval}d · rep: {reps}</div>
            {nextReviewAt && (
              <div>
                <span className="text-amber-600 dark:text-amber-500">{t('debug_next_review')}: </span>
                {fmtDate(nextReviewAt)}
              </div>
            )}
          </div>

          <div className="border-t border-amber-300/30" />

          {/* Previews after answering */}
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-500">
              {t('debug_preview')}
            </div>
            <div>
              <span className="text-green-700 dark:text-green-400">✓</span>
              {' '}{t('debug_correct')} → interval: {afterCorrect.interval}d · rep: {afterCorrect.repetitions} · {fmtDate(afterCorrect.next_review_at)}
            </div>
            <div>
              <span className="text-red-600 dark:text-red-400">✗</span>
              {' '}{t('debug_incorrect')} → {t('debug_reset')} · rep: {afterIncorrect.repetitions} · interval: {afterIncorrect.interval}d
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

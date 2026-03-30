'use client'

import { useTranslations } from 'next-intl'
import { Trophy, BookOpen } from 'lucide-react'

interface SessionResultsProps {
  batchCorrect: number
  batchTotal: number
  newLearned: number
  isAdditional: boolean
  hasMore: boolean
  isPending: boolean
  onContinue: () => void
  onFinish: () => void
}

export function SessionResults({
  batchCorrect,
  batchTotal,
  newLearned,
  isAdditional,
  hasMore,
  isPending,
  onContinue,
  onFinish,
}: SessionResultsProps) {
  const t = useTranslations('study')
  const percent = batchTotal > 0 ? Math.round((batchCorrect / batchTotal) * 100) : 0

  return (
    <div role="status" className="text-center py-12 space-y-6">
      {percent >= 70 ? (
        <Trophy aria-hidden="true" className="w-16 h-16 mx-auto text-yellow-500" />
      ) : (
        <BookOpen aria-hidden="true" className="w-16 h-16 mx-auto text-primary" />
      )}

      <h2 className="text-2xl font-bold">{t('results_title')}</h2>

      <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold">
            {t('results_correct_of', { correct: batchCorrect, total: batchTotal })}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {t('results_correct')} ({percent}%)
          </div>
        </div>

        {!isAdditional && (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-2xl font-bold">{newLearned}</div>
            <div className="text-sm text-muted-foreground mt-1">{t('results_new_learned')}</div>
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-center flex-wrap">
        {hasMore && !isAdditional && (
          <button
            type="button"
            onClick={onContinue}
            disabled={isPending}
            className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {isPending ? '…' : `${t('results_continue')} →`}
          </button>
        )}
        <button
          type="button"
          onClick={onFinish}
          disabled={isPending}
          className="border-2 border-border px-8 py-3 rounded-xl font-medium hover:bg-accent transition-colors disabled:opacity-60"
        >
          {t('back_to_dashboard')}
        </button>
      </div>
    </div>
  )
}

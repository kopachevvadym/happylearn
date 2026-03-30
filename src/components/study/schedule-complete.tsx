'use client'

import { useTranslations } from 'next-intl'
import { CheckCircle2 } from 'lucide-react'

interface ScheduleCompleteProps {
  scheduledTotal: number
  doneSoFar: number
  isPending: boolean
  onContinueTraining: () => void
  onFinish: () => void
}

export function ScheduleComplete({
  scheduledTotal,
  doneSoFar,
  isPending,
  onContinueTraining,
  onFinish,
}: ScheduleCompleteProps) {
  const t = useTranslations('study')

  return (
    <div role="status" className="text-center py-12 space-y-6">
      <CheckCircle2 aria-hidden="true" className="w-16 h-16 mx-auto text-green-500" />

      <h2 className="text-2xl font-bold">{t('schedule_complete_title')}</h2>

      <div className="flex gap-4 justify-center">
        <div className="bg-card border border-border rounded-xl p-4 min-w-[100px]">
          <div className="text-2xl font-bold">{scheduledTotal}</div>
          <div className="text-sm text-muted-foreground mt-1">{t('scheduled_count')}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 min-w-[100px]">
          <div className="text-2xl font-bold">{doneSoFar}</div>
          <div className="text-sm text-muted-foreground mt-1">{t('passed_count')}</div>
        </div>
      </div>

      <div className="flex gap-3 justify-center flex-wrap">
        <button
          type="button"
          onClick={onContinueTraining}
          disabled={isPending}
          className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {isPending ? '…' : t('continue_training')}
        </button>
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

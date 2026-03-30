'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { mergeDuplicates } from '@/app/actions/words'

interface MergeDuplicatesButtonProps {
  count: number
  onSuccess: (message: string) => void
}

export function MergeDuplicatesButton({ count, onSuccess }: MergeDuplicatesButtonProps) {
  const t = useTranslations('words')
  const tCommon = useTranslations('common')
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleMerge = () => {
    startTransition(async () => {
      const result = await mergeDuplicates()
      if ('mergedCount' in result) {
        onSuccess(t('mergeSuccess', { merged: result.mergedCount, groups: result.groupsCount }))
      }
      setShowConfirm(false)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="h-8 px-3 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-sm hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors shrink-0"
      >
        {t('mergeDuplicates')}
      </button>

      {showConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowConfirm(false)}
            aria-hidden="true"
          />
          <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-3">
            <h2 className="font-semibold text-base">
              {t('mergeConfirmTitle', { count })}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('mergeConfirmDescription')}
            </p>
            <div className="flex gap-3 justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                className="h-9 px-4 rounded-lg border border-border text-sm hover:bg-accent transition-colors disabled:opacity-60"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                onClick={handleMerge}
                disabled={isPending}
                className="h-9 px-4 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-60"
              >
                {isPending ? '…' : t('merge')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

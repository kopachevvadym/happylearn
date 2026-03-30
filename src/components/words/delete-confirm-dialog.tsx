'use client'

import { useTranslations } from 'next-intl'

interface DeleteConfirmDialogProps {
  count: number
  isPending: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmDialog({ count, isPending, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  const t = useTranslations('words')
  const tCommon = useTranslations('common')

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
        <p className="text-sm leading-relaxed">
          {t('bulk_delete_confirm', { count })}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="h-9 px-4 rounded-lg border border-border text-sm hover:bg-accent transition-colors disabled:opacity-60"
          >
            {tCommon('cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="h-9 px-4 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-60"
          >
            {isPending ? '…' : tCommon('delete')}
          </button>
        </div>
      </div>
    </div>
  )
}

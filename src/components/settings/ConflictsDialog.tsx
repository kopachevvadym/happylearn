'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

interface Props {
  toImportCount: number
  conflictsCount: number
  onImportNew: () => void
  onImportAll: () => void
  onCancel: () => void
  isPending: boolean
}

export function ConflictsDialog({
  toImportCount,
  conflictsCount,
  onImportNew,
  onImportAll,
  onCancel,
  isPending,
}: Props) {
  const t = useTranslations('Settings.importExport')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-lg space-y-4">
        <p className="font-semibold">{t('conflictsTitle')}</p>
        <p className="text-sm text-muted-foreground">
          {t('conflictsDesc', { toImport: toImportCount, conflicts: conflictsCount })}
        </p>
        <div className="flex flex-col gap-2 pt-1">
          <Button onClick={onImportNew} disabled={isPending || toImportCount === 0}>
            {t('importNew')}
          </Button>
          <Button variant="outline" onClick={onImportAll} disabled={isPending}>
            {t('importAll')}
          </Button>
          <Button variant="ghost" onClick={onCancel} disabled={isPending}>
            {t('cancel')}
          </Button>
        </div>
      </div>
    </div>
  )
}

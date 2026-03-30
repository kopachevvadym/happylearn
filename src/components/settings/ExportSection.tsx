'use client'

import { useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { exportData, exportBackup } from '@/app/actions/settings'

function triggerDownload(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface Props {
  onError: (msg: string) => void
}

export function ExportSection({ onError }: Props) {
  const t = useTranslations('Settings.importExport')
  const [isPending, startTransition] = useTransition()

  const handleExportJson = () => {
    startTransition(async () => {
      const result = await exportData()
      if (!result || 'error' in result) return onError(result?.error ?? 'Export failed')
      triggerDownload(
        JSON.stringify(result.data, null, 2),
        `happylearn-words-${Date.now()}.json`,
        'application/json'
      )
    })
  }

  const handleExportCsv = () => {
    startTransition(async () => {
      const result = await exportData()
      if (!result || 'error' in result) return onError(result?.error ?? 'Export failed')
      const header = 'word,translations,examples,source_lang,target_lang'
      const rows = (result.data ?? []).map((w) =>
        [
          `"${w.word}"`,
          `"${(w.translations as string[]).join(',')}"`,
          `"${(w.examples as string[]).join(' | ')}"`,
          w.source_lang,
          w.target_lang,
        ].join(',')
      )
      triggerDownload(
        [header, ...rows].join('\n'),
        `happylearn-words-${Date.now()}.csv`,
        'text/csv'
      )
    })
  }

  const handleExportBackup = () => {
    startTransition(async () => {
      const result = await exportBackup()
      if (!result || 'error' in result) return onError(result?.error ?? 'Export failed')
      triggerDownload(
        JSON.stringify(result.data, null, 2),
        `happylearn-backup-${Date.now()}.json`,
        'application/json'
      )
    })
  }

  return (
    <div className="space-y-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t('export')}
      </p>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">{t('exportWords')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('exportWordsDesc')}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleExportJson} disabled={isPending}>
              <Download />
              {t('json')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={isPending}>
              <Download />
              {t('csv')}
            </Button>
          </div>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">{t('exportBackup')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('exportBackupDesc')}</p>
          </div>
          <div className="shrink-0">
            <Button variant="outline" size="sm" onClick={handleExportBackup} disabled={isPending}>
              <Download />
              {t('json')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

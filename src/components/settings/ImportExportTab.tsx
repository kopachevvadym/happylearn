'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ExportSection } from './ExportSection'
import { ImportSection } from './ImportSection'
import { FormatPreview } from './FormatPreview'

export function ImportExportTab() {
  const t = useTranslations('Settings.importExport')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSuccess = (count: number) => {
    setError(null)
    setSuccess(t('importSuccess', { count }))
    setTimeout(() => setSuccess(null), 4000)
  }

  const handleError = (msg: string) => {
    setSuccess(null)
    setError(msg)
    setTimeout(() => setError(null), 5000)
  }

  return (
    <div className="space-y-8 max-w-lg">
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="text-sm text-green-700 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg px-3 py-2">
          {success}
        </div>
      )}

      <ExportSection onError={handleError} />

      <div className="border-t border-border" />

      <ImportSection onSuccess={handleSuccess} onError={handleError} />

      <div className="border-t border-border" />

      <FormatPreview />
    </div>
  )
}

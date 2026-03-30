'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Download, Upload } from 'lucide-react'
import { exportData, importWords } from '@/app/actions/settings'

export function ImportExportTab() {
  const t = useTranslations('Settings')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const notify = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleExportJson = () => {
    startTransition(async () => {
      const result = await exportData()
      if (result?.data) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'happylearn-export.json'
        a.click()
        URL.revokeObjectURL(url)
      }
    })
  }

  const handleExportCsv = () => {
    startTransition(async () => {
      const result = await exportData()
      if (result?.data) {
        const header = 'word,translations,examples'
        const rows = result.data.map((w) =>
          [
            `"${w.word}"`,
            `"${(w.translations as string[]).join(';')}"`,
            `"${(w.examples as string[]).join(';')}"`,
          ].join(',')
        )
        const csv = [header, ...rows].join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'happylearn-export.csv'
        a.click()
        URL.revokeObjectURL(url)
      }
    })
  }

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (!Array.isArray(data)) return setError('Invalid JSON format')
        startTransition(async () => {
          const result = await importWords(data, true)
          if (result?.error) setError(result.error)
          else notify(`${t('importExport.imported')}: ${result.inserted}`)
        })
      } catch {
        setError('Invalid JSON file')
      }
    }
    reader.readAsText(file)
  }

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const lines = (ev.target?.result as string).split('\n').slice(1)
        const data = lines
          .filter(Boolean)
          .map((line) => {
            const parts = line.split(',').map((p) => p.replace(/^"|"$/g, ''))
            return {
              word: parts[0] ?? '',
              translations: (parts[1] ?? '').split(';').filter(Boolean),
              examples: (parts[2] ?? '').split(';').filter(Boolean),
              source_lang: 'en',
              target_lang: 'uk',
            }
          })
          .filter((w) => w.word)

        startTransition(async () => {
          const result = await importWords(data, true)
          if (result?.error) setError(result.error)
          else notify(`${t('importExport.imported')}: ${result.inserted}`)
        })
      } catch {
        setError('Invalid CSV file')
      }
    }
    reader.readAsText(file)
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

      <div className="space-y-3">
        <p className="text-sm font-medium">{t('importExport.export')}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleExportJson}
            disabled={isPending}
            className={outlineBtn}
          >
            <Download className="w-4 h-4" />
            {t('importExport.exportJson')}
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isPending}
            className={outlineBtn}
          >
            <Download className="w-4 h-4" />
            {t('importExport.exportCsv')}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">{t('importExport.import')}</p>
        <div className="flex gap-3">
          <label className={outlineBtn + ' cursor-pointer'}>
            <Upload className="w-4 h-4" />
            {t('importExport.importJson')}
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>
          <label className={outlineBtn + ' cursor-pointer'}>
            <Upload className="w-4 h-4" />
            {t('importExport.importCsv')}
            <input type="file" accept=".csv" onChange={handleImportCsv} className="hidden" />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">{t('importExport.formatHint')}</p>
      </div>
    </div>
  )
}

const outlineBtn = 'inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm hover:bg-accent transition-colors disabled:opacity-60'

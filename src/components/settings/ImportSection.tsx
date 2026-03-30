'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Upload } from 'lucide-react'
import { analyzeImport, importWords, importBackup } from '@/app/actions/settings'
import { ConflictsDialog } from './ConflictsDialog'

type WordItem = {
  word: string
  translations: string[]
  examples: string[]
  source_lang: string
  target_lang: string
  progress?: {
    ease_factor: number
    interval: number
    repetitions: number
    next_review_at: string
    is_learned: boolean
  } | null
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function parseCSV(text: string): WordItem[] {
  const lines = text.split(/\r?\n/).filter(Boolean)
  return lines.slice(1).flatMap((line) => {
    const parts = parseCSVLine(line)
    const word = parts[0]?.trim()
    if (!word) return []
    const rawTranslations = parts[1] ?? ''
    const rawExamples = parts[2] ?? ''
    return [{
      word,
      translations: rawTranslations.split(',').map((s) => s.trim()).filter(Boolean),
      examples: rawExamples.split(' | ').map((s) => s.trim()).filter(Boolean),
      source_lang: parts[3]?.trim() || 'en',
      target_lang: parts[4]?.trim() || 'uk',
    }]
  })
}

function parseJSON(text: string): WordItem[] | null {
  try {
    const data = JSON.parse(text)
    if (!Array.isArray(data)) return null
    return data as WordItem[]
  } catch {
    return null
  }
}

interface ConflictState {
  data: WordItem[]
  toImportCount: number
  conflictsCount: number
  isBackup: boolean
}

interface Props {
  onSuccess: (count: number) => void
  onError: (msg: string) => void
}

export function ImportSection({ onSuccess, onError }: Props) {
  const t = useTranslations('Settings.importExport')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [conflict, setConflict] = useState<ConflictState | null>(null)

  const processFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const isCsv = file.name.endsWith('.csv')
      const data = isCsv ? parseCSV(text) : parseJSON(text)

      if (!data || data.length === 0) {
        return onError('Invalid file format')
      }

      const isBackup = !isCsv && data.some((w) => 'progress' in w)

      startTransition(async () => {
        const result = await analyzeImport(
          data.map(({ word, source_lang, target_lang }) => ({ word, source_lang, target_lang }))
        )

        if (!result || 'error' in result) {
          return onError((result as { error?: string } | undefined)?.error ?? 'Analysis failed')
        }

        const { conflictKeys } = result
        if (conflictKeys.length === 0) {
          const importResult = isBackup
            ? await importBackup(data, true)
            : await importWords(data, true)
          if (!importResult || 'error' in importResult) {
            return onError((importResult as { error?: string } | undefined)?.error ?? 'Import failed')
          }
          onSuccess(importResult.inserted ?? 0)
        } else {
          setConflict({
            data,
            toImportCount: data.length - conflictKeys.length,
            conflictsCount: conflictKeys.length,
            isBackup,
          })
        }
      })
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const handleImportNew = () => {
    if (!conflict) return
    startTransition(async () => {
      const importResult = conflict.isBackup
        ? await importBackup(conflict.data, true)
        : await importWords(conflict.data, true)
      setConflict(null)
      if (!importResult || 'error' in importResult) {
        return onError((importResult as { error?: string } | undefined)?.error ?? 'Import failed')
      }
      onSuccess(importResult.inserted ?? 0)
    })
  }

  const handleImportAll = () => {
    if (!conflict) return
    startTransition(async () => {
      const importResult = conflict.isBackup
        ? await importBackup(conflict.data, false)
        : await importWords(conflict.data, false)
      setConflict(null)
      if (!importResult || 'error' in importResult) {
        return onError((importResult as { error?: string } | undefined)?.error ?? 'Import failed')
      }
      onSuccess((importResult.inserted ?? 0) + (importResult.updated ?? 0))
    })
  }

  return (
    <>
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('import')}
        </p>

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !isPending && fileInputRef.current?.click()}
          className={[
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
            isPending ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary hover:bg-muted/50',
          ].join(' ')}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-foreground/80">{t('dragAndDrop')}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('dragAndDropHint')}</p>
          <input
            type="file"
            accept=".json,.csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </div>
      </div>

      {conflict && (
        <ConflictsDialog
          toImportCount={conflict.toImportCount}
          conflictsCount={conflict.conflictsCount}
          onImportNew={handleImportNew}
          onImportAll={handleImportAll}
          onCancel={() => setConflict(null)}
          isPending={isPending}
        />
      )}
    </>
  )
}

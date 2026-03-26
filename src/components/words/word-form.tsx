'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { X, Plus } from 'lucide-react'
import type { Word } from '@/types'
import { SUPPORTED_LANGUAGES } from '@/types'
import { addWordsBulk } from '@/app/actions/words'

interface WordFormProps {
  word?: Word
  defaultSourceLang: string
  defaultTargetLang: string
  onSubmit: (formData: FormData) => Promise<{ error?: string; success?: boolean } | undefined>
  onCancel: () => void
}

export function WordForm({ word, defaultSourceLang, defaultTargetLang, onSubmit, onCancel }: WordFormProps) {
  const t = useTranslations('words')
  const [mode, setMode] = useState<'single' | 'bulk'>('single')
  const [translations, setTranslations] = useState<string[]>(
    (word?.translations as string[]) ?? ['']
  )
  const [examples, setExamples] = useState<string[]>(
    (word?.examples as string[]) ?? ['']
  )
  const [sourceLang, setSourceLang] = useState(word?.source_lang ?? defaultSourceLang)
  const [targetLang, setTargetLang] = useState(word?.target_lang ?? defaultTargetLang)
  const [bulkText, setBulkText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [bulkResult, setBulkResult] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSingleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    translations.forEach((tr) => formData.append('translations', tr))
    examples.filter(Boolean).forEach((ex) => formData.append('examples', ex))
    startTransition(async () => {
      const result = await onSubmit(formData)
      if (result?.error) setError(result.error)
    })
  }

  const parseBulkLines = () =>
    bulkText
      .split('\n')
      .map((line) => {
        const idx = line.indexOf(' - ')
        if (idx === -1) return null
        return { word: line.slice(0, idx).trim(), translation: line.slice(idx + 3).trim() }
      })
      .filter((e): e is { word: string; translation: string } => !!e?.word && !!e?.translation)

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBulkResult(null)
    const entries = parseBulkLines()
    if (!entries.length) {
      setError('Немає валідних рядків. Формат: слово - переклад')
      return
    }
    startTransition(async () => {
      const result = await addWordsBulk(entries, sourceLang, targetLang)
      if (result?.error) {
        setError(result.error)
      } else {
        setBulkResult(`Додано ${result.count} слів`)
        setBulkText('')
      }
    })
  }

  const previewLines = parseBulkLines()

  const langSelectors = (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <label className="text-sm font-medium">Мова слова</label>
        <select
          value={sourceLang}
          onChange={(e) => setSourceLang(e.target.value)}
          name="source_lang"
          className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Мова перекладу</label>
        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          name="target_lang"
          className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>
      </div>
    </div>
  )

  return (
    <div className="border border-border rounded-xl p-4 bg-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{word ? t('edit_word') : t('add_word')}</h3>
        {/* Mode toggle — only for add (not edit) */}
        {!word && (
          <div className="flex rounded-lg border border-input overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => { setMode('single'); setError(null); setBulkResult(null) }}
              className={`px-3 py-1 transition-colors ${mode === 'single' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
            >
              Одне
            </button>
            <button
              type="button"
              onClick={() => { setMode('bulk'); setError(null); setBulkResult(null) }}
              className={`px-3 py-1 transition-colors ${mode === 'bulk' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
            >
              Пачка
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {bulkResult && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 dark:bg-green-950/30 dark:border-green-900 dark:text-green-300">
          {bulkResult}
        </div>
      )}

      {mode === 'single' ? (
        <form onSubmit={handleSingleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">{t('word_field')}</label>
            <input
              name="word"
              defaultValue={word?.word}
              required
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="apple"
            />
          </div>

          {langSelectors}

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('translations_field')}</label>
            {translations.map((tr, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={tr}
                  onChange={(e) => {
                    const updated = [...translations]
                    updated[i] = e.target.value
                    setTranslations(updated)
                  }}
                  className="flex-1 h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={t('translation_placeholder')}
                />
                {translations.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setTranslations(translations.filter((_, j) => j !== i))}
                    className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setTranslations([...translations, ''])}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              {t('add_translation')}
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('examples_field')}</label>
            {examples.map((ex, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={ex}
                  onChange={(e) => {
                    const updated = [...examples]
                    updated[i] = e.target.value
                    setExamples(updated)
                  }}
                  className="flex-1 h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={t('example_placeholder')}
                />
                {examples.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setExamples(examples.filter((_, j) => j !== i))}
                    className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setExamples([...examples, ''])}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              {t('add_example')}
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 h-10 border border-input rounded-lg text-sm hover:bg-accent transition-colors"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={isPending || translations.every((t) => !t.trim())}
              className="flex-1 h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {isPending ? '...' : word ? 'Зберегти' : 'Додати'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleBulkSubmit} className="space-y-4">
          {langSelectors}

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Список слів <span className="text-muted-foreground font-normal">(один рядок = одне слово)</span>
            </label>
            <textarea
              value={bulkText}
              onChange={(e) => { setBulkText(e.target.value); setBulkResult(null) }}
              rows={8}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y font-mono"
              placeholder={`apple - яблуко\ncar - машина\nhouse - будинок`}
            />
            {bulkText && (
              <p className="text-xs text-muted-foreground">
                Розпізнано: {previewLines.length} слів
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 h-10 border border-input rounded-lg text-sm hover:bg-accent transition-colors"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={isPending || !previewLines.length}
              className="flex-1 h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {isPending ? '...' : `Додати${previewLines.length ? ` (${previewLines.length})` : ''}`}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

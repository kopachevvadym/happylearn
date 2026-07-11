'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Search, X, Pencil, Trash2, BookmarkPlus, AlertTriangle } from 'lucide-react'
import { addWord, updateWord, deleteWord, addWordToCollections } from '@/app/actions/words'
import type { Word } from '@/types'
import { SUPPORTED_LANGUAGES } from '@/types'
import { WordForm } from './word-form'
import { AddToCollectionModal } from './add-to-collection-modal'
import { WordsActionBar } from './words-action-bar'
import { MergeDuplicatesButton } from './merge-duplicates-button'

interface WordsListProps {
  words: Word[]
  learnedWordIds: Set<string>
  collections: { id: string; name: string }[]
  defaultSourceLang: string
  defaultTargetLang: string
  duplicatesCount: number
  initialShowAddForm?: boolean
}

export function WordsList({
  words,
  learnedWordIds,
  collections,
  defaultSourceLang,
  defaultTargetLang,
  duplicatesCount: initialDuplicatesCount,
  initialShowAddForm = false,
}: WordsListProps) {
  const t = useTranslations('words')
  const tCommon = useTranslations('common')
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(initialShowAddForm)
  const [editingWord, setEditingWord] = useState<Word | null>(null)
  const [collectionModalWordId, setCollectionModalWordId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [toast, setToast] = useState<{ message: string; kind: 'success' | 'error' } | null>(null)
  const [duplicatesCount, setDuplicatesCount] = useState(initialDuplicatesCount)

  // Adopt the server-computed count when the page refetches (words added,
  // import finished) while keeping the optimistic reset after a merge.
  useEffect(() => {
    setDuplicatesCount(initialDuplicatesCount)
  }, [initialDuplicatesCount])

  const filtered = words.filter((w) =>
    w.word.toLowerCase().includes(search.toLowerCase()) ||
    (w.translations as string[]).some((tr) => tr.toLowerCase().includes(search.toLowerCase()))
  )

  const allSelected = filtered.length > 0 && filtered.every((w) => selectedIds.includes(w.id))
  const someSelected = !allSelected && filtered.some((w) => selectedIds.includes(w.id))
  const selectAllRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected
    }
  }, [someSelected])

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : filtered.map((w) => w.id))
  }

  const toggleWord = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const showToast = (message: string, kind: 'success' | 'error' = 'success') => {
    setToast({ message, kind })
    setTimeout(() => setToast(null), kind === 'error' ? 5000 : 3000)
  }

  const handleDelete = (wordId: string, word: string) => {
    if (!confirm(t('delete_confirm', { word }))) return
    // Drop the id from the selection too — a phantom selected id would make
    // subsequent bulk actions fail on a nonexistent word.
    setSelectedIds((prev) => prev.filter((x) => x !== wordId))
    startTransition(async () => {
      const result = await deleteWord(wordId)
      if (result?.error) showToast(result.error, 'error')
    })
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`text-sm rounded-lg px-3 py-2 border ${
            toast.kind === 'error'
              ? 'text-destructive bg-destructive/10 border-destructive/30'
              : 'text-green-700 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Duplicates banner */}
      {duplicatesCount > 0 && (
        <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle aria-hidden="true" className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-sm text-amber-800 dark:text-amber-200">
              {t('duplicatesFound', { count: duplicatesCount })}
            </span>
          </div>
          <MergeDuplicatesButton
            count={duplicatesCount}
            onSuccess={(message) => {
              setDuplicatesCount(0)
              showToast(message)
            }}
            onError={(message) => showToast(message, 'error')}
          />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_placeholder')}
            aria-label={tCommon('search')}
            className="w-full h-10 pl-9 pr-8 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button
              type="button"
              aria-label={tCommon('clear')}
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground h-10 px-4 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus aria-hidden="true" className="w-4 h-4" />
          {t('add_word')}
        </button>
      </div>

      {/* Add word form */}
      {showAddForm && (
        <WordForm
          initialWord={search}
          defaultSourceLang={defaultSourceLang}
          defaultTargetLang={defaultTargetLang}
          onSubmit={async (formData) => {
            const result = await addWord(formData)
            if (!result?.error) setShowAddForm(false)
            return result
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Edit word form — keyed by word id so switching the edit target
          remounts the form instead of saving stale fields onto another word */}
      {editingWord && (
        <WordForm
          key={editingWord.id}
          word={editingWord}
          defaultSourceLang={editingWord.source_lang}
          defaultTargetLang={editingWord.target_lang}
          onSubmit={async (formData) => {
            const result = await updateWord(editingWord.id, formData)
            if (!result?.error) setEditingWord(null)
            return result
          }}
          onCancel={() => setEditingWord(null)}
        />
      )}

      {/* Words list */}
      {filtered.length === 0 ? (
        <div role="status" className="text-center py-16 text-muted-foreground">
          {search ? t('no_results') : t('empty_state')}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((word) => {
            const learned = learnedWordIds.has(word.id)
            const isSelected = selectedIds.includes(word.id)

            return (
              <div
                key={word.id}
                className={`group flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : learned
                    ? 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20'
                    : 'border-border bg-card'
                }`}
              >
                {/* Selection checkbox */}
                <label className="mt-0.5 flex-shrink-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleWord(word.id)}
                    aria-label={word.word}
                    className="w-4 h-4 rounded accent-primary cursor-pointer"
                  />
                </label>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{word.word}</span>
                    {learned && (
                      <span className="text-xs bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 px-2 py-0.5 rounded-full">
                        {t('learned_badge')}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {SUPPORTED_LANGUAGES[word.source_lang as keyof typeof SUPPORTED_LANGUAGES] ?? word.source_lang} →{' '}
                      {SUPPORTED_LANGUAGES[word.target_lang as keyof typeof SUPPORTED_LANGUAGES] ?? word.target_lang}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    {(word.translations as string[]).join(', ')}
                  </div>
                  {(word.examples as string[]).length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1 italic">
                      {(word.examples as string[])[0]}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity duration-150">
                  <button
                    type="button"
                    onClick={() => setCollectionModalWordId(word.id)}
                    aria-label={t('add_to_collection')}
                    className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <BookmarkPlus aria-hidden="true" className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingWord(word)}
                    aria-label={t('edit_word')}
                    className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Pencil aria-hidden="true" className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(word.id, word.word)}
                    aria-label={tCommon('delete')}
                    disabled={isPending}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive disabled:opacity-60"
                  >
                    <Trash2 aria-hidden="true" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Single-word add to collection modal */}
      {collectionModalWordId && (
        <AddToCollectionModal
          wordId={collectionModalWordId}
          collections={collections}
          onSubmit={async (collectionIds) => {
            await addWordToCollections(collectionModalWordId, collectionIds)
            setCollectionModalWordId(null)
          }}
          onClose={() => setCollectionModalWordId(null)}
        />
      )}

      {/* Bulk action bar */}
      <WordsActionBar
        selectedIds={selectedIds}
        allSelected={allSelected}
        someSelected={someSelected}
        onToggleAll={toggleAll}
        collections={collections}
        defaultSourceLang={defaultSourceLang}
        defaultTargetLang={defaultTargetLang}
        onClearSelection={() => setSelectedIds([])}
        onActionSuccess={(message) => {
          setSelectedIds([])
          showToast(message)
        }}
        onActionError={(message) => showToast(message, 'error')}
      />
    </div>
  )
}

'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { X, Languages, BookmarkPlus, CheckCircle2, Trash2, ChevronDown } from 'lucide-react'
import {
  updateWordsLanguage,
  markWordsAsLearned,
  deleteWords,
  addExistingWordsToCollection,
} from '@/app/actions/words'
import { SUPPORTED_LANGUAGES } from '@/types'
import { DeleteConfirmDialog } from './delete-confirm-dialog'

type OpenPanel = 'lang' | 'collection' | 'delete' | null

interface WordsActionBarProps {
  selectedIds: string[]
  allSelected: boolean
  someSelected: boolean
  onToggleAll: () => void
  collections: { id: string; name: string }[]
  defaultSourceLang: string
  defaultTargetLang: string
  onClearSelection: () => void
  onActionSuccess: (message: string) => void
  onActionError: (message: string) => void
}

export function WordsActionBar({
  selectedIds,
  allSelected,
  someSelected,
  onToggleAll,
  collections,
  defaultSourceLang,
  defaultTargetLang,
  onClearSelection,
  onActionSuccess,
  onActionError,
}: WordsActionBarProps) {
  const t = useTranslations('words')
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null)
  const [sourceLang, setSourceLang] = useState(defaultSourceLang)
  const [targetLang, setTargetLang] = useState(defaultTargetLang)
  const [isPending, startTransition] = useTransition()
  const checkboxRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = someSelected
    }
  }, [someSelected])

  const isVisible = selectedIds.length > 0

  const closeAndClear = () => {
    setOpenPanel(null)
    onClearSelection()
  }

  // Server errors must surface — a success toast over a failed action makes
  // the UI lie and the selection disappear as if the work was done.
  const handleMarkLearned = () => {
    startTransition(async () => {
      const result = await markWordsAsLearned(selectedIds)
      if (result?.error) {
        onActionError(result.error)
        return
      }
      onActionSuccess(t('markedAsLearned', { count: selectedIds.length }))
      closeAndClear()
    })
  }

  const handleApplyLanguage = () => {
    startTransition(async () => {
      const result = await updateWordsLanguage(selectedIds, sourceLang, targetLang)
      if (result?.error) {
        onActionError(result.error)
        return
      }
      onActionSuccess(t('changeLanguage'))
      closeAndClear()
    })
  }

  const handleAddToCollection = (collectionId: string) => {
    startTransition(async () => {
      const result = await addExistingWordsToCollection(selectedIds, collectionId)
      if (result?.error) {
        onActionError(result.error)
        return
      }
      onActionSuccess(t('addToCollection'))
      closeAndClear()
    })
  }

  const handleDeleteConfirm = () => {
    startTransition(async () => {
      const result = await deleteWords(selectedIds)
      if (result?.error) {
        onActionError(result.error)
        return
      }
      onActionSuccess(t('deleted', { count: selectedIds.length }))
      closeAndClear()
    })
  }

  const langOptions = Object.entries(SUPPORTED_LANGUAGES) as [string, string][]

  return (
    <>
      {/* Delete confirm dialog */}
      {openPanel === 'delete' && (
        <DeleteConfirmDialog
          count={selectedIds.length}
          isPending={isPending}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setOpenPanel(null)}
        />
      )}

      {/* Backdrop for open panels */}
      {(openPanel === 'lang' || openPanel === 'collection') && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpenPanel(null)}
          aria-hidden="true"
        />
      )}

      {/* Sticky bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        aria-hidden={!isVisible}
      >
        <div className="max-w-4xl mx-auto px-4 pb-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl p-3 flex items-center gap-3">
            {/* Select all checkbox */}
            <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
              <input
                ref={checkboxRef}
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                aria-label={t('selectAll')}
                className="w-4 h-4 rounded accent-primary cursor-pointer"
              />
              <span className="text-sm font-medium">
                {t('selected', { count: selectedIds.length })}
              </span>
            </label>

            <div className="ml-auto flex items-center gap-1.5 flex-wrap">
              {/* Change language */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenPanel(openPanel === 'lang' ? null : 'lang')}
                  disabled={isPending}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-sm hover:bg-accent transition-colors disabled:opacity-60"
                >
                  <Languages aria-hidden="true" className="w-3.5 h-3.5" />
                  {t('changeLanguage')}
                  <ChevronDown aria-hidden="true" className="w-3 h-3" />
                </button>

                {openPanel === 'lang' && (
                  <div className="absolute bottom-full mb-2 right-0 bg-card border border-border rounded-xl p-4 shadow-xl min-w-[260px] z-50 space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        {t('sourceLanguage')}
                      </label>
                      <select
                        value={sourceLang}
                        onChange={(e) => setSourceLang(e.target.value)}
                        className="w-full h-9 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {langOptions.map(([code, name]) => (
                          <option key={code} value={code}>{name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        {t('targetLanguage')}
                      </label>
                      <select
                        value={targetLang}
                        onChange={(e) => setTargetLang(e.target.value)}
                        className="w-full h-9 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {langOptions.map(([code, name]) => (
                          <option key={code} value={code}>{name}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyLanguage}
                      disabled={isPending}
                      className="w-full h-9 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                    >
                      {isPending ? '…' : t('apply')}
                    </button>
                  </div>
                )}
              </div>

              {/* Add to collection */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenPanel(openPanel === 'collection' ? null : 'collection')}
                  disabled={isPending}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-sm hover:bg-accent transition-colors disabled:opacity-60"
                >
                  <BookmarkPlus aria-hidden="true" className="w-3.5 h-3.5" />
                  {t('addToCollection')}
                  <ChevronDown aria-hidden="true" className="w-3 h-3" />
                </button>

                {openPanel === 'collection' && (
                  <div className="absolute bottom-full mb-2 right-0 bg-card border border-border rounded-xl overflow-hidden shadow-xl min-w-[180px] z-50">
                    {collections.map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => handleAddToCollection(col.id)}
                        disabled={isPending}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors disabled:opacity-60"
                      >
                        {col.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mark as learned */}
              <button
                type="button"
                onClick={handleMarkLearned}
                disabled={isPending}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-sm hover:bg-accent transition-colors disabled:opacity-60"
              >
                <CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5 text-green-500" />
                {t('markAsLearned')}
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={() => setOpenPanel('delete')}
                disabled={isPending}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-destructive/30 text-destructive text-sm hover:bg-destructive/10 transition-colors disabled:opacity-60"
              >
                <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
              </button>

              {/* Clear selection */}
              <button
                type="button"
                onClick={onClearSelection}
                aria-label={t('clearSelection')}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              >
                <X aria-hidden="true" className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
